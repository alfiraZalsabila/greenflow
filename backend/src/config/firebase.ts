import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { env, isProduction } from "./env.js";

if (env.FIREBASE_USE_EMULATOR) {
  // Firebase Admin membaca variabel ini saat inisialisasi.
  console.log("Using emulator: true");
  process.env.FIREBASE_AUTH_EMULATOR_HOST =
    env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
  process.env.FIRESTORE_EMULATOR_HOST =
    env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
} else {
  console.log("Using emulator: false");
}

const credential = (() => {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) return undefined;

  try {
    const parsed = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error("Field akun layanan tidak lengkap");
    }

    return cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, "\n"),
    });
  } catch (error) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON tidak valid.",
      { cause: error },
    );
  }
})();

const app =
  getApps()[0] ??
  initializeApp({
    projectId: env.FIREBASE_PROJECT_ID,
    databaseURL: `https://${env.FIREBASE_PROJECT_ID}-default-rtdb.asia-southeast1.firebasedatabase.app`,
    ...(credential ? { credential } : {}),
  });

export const auth = getAuth(app);
export const db = getFirestore(app);

db.settings({ ignoreUndefinedProperties: true });

if (!isProduction && !env.FIREBASE_USE_EMULATOR) {
  // Membantu saat transisi ke proyek Firebase asli di lingkungan dev.
  console.info(
    "[firebase] mode non-emulator; pastikan GOOGLE_APPLICATION_CREDENTIALS diisi.",
  );
}
