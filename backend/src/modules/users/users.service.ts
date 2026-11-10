import {
  ERROR_CODES,
  ERROR_MESSAGES,
  type AuthUser,
  type CreateUserInput,
  type ListUsersQuery,
  type Role,
  type UpdateUserInput,
  type UserStatus,
} from "@greenflow/shared";
import { Timestamp } from "firebase-admin/firestore";
import type { Transaction } from "firebase-admin/firestore";

import { auth, db } from "../../config/firebase.js";
import { writeAudit } from "../../lib/audit.js";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { sendPasswordResetEmail } from "../auth/firebase-rest.js";
import {
  deleteCachedUser,
  getUserFromCache,
  setCachedUser,
} from "./user-cache.js";
import type { UserDocument } from "./user-document.js";
import { toAuthUser } from "./user-document.js";
import { usersRepository } from "./users.repository.js";

const usersCollection = () => db.collection("users");

function mapAuthError(error: unknown): never {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  if (code === "auth/email-already-exists") {
    throw AppError.conflict("Email sudah terdaftar.");
  }
  if (code === "auth/invalid-password" || code === "auth/weak-password") {
    throw AppError.badRequest(undefined, "Kata sandi tidak memenuhi syarat.");
  }
  if (code === "auth/user-not-found") {
    throw AppError.notFound("Akun tidak ditemukan.");
  }
  if (code === "auth/invalid-email") {
    throw AppError.badRequest(undefined, "Format email tidak valid.");
  }

  throw error;
}

async function assertNotLastAdmin(
  tx: Transaction,
  target: UserDocument,
): Promise<void> {
  if (target.peran !== "admin" || target.status !== "aktif") return;

  const activeAdmins = await tx.get(
    usersCollection()
      .where("peran", "==", "admin")
      .where("status", "==", "aktif"),
  );

  if (activeAdmins.size <= 1) {
    throw AppError.conflict(
      "Minimal satu admin aktif harus tetap ada. Tambahkan admin lain terlebih dahulu.",
    );
  }
}

function sortByName(users: UserDocument[]): UserDocument[] {
  return users.sort((a, b) =>
    a.nama.localeCompare(b.nama, "id", { sensitivity: "base" }),
  );
}

export async function listUsers(query: ListUsersQuery): Promise<AuthUser[]> {
  const users = await usersRepository.getAll();
  const search = query.search?.toLocaleLowerCase("id");

  return sortByName(users)
    .filter((user) => {
      if (query.peran && user.peran !== query.peran) return false;
      if (query.status && user.status !== query.status) return false;
      if (!search) return true;
      return (
        user.nama.toLocaleLowerCase("id").includes(search) ||
        user.email.toLocaleLowerCase("id").includes(search)
      );
    })
    .map(toAuthUser);
}

export async function getUser(uid: string): Promise<AuthUser> {
  const user = await usersRepository.getById(uid);
  if (!user) throw AppError.notFound("Akun tidak ditemukan.");
  return toAuthUser(user);
}

export async function createUser(
  input: CreateUserInput,
  actor: AuthUser,
): Promise<AuthUser> {
  const now = Timestamp.now();
  let uid: string;

  try {
    const created = await auth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.nama,
      disabled: false,
    });
    uid = created.uid;
    logger.info({ uid, email: input.email }, "Firebase Auth user created successfully");
  } catch (error) {
    logger.error({ err: error, email: input.email }, "Failed to create Firebase Auth user");
    return mapAuthError(error);
  }

  const user: UserDocument = {
    uid,
    nama: input.nama,
    email: input.email,
    peran: input.peran,
    status: "aktif",
    dibuatPada: now,
    diperbaruiPada: now,
    terakhirMasukPada: null,
    dinonaktifkanPada: null,
    dinonaktifkanOleh: null,
    versiSkema: 1,
  };

  try {
    logger.info({ uid, email: input.email }, "Setting custom user claims");
    await auth.setCustomUserClaims(uid, { role: input.peran });
    logger.info({ uid, email: input.email }, "Saving user document to Firestore");
    await usersRepository.create(user);
    setCachedUser(user);
    logger.info({ uid, email: input.email }, "User created successfully in Firestore");
  } catch (error) {
    logger.error({ err: error, uid, email: input.email }, "Failed to create user in Firestore, rolling back Auth user");
    await auth.deleteUser(uid).catch(() => undefined);
    throw error;
  }

  await writeAudit({
    actorId: actor.id,
    actorNama: actor.nama,
    actorPeran: actor.peran,
    aksi: "user.create",
    entitasTipe: "user",
    entitasId: uid,
    ringkasan: `Menambahkan akun ${input.email} sebagai ${input.peran}.`,
    perubahan: { sesudah: { nama: input.nama, email: input.email, peran: input.peran } },
  });

  return toAuthUser(user);
}

export async function updateUser(
  uid: string,
  input: UpdateUserInput,
  actor: AuthUser,
): Promise<AuthUser> {
  const now = Timestamp.now();
  let before: UserDocument;
  let after: UserDocument;

  await db.runTransaction(async (tx) => {
    const ref = usersCollection().doc(uid);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw AppError.notFound("Akun tidak ditemukan.");

    before = snapshot.data() as UserDocument;

    if (input.peran && input.peran !== "admin") {
      await assertNotLastAdmin(tx, before);
    }

    after = {
      ...before,
      nama: input.nama ?? before.nama,
      peran: input.peran ?? before.peran,
      diperbaruiPada: now,
    };

    tx.set(ref, after);
  });

  if (input.peran && input.peran !== before!.peran) {
    try {
      await auth.setCustomUserClaims(uid, { role: input.peran });
    } catch (error) {
      logger.error({ err: error, uid }, "gagal menyinkronkan custom claim");
    }
  }

  setCachedUser(after!);

  await writeAudit({
    actorId: actor.id,
    actorNama: actor.nama,
    actorPeran: actor.peran,
    aksi: input.peran && input.peran !== before!.peran ? "role.change" : "user.update",
    entitasTipe: "user",
    entitasId: uid,
    ringkasan: `Memperbarui akun ${after!.email}.`,
    perubahan: {
      sebelum: { nama: before!.nama, peran: before!.peran },
      sesudah: { nama: after!.nama, peran: after!.peran },
    },
  });

  return toAuthUser(after!);
}

export async function setUserStatus(
  uid: string,
  status: UserStatus,
  actor: AuthUser,
): Promise<AuthUser> {
  const now = Timestamp.now();
  let before: UserDocument;
  let after: UserDocument;

  await db.runTransaction(async (tx) => {
    const ref = usersCollection().doc(uid);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw AppError.notFound("Akun tidak ditemukan.");

    before = snapshot.data() as UserDocument;

    if (status === "nonaktif") {
      await assertNotLastAdmin(tx, before);
    }

    after = {
      ...before,
      status,
      dinonaktifkanPada: status === "nonaktif" ? now : null,
      dinonaktifkanOleh: status === "nonaktif" ? actor.id : null,
      diperbaruiPada: now,
    };

    tx.set(ref, after);
  });

  try {
    if (status === "nonaktif") {
      await auth.updateUser(uid, { disabled: true });
      await auth.revokeRefreshTokens(uid);
    } else {
      await auth.updateUser(uid, { disabled: false });
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === "auth/user-not-found"
    ) {
      deleteCachedUser(uid);
      throw AppError.notFound("Akun tidak ditemukan.");
    }
    throw error;
  }

  setCachedUser(after!);

  await writeAudit({
    actorId: actor.id,
    actorNama: actor.nama,
    actorPeran: actor.peran,
    aksi: status === "nonaktif" ? "user.disable" : "user.enable",
    entitasTipe: "user",
    entitasId: uid,
    ringkasan: `${status === "nonaktif" ? "Menonaktifkan" : "Mengaktifkan"} akun ${after!.email}.`,
    perubahan: { sebelum: { status: before!.status }, sesudah: { status } },
  });

  return toAuthUser(after!);
}

export async function triggerPasswordReset(
  uid: string,
  actor: AuthUser,
): Promise<void> {
  const user = await usersRepository.getById(uid);
  if (!user) throw AppError.notFound("Akun tidak ditemukan.");

  try {
    await sendPasswordResetEmail(user.email);
  } catch (error) {
    const identityMessage =
      error instanceof Error ? error.message : "UNKNOWN";
    if (identityMessage !== "EMAIL_NOT_FOUND") {
      logger.warn(
        { err: error, uid },
        "gagal mengirim email reset kata sandi",
      );
    }
  }

  await writeAudit({
    actorId: actor.id,
    actorNama: actor.nama,
    actorPeran: actor.peran,
    aksi: "user.reset_password",
    entitasTipe: "user",
    entitasId: uid,
    ringkasan: `Meminta reset kata sandi untuk ${user.email}.`,
  });
}

export async function deleteUser(uid: string, actor: AuthUser): Promise<void> {
  let target: UserDocument;

  await db.runTransaction(async (tx) => {
    const ref = usersCollection().doc(uid);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw AppError.notFound("Akun tidak ditemukan.");

    target = snapshot.data() as UserDocument;
    await assertNotLastAdmin(tx, target);
    tx.delete(ref);
  });

  try {
    await auth.deleteUser(uid);
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code !== "auth/user-not-found") {
      logger.warn({ err: error, uid }, "dokumen pengguna dihapus tanpa Auth user");
    }
  }

  deleteCachedUser(uid);

  // Anonimkan jejak audit tanpa kehilangan korelasi operasional.
  try {
    const logs = await db
      .collection("auditLogs")
      .where("actorId", "==", uid)
      .get();
    const batch = db.batch();
    for (const log of logs.docs) {
      batch.update(log.ref, {
        actorNama: "Akun dihapus",
        perubahan: null,
      });
    }
    if (!logs.empty) await batch.commit();
  } catch (error) {
    logger.warn({ err: error, uid }, "gagal menganonimkan audit pengguna");
  }

  await writeAudit({
    actorId: actor.id,
    actorNama: actor.nama,
    actorPeran: actor.peran,
    aksi: "user.delete",
    entitasTipe: "user",
    entitasId: uid,
    ringkasan: `Menghapus akun ${target!.email}.`,
    perubahan: { sebelum: { nama: target!.nama, email: target!.email, peran: target!.peran } },
  });
}

export async function updateProfile(
  uid: string,
  nama: string,
): Promise<AuthUser> {
  const user = await getUserFromCache(uid);
  if (!user) throw AppError.notFound("Akun tidak ditemukan.");

  const next: UserDocument = {
    ...user,
    nama,
    diperbaruiPada: Timestamp.now(),
  };

  await usersCollection().doc(uid).set(next);
  setCachedUser(next);

  return toAuthUser(next);
}

export async function recordLogin(
  uid: string,
): Promise<UserDocument | null> {
  const now = Timestamp.now();
  const user = await getUserFromCache(uid);
  if (!user) return null;

  const next = { ...user, terakhirMasukPada: now, diperbaruiPada: now };
  await usersCollection().doc(uid).set(next);
  setCachedUser(next);

  return next;
}

export function roleToClaim(role: Role): { role: Role } {
  return { role };
}

export function genericLoginError(): AppError {
  return new AppError(ERROR_CODES.E02, { message: ERROR_MESSAGES["E-02"] });
}
