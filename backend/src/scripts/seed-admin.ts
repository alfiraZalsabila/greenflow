/**
 * Membuat admin pertama dari ADMIN_SEED_EMAIL/PASSWORD.
 * Jalankan sekali per lingkungan: npm run seed:admin -w @greenflow/backend
 */
import { auth, db } from "../config/firebase.js";
import { env } from "../config/env.js";
import { writeAudit } from "../lib/audit.js";
import { logger } from "../lib/logger.js";
import { Timestamp } from "firebase-admin/firestore";

async function findOrCreateAuthUser(
  email: string,
  password: string,
): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(email);
    logger.info({ uid: existing.uid }, "akun admin sudah ada; memperbarui");
    return existing.uid;
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code !== "auth/user-not-found") throw error;

    const created = await auth.createUser({
      email,
      password,
      displayName: "Admin GREENFLOW",
      disabled: false,
    });
    logger.info({ uid: created.uid }, "akun admin dibuat");
    return created.uid;
  }
}

async function main(): Promise<void> {
  const email = env.ADMIN_SEED_EMAIL;
  const password = env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_SEED_EMAIL dan ADMIN_SEED_PASSWORD wajib diisi untuk seed admin.",
    );
  }

  const uid = await findOrCreateAuthUser(email, password);
  const now = Timestamp.now();

  await auth.setCustomUserClaims(uid, { role: "admin" });
  await auth.updateUser(uid, { disabled: false });

  const ref = db.collection("users").doc(uid);
  const snapshot = await ref.get();
  const existing = snapshot.exists ? snapshot.data() : undefined;

  await ref.set({
    uid,
    nama:
      (existing?.nama as string | undefined) ?? "Admin GREENFLOW",
    email,
    peran: "admin",
    status: "aktif",
    dibuatPada: (existing?.dibuatPada as Timestamp | undefined) ?? now,
    diperbaruiPada: now,
    terakhirMasukPada:
      (existing?.terakhirMasukPada as Timestamp | null | undefined) ?? null,
    dinonaktifkanPada: null,
    dinonaktifkanOleh: null,
    versiSkema: 1,
  });

  await writeAudit({
    actorId: null,
    actorNama: "Sistem",
    actorPeran: "sistem",
    aksi: "admin.seed",
    entitasTipe: "user",
    entitasId: uid,
    ringkasan: `Admin pertama ${email} disiapkan.`,
  });

  logger.info({ email }, "seed admin selesai");
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    logger.error({ err: error }, "seed admin gagal");
    process.exit(1);
  });
