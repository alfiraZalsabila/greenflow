import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function checkDevices() {
  const snapshot = await db.collection('devices').get();
  console.log('Devices found:');
  snapshot.forEach(doc => {
    console.log(`ID: ${doc.id}, Data:`, doc.data());
  });
}

checkDevices().catch(console.error);
