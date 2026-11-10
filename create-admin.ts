import { auth, db } from "./backend/src/config/firebase.js";
import { Timestamp } from "firebase-admin/firestore";

async function createAdmin() {
  const email = "admin.demo@greenflow.local";
  const password = "demopassword123";

  try {
    const user = await auth.createUser({
      email,
      password,
      displayName: "Admin Demo",
      disabled: false,
    });

    await auth.setCustomUserClaims(user.uid, { role: "admin" });
    
    await db.collection("users").doc(user.uid).set({
      uid: user.uid,
      nama: "Admin Demo",
      email,
      peran: "admin",
      status: "aktif",
      dibuatPada: Timestamp.now(),
      diperbaruiPada: Timestamp.now(),
      versiSkema: 1,
    });

    console.log("Admin created successfully:", user.uid);
  } catch (error) {
    console.error("Error creating admin:", error);
  }
}

createAdmin();
