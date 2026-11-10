import { getFirestore, Timestamp, type Query, type DocumentData } from "firebase-admin/firestore";
import { LahanResponse, LahanDocument } from "./lahan.types.js";

const db = getFirestore();

export class LahanService {
  /**
   * Ambil semua lahan (atau filter by status)
   */
  static async getAllLahan(status?: "aktif" | "nonaktif"): Promise<LahanResponse[]> {
    let query: Query<DocumentData> = db.collection("lahan") as Query<DocumentData>;

    if (status) {
      query = query.where("status", "==", status);
    }

    const snap = await query.get();
    return snap.docs.map((doc) => {
      const data = doc.data() as LahanDocument;
      return {
        id: doc.id,
        nama: data.nama,
        lokasi: data.lokasi,
        luasM2: data.luasM2,
        status: data.status,
        parameter: data.parameter,
      };
    });
  }

  /**
   * Ambil lahan by ID
   */
  static async getLabanById(lahanId: string): Promise<LahanResponse | null> {
    const doc = await db.collection("lahan").doc(lahanId).get();
    if (!doc.exists) return null;

    const data = doc.data() as LahanDocument;
    return {
      id: doc.id,
      nama: data.nama,
      lokasi: data.lokasi,
      luasM2: data.luasM2,
      status: data.status,
      parameter: data.parameter,
    };
  }

  /**
   * Buat lahan baru (admin only)
   */
  static async createLahan(
    lahanId: string,
    data: Omit<LahanDocument, "id" | "dibuatPada" | "diperbaruiPada" | "versiSkema" | "dibuatOleh">,
    dibuatOleh: string,
  ): Promise<LahanResponse> {
    const now = Timestamp.now();
    const lahanData: LahanDocument = {
      ...data,
      id: lahanId,
      dibuatOleh,
      dibuatPada: now,
      diperbaruiPada: now,
      versiSkema: 1,
    };

    await db.collection("lahan").doc(lahanId).set(lahanData);

    return {
      id: lahanId,
      nama: data.nama,
      lokasi: data.lokasi,
      luasM2: data.luasM2,
      status: data.status,
      parameter: data.parameter,
    };
  }

  /**
   * Update lahan (admin only)
   */
  static async updateLahan(
    lahanId: string,
    data: Partial<Omit<LahanDocument, "id" | "dibuatPada" | "diperbaruiPada" | "versiSkema" | "dibuatOleh">>,
  ): Promise<LahanResponse> {
    const doc = await db.collection("lahan").doc(lahanId).get();
    if (!doc.exists) {
      throw new Error("Lahan tidak ditemukan");
    }

    const now = Timestamp.now();
    const updateData = {
      ...data,
      diperbaruiPada: now,
    };

    await db.collection("lahan").doc(lahanId).update(updateData);

    const updated = await db.collection("lahan").doc(lahanId).get();
    const lahanData = updated.data() as LahanDocument;

    return {
      id: updated.id,
      nama: lahanData.nama,
      lokasi: lahanData.lokasi,
      luasM2: lahanData.luasM2,
      status: lahanData.status,
      parameter: lahanData.parameter,
    };
  }

  /**
   * Soft delete lahan - set status to nonaktif
   */
  static async deleteLahan(lahanId: string): Promise<void> {
    const doc = await db.collection("lahan").doc(lahanId).get();
    if (!doc.exists) {
      throw new Error("Lahan tidak ditemukan");
    }

    const now = Timestamp.now();
    await db.collection("lahan").doc(lahanId).update({
      status: "nonaktif",
      diperbaruiPada: now,
    });
  }
}
