import { getFirestore, Query, DocumentData } from "firebase-admin/firestore";
import { ReadingResponse, ReadingDocument } from "./readings.types.js";

const db = getFirestore();

export class ReadingsService {
  /**
   * Ambil readings dengan optional filter & pagination
   */
  static async getReadings(options?: {
    perangkatId?: string;
    lahanId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ReadingResponse[]> {
    const { perangkatId, lahanId, limit = 10, offset = 0 } = options || {};

    let query: Query<DocumentData> = db.collection("readings");

    if (perangkatId) {
      query = query.where("perangkatId", "==", perangkatId);
    }

    if (lahanId) {
      query = query.where("lahanId", "==", lahanId);
    }

    // Order by readAt descending (newest first)
    query = query.orderBy("readAt", "desc").limit(limit + offset);

    const snap = await query.get();
    const docs = snap.docs.slice(offset);

    return docs.map((doc) => {
      const data = doc.data() as ReadingDocument;
      return {
        id: doc.id,
        perangkatId: data.perangkatId,
        lahanId: data.lahanId,
        moisture: data.moisture, // standardized field name
        pumpState: data.pumpState,
        readAt: data.readAt.toDate().toISOString(),
        fuzzy: data.fuzzy,
      };
    });
  }

  /**
   * Ambil reading terbaru per perangkat
   */
  static async getLatestReading(perangkatId: string): Promise<ReadingResponse | null> {
    const snap = await db
      .collection("readings")
      .where("perangkatId", "==", perangkatId)
      .orderBy("readAt", "desc")
      .limit(1)
      .get();

    if (snap.empty) return null;

    const doc = snap.docs[0];
    if (!doc) return null;

    const data = doc.data() as ReadingDocument;

    return {
      id: doc.id,
      perangkatId: data.perangkatId,
      lahanId: data.lahanId,
      moisture: data.moisture, // standardized field name
      pumpState: data.pumpState,
      readAt: data.readAt.toDate().toISOString(),
      fuzzy: data.fuzzy,
    };
  }

  /**
   * Ambil readings terbaru per lahan (dari semua sensor)
   */
  static async getLatestReadingsByLahan(lahanId: string): Promise<ReadingResponse[]> {
    const snap = await db
      .collection("readings")
      .where("lahanId", "==", lahanId)
      .orderBy("readAt", "desc")
      .limit(20)
      .get();

    return snap.docs.map((doc) => {
      const data = doc.data() as ReadingDocument;
      return {
        id: doc.id,
        perangkatId: data.perangkatId,
        lahanId: data.lahanId,
        moisture: data.moisture, // standardized field name
        pumpState: data.pumpState,
        readAt: data.readAt.toDate().toISOString(),
        fuzzy: data.fuzzy,
      };
    });
  }
}
