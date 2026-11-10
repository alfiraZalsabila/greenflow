import { db } from "../../config/firebase.js";
import { logger } from "../../lib/logger.js";
import type { UserDocument } from "./user-document.js";

const USERS_COLLECTION = "users";

/**
 * Cache pengguna di memori (architecture AD-04). Sumber kebenaran tetap
 * dokumen Firestore; snapshot listener menjaga cache tetap dekat real-time.
 */
const cache = new Map<string, UserDocument>();

let unsubscribe: (() => void) | null = null;
let readyPromise: Promise<void> | null = null;

function applySnapshot(uid: string, data: UserDocument | undefined): void {
  if (data) cache.set(uid, data);
  else cache.delete(uid);
}

export function startUserCache(): Promise<void> {
  if (readyPromise) return readyPromise;

  readyPromise = new Promise<void>((resolve, reject) => {
    unsubscribe = db.collection(USERS_COLLECTION).onSnapshot(
      (snapshot) => {
        for (const change of snapshot.docChanges()) {
          applySnapshot(change.doc.id, change.doc.data() as UserDocument);
        }
        resolve();
      },
      (error) => {
        logger.error({ err: error }, "gagal memuat cache pengguna");
        readyPromise = null;
        reject(error);
      },
    );
  });

  return readyPromise;
}

export async function stopUserCache(): Promise<void> {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  cache.clear();
  readyPromise = null;
}

export async function getUserFromCache(
  uid: string,
): Promise<UserDocument | null> {
  await startUserCache();

  const cached = cache.get(uid);
  if (cached) return cached;

  // Fallback bila listener belum sempat menerima dokumen baru.
  const snapshot = await db.collection(USERS_COLLECTION).doc(uid).get();
  if (!snapshot.exists) return null;

  const user = snapshot.data() as UserDocument;
  cache.set(uid, user);
  return user;
}

/** Dipakai service setelah menulis agar request berikutnya langsung segar. */
export function setCachedUser(user: UserDocument): void {
  cache.set(user.uid, user);
}

export function deleteCachedUser(uid: string): void {
  cache.delete(uid);
}
