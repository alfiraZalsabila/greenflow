import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../../.env") });

process.env.FIREBASE_USE_EMULATOR = "true";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

const app = initializeApp({ projectId: "irigasisawi-a28c1" });
const db = getFirestore(app);
getAuth(app); // Initialize auth emulator

async function checkData() {
  console.log("📊 Checking Firestore data...\n");

  // Cek users
  console.log("👤 Users di Firestore:");
  const usersSnap = await db.collection("users").get();
  console.log(`   Total: ${usersSnap.size}`);
  usersSnap.docs.forEach((d) => {
    const data = d.data();
    console.log(
      `   - ${data.email} (${data.peran}) [${data.status}]`
    );
  });

  // Cek lahan
  console.log("\n🌾 Lahan:");
  const lahanSnap = await db.collection("lahan").get();
  console.log(`   Total: ${lahanSnap.size}`);
  lahanSnap.docs.forEach((d) => {
    const data = d.data();
    console.log(`   - ${d.id}: ${data.nama}`);
  });

  // Cek devices
  console.log("\n📱 Devices:");
  const devicesSnap = await db.collection("devices").get();
  console.log(`   Total: ${devicesSnap.size}`);
  devicesSnap.docs.forEach((d) => {
    const data = d.data();
    console.log(`   - ${d.id} (${data.tipe}): ${data.nama}`);
  });

  // Cek readings
  console.log("\n📈 Readings:");
  const readingsSnap = await db.collection("readings").limit(3).get();
  console.log(`   Total: ${readingsSnap.size} (shown: ${readingsSnap.docs.length})`);
  readingsSnap.docs.forEach((d) => {
    const data = d.data();
    console.log(
      `   - ${d.id}: moisture=${data.moisturePct}%, pump=${data.pumpState}`
    );
  });

  console.log("\n✓ Check complete");
  process.exit(0);
}

checkData().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
