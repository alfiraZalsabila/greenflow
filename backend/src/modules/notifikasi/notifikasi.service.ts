import { getFirestore, type Query, type DocumentData } from "firebase-admin/firestore";
import { NotifikasiResponse, NotifikasiDocument, NotificationType, NotificationSeverity } from "./notifikasi.types.js";

const db = getFirestore();

export class NotifikasiService {
  /**
   * Get notifications for a lahan with pagination
   */
  static async getNotifikasiByLahanId(
    lahanId: string,
    limit: number = 20,
  ): Promise<NotifikasiResponse[]> {
    let query: Query<DocumentData> = db.collection("notifikasi").where("lahanId", "==", lahanId);

    query = query.orderBy("dibuatPada", "desc").limit(limit);

    const snap = await query.get();
    return snap.docs.map((doc) => {
      const data = doc.data() as NotifikasiDocument;
      return {
        id: doc.id,
        tipe: data.tipe,
        lahanId: data.lahanId,
        perangkatId: data.perangkatId,
        pesan: data.pesan,
        severity: data.severity,
        baca: data.baca,
        dibuatPada: data.dibuatPada.toDate().toISOString(),
      };
    });
  }

  /**
   * Get all notifications with optional filters
   */
  static async getAllNotifikasi(
    lahanId?: string,
    limit: number = 50,
  ): Promise<NotifikasiResponse[]> {
    let query: Query<DocumentData> = db.collection("notifikasi");

    if (lahanId) {
      query = query.where("lahanId", "==", lahanId);
    }

    query = query.orderBy("dibuatPada", "desc").limit(limit);

    const snap = await query.get();
    return snap.docs.map((doc) => {
      const data = doc.data() as NotifikasiDocument;
      return {
        id: doc.id,
        tipe: data.tipe,
        lahanId: data.lahanId,
        perangkatId: data.perangkatId,
        pesan: data.pesan,
        severity: data.severity,
        baca: data.baca,
        dibuatPada: data.dibuatPada.toDate().toISOString(),
      };
    });
  }

  /**
   * Create a new notification (internal/system use)
   */
  static async createNotifikasi(
    data: Omit<NotifikasiDocument, "id" | "dibuatPada" | "versiSkema">,
  ): Promise<NotifikasiResponse> {
    const now = new Date();
    const notifikasiData: Omit<NotifikasiDocument, "id"> = {
      ...data,
      dibuatPada: { toDate: () => now } as any,
      versiSkema: 1,
    };

    const docRef = await db.collection("notifikasi").add(notifikasiData);

    return {
      id: docRef.id,
      tipe: data.tipe,
      lahanId: data.lahanId,
      perangkatId: data.perangkatId,
      pesan: data.pesan,
      severity: data.severity,
      baca: data.baca,
      dibuatPada: now.toISOString(),
    };
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notifId: string): Promise<NotifikasiResponse> {
    const doc = await db.collection("notifikasi").doc(notifId).get();
    if (!doc.exists) {
      throw new Error("Notifikasi tidak ditemukan");
    }

    await db.collection("notifikasi").doc(notifId).update({ baca: true });

    const updated = await db.collection("notifikasi").doc(notifId).get();
    const data = updated.data() as NotifikasiDocument;

    return {
      id: updated.id,
      tipe: data.tipe,
      lahanId: data.lahanId,
      perangkatId: data.perangkatId,
      pesan: data.pesan,
      severity: data.severity,
      baca: data.baca,
      dibuatPada: data.dibuatPada.toDate().toISOString(),
    };
  }

  /**
   * Delete notification
   */
  static async deleteNotifikasi(notifId: string): Promise<void> {
    const doc = await db.collection("notifikasi").doc(notifId).get();
    if (!doc.exists) {
      throw new Error("Notifikasi tidak ditemukan");
    }

    await db.collection("notifikasi").doc(notifId).delete();
  }
}
