import { auth, db } from "../config/firebase.js";
import { env } from "../config/env.js";
import { logger } from "./logger.js";
import { Timestamp } from "firebase-admin/firestore";

export async function ensureDefaultUsers(): Promise<void> {
  if (!env.FIREBASE_USE_EMULATOR && env.NODE_ENV === "production") {
    return; // Never auto-seed in production
  }

  // Retry up to 10 times with 1.5s delay if emulator is still starting
  const maxRetries = 10;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const adminEmail = env.ADMIN_SEED_EMAIL || "admin@greenflow.local";
      const adminPassword = env.ADMIN_SEED_PASSWORD || "adminrahasia";

      // 1. Ensure Admin
      let adminUid: string;
      try {
        const existingAdmin = await auth.getUserByEmail(adminEmail);
        adminUid = existingAdmin.uid;
      } catch {
        const created = await auth.createUser({
          email: adminEmail,
          password: adminPassword,
          displayName: "Admin GREENFLOW",
          disabled: false,
        });
        adminUid = created.uid;
        logger.info({ email: adminEmail }, "[auto-seed] Akun admin dibuat");
      }

      await auth.setCustomUserClaims(adminUid, { role: "admin" });
      const now = Timestamp.now();
      await db.collection("users").doc(adminUid).set({
        uid: adminUid,
        nama: "Admin GREENFLOW",
        email: adminEmail,
        peran: "admin",
        status: "aktif",
        dibuatPada: now,
        diperbaruiPada: now,
        terakhirMasukPada: null,
        dinonaktifkanPada: null,
        dinonaktifkanOleh: null,
        versiSkema: 1,
      }, { merge: true });

      // 2. Ensure Budi (Pengguna)
      const budiEmail = "budi@example.com";
      const budiPassword = "baru12345";
      let budiUid: string;
      try {
        const existingBudi = await auth.getUserByEmail(budiEmail);
        budiUid = existingBudi.uid;
      } catch {
        const createdBudi = await auth.createUser({
          email: budiEmail,
          password: budiPassword,
          displayName: "Budi Santoso",
          disabled: false,
        });
        budiUid = createdBudi.uid;
        logger.info({ email: budiEmail }, "[auto-seed] Akun demo Budi dibuat");
      }

      await auth.setCustomUserClaims(budiUid, { role: "pengguna" });
      await db.collection("users").doc(budiUid).set({
        uid: budiUid,
        nama: "Budi Santoso",
        email: budiEmail,
        peran: "pengguna",
        status: "aktif",
        dibuatPada: now,
        diperbaruiPada: now,
        terakhirMasukPada: null,
        dinonaktifkanPada: null,
        dinonaktifkanOleh: null,
        versiSkema: 1,
      }, { merge: true });

      // 3. Ensure a demo lahan exists if none exist
      const lahanSnap = await db.collection("lahan").limit(1).get();
      if (lahanSnap.empty) {
        const lahanId = "lh-demo-01";
        await db.collection("lahan").doc(lahanId).set({
          id: lahanId,
          nama: "Lahan Sawi Utama (Demo)",
          lokasi: "Greenhouse Blok A",
          luasM2: 100,
          status: "aktif",
          dibuatPada: now,
          diperbaruiPada: now,
          parameter: {
            ambangKering: 30,
            titikTengah: 45,
            ambangCukup: 60,
            maxDurationSec: 300,
            intervalSec: 300,
            fuzzy: {
              keringSec: 60,
              lembapSec: 120,
              basahSec: 180,
            },
          },
        });
        await db.collection("parameter").doc(lahanId).set({
          id: lahanId,
          lahanId,
          kerekSec: 60,
          lembapSec: 120,
          basahSec: 180,
          ambangKering: 30,
          titikTengah: 45,
          ambangCukup: 60,
          diperbaruiPada: now,
          diperbaruiOleh: adminUid,
        });
        logger.info("[auto-seed] Lahan demo & parameter dibuat");
      }

      logger.info("[auto-seed] Pemeriksaan seed selesai. Akun admin dan demo siap digunakan.");
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        logger.error({ err: error }, "[auto-seed] Gagal melakukan auto-seed setelah beberapa kali percobaan");
        throw error;
      }
      logger.warn({ attempt }, "[auto-seed] Emulator belum siap, mencoba ulang dalam 1.5 detik...");
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}
