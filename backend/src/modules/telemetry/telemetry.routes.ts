import { Router, Request, Response } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "@/lib/logger.js";

const router = Router();
const db = getFirestore();

/**
 * GET /api/v1/telemetry/history
 * Mengambil 5 riwayat penyiraman terakhir dari koleksi riwayat_siram
 */
router.get("/history", async (_req: Request, res: Response) => {
  try {
    const snapshot = await db.collection("riwayat_siram")
      .orderBy("waktu", "desc")
      .limit(5)
      .get();

    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({ success: true, history });
  } catch (error) {
    logger.error({ error }, "Gagal mengambil riwayat penyiraman dari Firestore");
    res.status(500).json({ success: false, error: "Gagal mengambil riwayat" });
  }
});

/**
 * GET /api/v1/telemetry/status
 * Mengambil data status terbaru yang dikirim IoT langsung dari dokumen irigasi/status di Firestore
 */
router.get("/status", async (_req: Request, res: Response) => {
  try {
    const docRef = db.collection("irigasi").doc("status");
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(200).json({ success: true, status: null, message: "Belum ada data status dari IoT" });
    }

    res.status(200).json({
      success: true,
      status: doc.data(),
    });
  } catch (error) {
    logger.error({ error }, "Gagal mengambil status irigasi dari Firestore");
    res.status(500).json({ success: false, error: "Gagal mengambil data status" });
  }
});

/**
 * POST /api/v1/telemetry
 * Endpoint opsional untuk menerima data telemetri jika dikirim via HTTP
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const now = Timestamp.now();

    // Simpan apa adanya ke dokumen irigasi/status sesuai kiriman IoT
    await db.collection("irigasi").doc("status").set({
      ...data,
      serverReceivedAt: now,
    }, { merge: true });

    res.status(200).json({ success: true, message: "Status telemetri berhasil dibaca dan disimpan" });
  } catch (error) {
    logger.error({ error }, "Gagal memproses telemetri IoT");
    res.status(500).json({ success: false, error: "Gagal menyimpan telemetri" });
  }
});

export default router;
