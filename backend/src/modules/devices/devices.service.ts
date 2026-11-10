import { getFirestore, Timestamp, type Query, type DocumentData } from "firebase-admin/firestore";
import { DeviceResponse, DeviceDocument } from "./devices.types.js";
import { createHash } from "crypto";

const db = getFirestore();

export class DevicesService {
  /**
   * Ambil semua devices (dengan optional filter lahanId)
   */
  static async getAllDevices(lahanId?: string): Promise<DeviceResponse[]> {
    let query: Query<DocumentData> = db.collection("devices") as Query<DocumentData>;

    if (lahanId) {
      query = query.where("lahanId", "==", lahanId);
    }

    const snap = await query.get();
    return snap.docs.map((doc) => {
      const data = doc.data() as DeviceDocument;
      return {
        id: doc.id,
        nama: data.nama,
        tipe: data.tipe,
        lahanId: data.lahanId,
        status: data.status,
        statusTerakhir: data.statusTerakhir,
      };
    });
  }

  /**
   * Ambil device by ID
   */
  static async getDeviceById(deviceId: string): Promise<DeviceResponse | null> {
    const doc = await db.collection("devices").doc(deviceId).get();
    if (!doc.exists) return null;

    const data = doc.data() as DeviceDocument;
    return {
      id: doc.id,
      nama: data.nama,
      tipe: data.tipe,
      lahanId: data.lahanId,
      status: data.status,
      statusTerakhir: data.statusTerakhir,
    };
  }

  /**
   * Ambil devices by tipe (e.g., "sensor", "pompa")
   */
  static async getDevicesByTipe(
    tipe: "pengendali" | "sensor" | "pompa",
    lahanId?: string,
  ): Promise<DeviceResponse[]> {
    let query = db.collection("devices").where("tipe", "==", tipe);

    if (lahanId) {
      query = query.where("lahanId", "==", lahanId);
    }

    const snap = await query.get();
    return snap.docs.map((doc) => {
      const data = doc.data() as DeviceDocument;
      return {
        id: doc.id,
        nama: data.nama,
        tipe: data.tipe,
        lahanId: data.lahanId,
        status: data.status,
        statusTerakhir: data.statusTerakhir,
      };
    });
  }

  /**
   * Buat device baru (admin only)
   */
  static async createDevice(
    data: Omit<DeviceDocument, "id" | "tokenHash" | "tokenHint" | "dibuatPada" | "diperbaruiPada" | "versiSkema">,
  ): Promise<DeviceResponse> {
    const now = Timestamp.now();
    
    // Generate token hash and hint
    const token = `${data.kodePerangkat}.${Date.now()}`;
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const tokenHint = token.slice(-8);

    const deviceData: DeviceDocument = {
      ...data,
      id: data.kodePerangkat,
      tokenHash,
      tokenHint,
      dibuatPada: now,
      diperbaruiPada: now,
      versiSkema: 1,
    };

    await db.collection("devices").doc(data.kodePerangkat).set(deviceData);

    return {
      id: data.kodePerangkat,
      nama: data.nama,
      tipe: data.tipe,
      lahanId: data.lahanId,
      status: data.status,
      statusTerakhir: data.statusTerakhir,
    };
  }

  /**
   * Update device (admin only)
   */
  static async updateDevice(
    deviceId: string,
    data: Partial<Omit<DeviceDocument, "id" | "kodePerangkat" | "tokenHash" | "tokenHint" | "dibuatPada" | "diperbaruiPada" | "versiSkema">>,
  ): Promise<DeviceResponse> {
    const doc = await db.collection("devices").doc(deviceId).get();
    if (!doc.exists) {
      throw new Error("Perangkat tidak ditemukan");
    }

    const now = Timestamp.now();
    const updateData = {
      ...data,
      diperbaruiPada: now,
    };

    await db.collection("devices").doc(deviceId).update(updateData);

    const updated = await db.collection("devices").doc(deviceId).get();
    const deviceData = updated.data() as DeviceDocument;

    return {
      id: updated.id,
      nama: deviceData.nama,
      tipe: deviceData.tipe,
      lahanId: deviceData.lahanId,
      status: deviceData.status,
      statusTerakhir: deviceData.statusTerakhir,
    };
  }

  /**
   * Soft delete device - set status to nonaktif
   */
  static async deleteDevice(deviceId: string): Promise<void> {
    const doc = await db.collection("devices").doc(deviceId).get();
    if (!doc.exists) {
      throw new Error("Perangkat tidak ditemukan");
    }

    const now = Timestamp.now();
    await db.collection("devices").doc(deviceId).update({
      status: "nonaktif",
      diperbaruiPada: now,
    });
  }
}
