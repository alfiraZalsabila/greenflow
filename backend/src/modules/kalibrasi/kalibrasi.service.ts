import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { KalibrasiResponse, KalibrasiDocument } from "./kalibrasi.types.js";

const db = getFirestore();

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    if (date instanceof Date) return date.toISOString();
  }
  return new Date().toISOString();
}

export class KalibrasiService {
  /**
   * Ambil kalibrasi by device ID
   */
  static async getKalibrasiByDeviceId(deviceId: string): Promise<KalibrasiResponse | null> {
    try {
      const doc = await db.collection("kalibrasi").doc(deviceId).get();
      
      if (!doc.exists) {
        console.log(`[Kalibrasi] Document ${deviceId} does not exist in kalibrasi collection`);
        return null;
      }

      const data = doc.data() as KalibrasiDocument;
      console.log(`[Kalibrasi] Found data for ${deviceId}:`, data);

      return {
        id: doc.id,
        deviceId: data.deviceId,
        lahanId: data.lahanId,
        adcKering: data.adcKering,
        adcBasah: data.adcBasah,
        diperbaruiPada: toIsoString(data.diperbaruiPada),
        diperbaruiOleh: data.diperbaruiOleh,
      };
    } catch (error) {
      console.error(`[Kalibrasi] Error getting kalibrasi for ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get all kalibrasi for a lahan
   */
  static async getKalibrasiByLahanId(lahanId: string): Promise<KalibrasiResponse[]> {
    const snap = await db.collection("kalibrasi").where("lahanId", "==", lahanId).get();
    return snap.docs.map((doc) => {
      const data = doc.data() as KalibrasiDocument;
      return {
        id: doc.id,
        deviceId: data.deviceId,
        lahanId: data.lahanId,
        adcKering: data.adcKering,
        adcBasah: data.adcBasah,
        diperbaruiPada: toIsoString(data.diperbaruiPada),
        diperbaruiOleh: data.diperbaruiOleh,
      };
    });
  }

  /**
   * Create kalibrasi for a device
   */
  static async createKalibrasi(
    deviceId: string,
    data: Omit<KalibrasiDocument, "id" | "dibuatPada" | "diperbaruiPada" | "versiSkema" | "diperbaruiOleh">,
    diperbaruiOleh: string,
  ): Promise<KalibrasiResponse> {
    const now = Timestamp.now();
    const kalibrasiData: KalibrasiDocument = {
      ...data,
      id: deviceId,
      diperbaruiOleh,
      dibuatPada: now,
      diperbaruiPada: now,
      versiSkema: 1,
    };

    await db.collection("kalibrasi").doc(deviceId).set(kalibrasiData);

    return {
      id: deviceId,
      deviceId: data.deviceId,
      lahanId: data.lahanId,
      adcKering: data.adcKering,
      adcBasah: data.adcBasah,
      diperbaruiPada: now.toDate().toISOString(),
      diperbaruiOleh,
    };
  }

  /**
   * Update kalibrasi for a device (admin only)
   */
  static async updateKalibrasi(
    deviceId: string,
    data: Partial<Omit<KalibrasiDocument, "id" | "deviceId" | "lahanId" | "dibuatPada" | "versiSkema">>,
    diperbaruiOleh: string,
  ): Promise<KalibrasiResponse> {
    const doc = await db.collection("kalibrasi").doc(deviceId).get();
    if (!doc.exists) {
      throw new Error("Kalibrasi tidak ditemukan");
    }

    const now = Timestamp.now();
    const updateData = {
      ...data,
      diperbaruiPada: now,
      diperbaruiOleh,
    };

    await db.collection("kalibrasi").doc(deviceId).update(updateData);

    const updated = await db.collection("kalibrasi").doc(deviceId).get();
    const kalibrasiData = updated.data() as KalibrasiDocument;

    return {
      id: updated.id,
      deviceId: kalibrasiData.deviceId,
      lahanId: kalibrasiData.lahanId,
      adcKering: kalibrasiData.adcKering,
      adcBasah: kalibrasiData.adcBasah,
      diperbaruiPada: toIsoString(kalibrasiData.diperbaruiPada),
      diperbaruiOleh: kalibrasiData.diperbaruiOleh,
    };
  }

  /**
   * Reset kalibrasi to default values
   */
  static async resetKalibrasi(
    deviceId: string,
    diperbaruiOleh: string,
  ): Promise<KalibrasiResponse> {
    const doc = await db.collection("kalibrasi").doc(deviceId).get();
    if (!doc.exists) {
      throw new Error("Kalibrasi tidak ditemukan");
    }

    const now = Timestamp.now();

    // Reset to default values
    const defaultADCKering = 800;
    const defaultADCBasah = 400;

    await db.collection("kalibrasi").doc(deviceId).update({
      adcKering: defaultADCKering,
      adcBasah: defaultADCBasah,
      diperbaruiPada: now,
      diperbaruiOleh,
    });

    const updated = await db.collection("kalibrasi").doc(deviceId).get();
    const kalibrasiData = updated.data() as KalibrasiDocument;

    return {
      id: updated.id,
      deviceId: kalibrasiData.deviceId,
      lahanId: kalibrasiData.lahanId,
      adcKering: kalibrasiData.adcKering,
      adcBasah: kalibrasiData.adcBasah,
      diperbaruiPada: toIsoString(kalibrasiData.diperbaruiPada),
      diperbaruiOleh: kalibrasiData.diperbaruiOleh,
    };
  }
}
