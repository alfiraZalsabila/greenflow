import type {
  AuthUser,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
} from "@greenflow/shared";
import { ERROR_CODES, ERROR_MESSAGES } from "@greenflow/shared";
import type { Response } from "express";
import { Timestamp } from "firebase-admin/firestore";

import { auth } from "../../config/firebase.js";
import { writeAudit } from "../../lib/audit.js";
import {
  clearSessionCookie,
  sessionExpiresInMs,
  setSessionCookie,
} from "../../lib/cookies.js";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { toAuthUser } from "../users/user-document.js";
import type { UserDocument } from "../users/user-document.js";
import {
  getUserFromCache,
  setCachedUser,
} from "../users/user-cache.js";
import { usersRepository } from "../users/users.repository.js";
import { recordLogin } from "../users/users.service.js";
import {
  FirebaseRestError,
  sendPasswordResetEmail,
  signInWithPassword,
} from "./firebase-rest.js";

function invalidCredentials(): AppError {
  return new AppError(ERROR_CODES.E02, {
    message: ERROR_MESSAGES[ERROR_CODES.E02],
  });
}

function mapCreateUserError(error: unknown): never {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  if (code === "auth/email-already-exists") {
    throw AppError.conflict("Email sudah terdaftar.");
  }
  if (code === "auth/invalid-email") {
    throw AppError.badRequest(undefined, "Format email tidak valid.");
  }
  if (code === "auth/invalid-password" || code === "auth/weak-password") {
    throw AppError.badRequest(undefined, "Kata sandi tidak memenuhi syarat.");
  }

  throw error;
}

async function issueSession(idToken: string, res: Response): Promise<void> {
  const cookie = await auth.createSessionCookie(idToken, {
    expiresIn: sessionExpiresInMs(),
  });
  setSessionCookie(res, cookie);
}

async function authenticate(
  email: string,
  password: string,
): Promise<{ idToken: string; uid: string }> {
  try {
    const signIn = await signInWithPassword(email, password);
    return { idToken: signIn.idToken, uid: signIn.localId };
  } catch (error) {
    if (error instanceof FirebaseRestError) throw invalidCredentials();
    throw error;
  }
}

function buildUserDocument(uid: string, input: RegisterInput): UserDocument {
  const now = Timestamp.now();

  return {
    uid,
    nama: input.nama,
    email: input.email,
    peran: "pengguna",
    status: "aktif",
    dibuatPada: now,
    diperbaruiPada: now,
    terakhirMasukPada: now,
    dinonaktifkanPada: null,
    dinonaktifkanOleh: null,
    versiSkema: 1,
  };
}

export async function register(
  input: RegisterInput,
  res: Response,
): Promise<AuthUser> {
  let uid: string;

  try {
    const created = await auth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.nama,
      disabled: false,
    });
    uid = created.uid;
  } catch (error) {
    mapCreateUserError(error);
  }

  const user = buildUserDocument(uid, input);

  try {
    await auth.setCustomUserClaims(uid, { role: "pengguna" });
    await usersRepository.create(user);
  } catch (error) {
    await auth.deleteUser(uid).catch(() => undefined);
    throw error;
  }

  setCachedUser(user);

  const session = await authenticate(input.email, input.password);
  await issueSession(session.idToken, res);

  await writeAudit({
    actorId: uid,
    actorNama: user.nama,
    actorPeran: "pengguna",
    aksi: "user.register",
    entitasTipe: "user",
    entitasId: uid,
    ringkasan: `Akun ${user.email} mendaftar.`,
  });

  return toAuthUser(user);
}

export async function login(
  input: LoginInput,
  res: Response,
): Promise<AuthUser> {
  const session = await authenticate(input.email, input.password);

  const cached = await getUserFromCache(session.uid);
  if (!cached || cached.status !== "aktif") {
    // Jangan membedakan akun tidak ada, nonaktif, atau sandi salah.
    throw invalidCredentials();
  }

  await issueSession(session.idToken, res);

  const updated = await recordLogin(session.uid);
  return toAuthUser(updated ?? cached);
}

export async function logout(uid: string, res: Response): Promise<void> {
  try {
    await auth.revokeRefreshTokens(uid);
  } catch (error) {
    logger.warn({ err: error, uid }, "gagal mencabut token saat logout");
  }

  clearSessionCookie(res);
}

export async function forgotPassword(
  input: ForgotPasswordInput,
): Promise<void> {
  try {
    await sendPasswordResetEmail(input.email);
  } catch (error) {
    if (
      error instanceof FirebaseRestError &&
      error.identityMessage === "EMAIL_NOT_FOUND"
    ) {
      return;
    }
    // Respons tetap disamarkan agar tidak membocorkan status pendaftaran.
    logger.warn({ err: error }, "gagal mengirim email reset kata sandi");
  }
}

export async function getCurrentUser(uid: string): Promise<AuthUser> {
  const user = await getUserFromCache(uid);
  if (!user || user.status !== "aktif") {
    throw AppError.unauthorized(ERROR_CODES.E04);
  }
  return toAuthUser(user);
}

export async function changePassword(
  uid: string,
  input: ChangePasswordInput,
  res: Response,
): Promise<void> {
  const user = await getUserFromCache(uid);
  if (!user) throw AppError.notFound("Akun tidak ditemukan.");

  try {
    await signInWithPassword(user.email, input.currentPassword);
  } catch (error) {
    if (error instanceof FirebaseRestError) {
      throw AppError.badRequest(
        [{ field: "currentPassword", issue: "Kata sandi lama salah." }],
        "Kata sandi lama salah.",
      );
    }
    throw error;
  }

  await auth.updateUser(uid, { password: input.newPassword });
  await auth.revokeRefreshTokens(uid);

  // Sesi saat ini diperbarui agar pengguna tidak terlempar keluar.
  const session = await authenticate(user.email, input.newPassword);
  await issueSession(session.idToken, res);

  await writeAudit({
    actorId: uid,
    actorNama: user.nama,
    actorPeran: user.peran,
    aksi: "user.change_password",
    entitasTipe: "user",
    entitasId: uid,
    ringkasan: `Akun ${user.email} mengganti kata sandi.`,
  });
}
