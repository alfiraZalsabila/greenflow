import { auth } from "./backend/src/config/firebase.js";

async function checkUser() {
  try {
    const user = await auth.getUserByEmail("admin.demo@greenflow.local");
    console.log("User found:", user.uid);
  } catch (error) {
    console.log("User not found or error:", (error as any).code);
  }
}

checkUser();
