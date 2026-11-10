import { getFirestore, type Query, type DocumentData } from "firebase-admin/firestore";
import { ParameterResponse, ParameterDocument } from "./parameter.types.js";

const db = getFirestore();

export class ParameterService {
  /**
   * Ambil parameter for a lahan
   */
  static async getParameterByLahanId(lahanId: string): Promise<ParameterResponse | null> {
    const doc = await db.collection("parameter").doc(lahanId).get();
    if (!doc.exists) return null;

    const data = doc.data() as ParameterDocument;
    return {
      id: doc.id,
      lahanId: data.lahanId,
      keringSec: data.keringSec,
      lembapSec: data.lembapSec,
      basahSec: data.basahSec,
      ambangKering: data.ambangKering,
      titikTengah: data.titikTengah,
      ambangCukup: data.ambangCukup,
      diperbaruiPada: data.diperbaruiPada.toDate().toISOString(),
      diperbaruiOleh: data.diperbaruiOleh,
    };
  }

  /**
   * Create default parameter for a new lahan
   */
  static async createParameter(
    lahanId: string,
    data: Omit<ParameterDocument, "id" | "dibuatPada" | "diperbaruiPada" | "versiSkema" | "diperbaruiOleh">,
    diperbaruiOleh: string,
  ): Promise<ParameterResponse> {
    const now = new Date();
    const parameterData: ParameterDocument = {
      ...data,
      id: lahanId,
      diperbaruiOleh,
      dibuatPada: { toDate: () => now } as any,
      diperbaruiPada: { toDate: () => now } as any,
      versiSkema: 1,
    };

    await db.collection("parameter").doc(lahanId).set(parameterData);

    return {
      id: lahanId,
      lahanId: data.lahanId,
      keringSec: data.keringSec,
      lembapSec: data.lembapSec,
      basahSec: data.basahSec,
      ambangKering: data.ambangKering,
      titikTengah: data.titikTengah,
      ambangCukup: data.ambangCukup,
      diperbaruiPada: now.toISOString(),
      diperbaruiOleh,
    };
  }

  /**
   * Update parameter for a lahan (admin only)
   */
  static async updateParameter(
    lahanId: string,
    data: Partial<Omit<ParameterDocument, "id" | "lahanId" | "dibuatPada" | "versiSkema">>,
    diperbaruiOleh: string,
  ): Promise<ParameterResponse> {
    const doc = await db.collection("parameter").doc(lahanId).get();
    if (!doc.exists) {
      throw new Error("Parameter tidak ditemukan");
    }

    const now = new Date();
    const updateData = {
      ...data,
      diperbaruiPada: { toDate: () => now } as any,
      diperbaruiOleh,
    };

    await db.collection("parameter").doc(lahanId).update(updateData);

    const updated = await db.collection("parameter").doc(lahanId).get();
    const parameterData = updated.data() as ParameterDocument;

    return {
      id: updated.id,
      lahanId: parameterData.lahanId,
      keringSec: parameterData.keringSec,
      lembapSec: parameterData.lembapSec,
      basahSec: parameterData.basahSec,
      ambangKering: parameterData.ambangKering,
      titikTengah: parameterData.titikTengah,
      ambangCukup: parameterData.ambangCukup,
      diperbaruiPada: parameterData.diperbaruiPada.toDate().toISOString(),
      diperbaruiOleh: parameterData.diperbaruiOleh,
    };
  }
}
