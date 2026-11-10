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

async function listCollections() {
  const collections = await db.listCollections();
  console.log('Collections found:');
  collections.forEach(col => {
    console.log(`- ${col.id}`);
  });
}

listCollections().catch(console.error);
