import { db } from "../../config/firebase.js";
import type { UserDocument } from "./user-document.js";

const collection = () => db.collection("users");

export const usersRepository = {
  async getAll(): Promise<UserDocument[]> {
    const snapshot = await collection().orderBy("nama").get();
    return snapshot.docs.map((doc) => doc.data() as UserDocument);
  },

  async getById(uid: string): Promise<UserDocument | null> {
    const snapshot = await collection().doc(uid).get();
    return snapshot.exists ? (snapshot.data() as UserDocument) : null;
  },

  async create(user: UserDocument): Promise<void> {
    await collection().doc(user.uid).set(user);
  },

  async remove(uid: string): Promise<void> {
    await collection().doc(uid).delete();
  },
};
