import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../../.env") });

const projectId = process.env.FIREBASE_PROJECT_ID || "irigasisawi-a28c1";

const app = initializeApp({
  projectId,
  ...(process.env.FIREBASE_SERVICE_ACCOUNT_JSON && {
    credential: cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    ),
  }),
});

const db = getFirestore(app);

async function clearAllData() {
  console.log("🗑️  Clearing all collections...\n");

  const collections = ["devices", "lahan", "kalibrasi", "readings", "waterings", "riwayat_siram", "notifikasi", "parameter", "irigasi"];

  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    console.log(`Clearing ${collectionName} (${snapshot.size} docs)...`);
    
    for (const doc of snapshot.docs) {
      await doc.ref.delete();
    }
    console.log(`✓ ${collectionName} cleared\n`);
  }

  console.log("✅ All collections cleared!");
}

clearAllData().catch(console.error);
