/**
 * Script seed data demo untuk simulasi dashboard
 * Membuat: lahan, perangkat (pengendali + sensor), readings, waterings
 *
 * Jalankan: npx tsx src/scripts/seed-demo.ts
 */

import { initializeApp, cert } from "firebase-admin/app";
import {
  getFirestore,
  Timestamp,
} from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { config } from "dotenv";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../../.env") });

const projectId = process.env.FIREBASE_PROJECT_ID || "irigasisawi-a28c1";
const useEmulator = process.env.FIREBASE_USE_EMULATOR === "true";

if (!projectId) throw new Error("FIREBASE_PROJECT_ID wajib diisi");

const app = initializeApp({
  projectId,
  ...(process.env.FIREBASE_SERVICE_ACCOUNT_JSON && {
    credential: cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    ),
  }),
});

if (useEmulator) {
  const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (authEmulatorHost) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = authEmulatorHost;
  }
  if (firestoreEmulatorHost) {
    process.env.FIRESTORE_EMULATOR_HOST = firestoreEmulatorHost;
  }
}

const db = getFirestore(app);
const auth = getAuth(app);

// ============================================================
// Helpers
// ============================================================

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(kodePerangkat: string): string {
  // Format: {kodePerangkat}.{32-byte-base64url}
  const randomBytes = Buffer.from(
    Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
  );
  const randomBase64Url = randomBytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `${kodePerangkat}.${randomBase64Url}`;
}

function nowUtc(): Timestamp {
  return Timestamp.now();
}

// ============================================================
// Main
// ============================================================

async function seedDemo() {
  console.log("📊 Seed data demo GREENFLOW dimulai...\n");

  // 1. Ambil atau buat user admin & pengguna
  console.log("1️⃣  Memastikan pengguna ada...");
  const usersSnap = await db.collection("users").get();
  const users = usersSnap.docs.map((d) => ({
    uid: d.id,
    ...d.data(),
  })) as { uid: string; nama: string; email: string; peran: string }[];

  const admin = users.find((u) => u.peran === "admin");

  if (!admin) {
    console.error("❌ Tidak ada admin. Jalankan seed:admin terlebih dahulu.");
    process.exit(1);
  }

  console.log(`   ✓ Admin: ${admin.nama} (${admin.email})`);

  // Cek atau buat user pengguna (budi@example.com)
  let pengguna = users.find((u) => u.peran === "pengguna");
  const budiEmail = "budi@example.com";
  const budiPassword = "baru12345";

  if (!pengguna || pengguna.email !== budiEmail) {
    console.log("   → Membuat akun pengguna demo...");
    try {
      // Cek apakah user sudah ada di Firebase Auth
      let budiUser;
      try {
        budiUser = await auth.getUserByEmail(budiEmail);
        console.log(`   ✓ User Firebase Auth ada: ${budiEmail}`);
      } catch (err: any) {
        if (err.code === "auth/user-not-found") {
          // Buat user baru di Firebase Auth
          budiUser = await auth.createUser({
            email: budiEmail,
            password: budiPassword,
            displayName: "Budi Santoso",
          });
          console.log(`   ✓ User Firebase Auth dibuat: ${budiEmail}`);
        } else {
          throw err;
        }
      }

      // Buat/update dokumen pengguna di Firestore
      await db.collection("users").doc(budiUser.uid).set({
        uid: budiUser.uid,
        nama: "Budi Santoso",
        email: budiEmail,
        peran: "pengguna",
        status: "aktif",
        dibuatPada: nowUtc(),
        diperbaruiPada: nowUtc(),
        terakhirMasukPada: null,
        dinonaktifkanPada: null,
        dinonaktifkanOleh: null,
        versiSkema: 1,
      });
      console.log(`   ✓ Pengguna Firestore dibuat: ${budiEmail}`);

      pengguna = {
        uid: budiUser.uid,
        nama: "Budi Santoso",
        email: budiEmail,
        peran: "pengguna",
      };
    } catch (err: any) {
      console.error(`   ❌ Gagal membuat pengguna: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.log(`   ✓ Pengguna: ${pengguna.nama} (${pengguna.email})`);
  }

  // 2. Buat 1 lahan demo
  console.log("\n2️⃣  Membuat lahan demo...");
  
  const lahanId = "lh-demo-01";
  await db.collection("lahan").doc(lahanId).set({
    nama: "Lahan Sayuran Demo",
    lokasi: "Parepare, Sulawesi Selatan",
    luasM2: 100,
    status: "aktif",
    parameter: {
      ambangKering: 30,
      titikTengah: 55,
      ambangCukup: 80,
      maxDurationSec: 20,
      intervalSec: 300,
      fuzzy: {
        keringSec: 20,
        lembapSec: 5,
        basahSec: 0,
      },
      diperbaruiPada: nowUtc(),
    },
    dibuatPada: nowUtc(),
    diperbaruiPada: nowUtc(),
    dibuatOleh: admin.uid,
    diperbaruiOleh: admin.uid,
  });
  console.log(`   ✓ Lahan: ${lahanId}`);

  // 3. Buat perangkat untuk setiap lahan
  console.log("\n3️⃣  Membuat perangkat...");

  const deviceConfigs = [
    {
      lahanId: "lh-demo-01",
      perangkat: [
        {
          id: "gf-01",
          nama: "ESP32 Lahan Sayuran",
          tipe: "pengendali" as const,
          moisture: 48,
        },
        {
          id: "sen-01",
          nama: "Sensor Kelembapan 1",
          tipe: "sensor" as const,
          parentId: "gf-01",
        },
        {
          id: "sen-02",
          nama: "Sensor Kelembapan 2",
          tipe: "sensor" as const,
          parentId: "gf-01",
        },
        {
          id: "sen-03",
          nama: "Sensor Kelembapan 3",
          tipe: "sensor" as const,
          parentId: "gf-01",
        },
        {
          id: "pmp-01",
          nama: "Pompa Utama",
          tipe: "pompa" as const,
          parentId: "gf-01",
        },
      ],
    },
  ];

  let token = "";
  for (const config of deviceConfigs) {
    for (const dev of config.perangkat) {
      if (dev.tipe === "pengendali") {
        const tk = generateToken(dev.id);
        const tkHash = hashToken(tk);
        const tkHint = tk.slice(-4);
        token = tk; // simpan token untuk lahan pertama

        await db.collection("devices").doc(dev.id).set({
          kodePerangkat: dev.id,
          nama: dev.nama,
          tipe: dev.tipe,
          indukId: null,
          lahanId: config.lahanId,
          status: "aktif",
          mode: "otomatis",
          tokenHash: tkHash,
          tokenHint: tkHint,
          tokenDibuatPada: nowUtc(),
          tokenDiputarPada: null,
          statusTerakhir: {
            readAt: Timestamp.fromDate(
              new Date(Date.now() - Math.random() * 60000)
            ),
            receivedAt: Timestamp.fromDate(
              new Date(Date.now() - Math.random() * 30000)
            ),
            moisturePct: dev.moisture || 50,
            adcRaw: Math.round((dev.moisture || 50) * 40.96),
            pumpState: (dev.moisture || 50) < 35 ? "ON" : "OFF",
            sensorFault: false,
            online: Math.random() > 0.2, // 80% online
            lastSeenAt: Timestamp.fromDate(
              new Date(Date.now() - Math.random() * 30000)
            ),
            intervalSec: 300,
            flags: {
              kering: (dev.moisture || 50) < 30,
              tandonRendah: false,
              hujan: false,
              sensorFault: false,
            },
            rssi: Math.round(-90 + Math.random() * 30),
            seq: Math.floor(Math.random() * 100),
          },
          versiFirmware: "1.0.0",
          dibuatPada: nowUtc(),
          diperbaruiPada: nowUtc(),
          dibuatOleh: admin.uid,
        });
        console.log(
          `   ✓ Pengendali: ${dev.id} (token: ${tk.slice(0, 20)}...)`
        );
      } else if (dev.tipe === "sensor") {
        await db.collection("devices").doc(dev.id).set({
          kodePerangkat: dev.id,
          nama: dev.nama,
          tipe: dev.tipe,
          indukId: dev.parentId,
          lahanId: config.lahanId,
          status: "aktif",
          kalibrasi: {
            adcKering: 3500,
            adcBasah: 1500,
            diperbaruiPada: nowUtc(),
          },
          dibuatPada: nowUtc(),
          diperbaruiPada: nowUtc(),
          dibuatOleh: admin.uid,
        });
        console.log(`   ✓ Sensor: ${dev.id}`);
      } else if (dev.tipe === "pompa") {
        await db.collection("devices").doc(dev.id).set({
          kodePerangkat: dev.id,
          nama: dev.nama,
          tipe: dev.tipe,
          indukId: dev.parentId,
          lahanId: config.lahanId,
          status: "aktif",
          dibuatPada: nowUtc(),
          diperbaruiPada: nowUtc(),
          dibuatOleh: admin.uid,
        });
        console.log(`   ✓ Pompa: ${dev.id}`);
      }
    }
  }

  // 4. Buat readings (telemetri) untuk semua perangkat
  console.log("\n4️⃣  Membuat telemetri (readings)...");

  const now = Date.now();
  let totalReadings = 0;

  // Readings untuk setiap pengendali
  const readingTemplates = [
    {
      time: now - 30 * 60 * 1000,
      moisture: 25,
      pumpState: "ON" as const,
      label: "KERING",
    },
    {
      time: now - 24 * 60 * 1000,
      moisture: 32,
      pumpState: "ON" as const,
      label: "LEMBAP",
    },
    {
      time: now - 18 * 60 * 1000,
      moisture: 48,
      pumpState: "OFF" as const,
      label: "LEMBAP",
    },
    {
      time: now - 12 * 60 * 1000,
      moisture: 55,
      pumpState: "OFF" as const,
      label: "LEMBAP",
    },
    {
      time: now - 6 * 60 * 1000,
      moisture: 62,
      pumpState: "OFF" as const,
      label: "BASAH",
    },
    {
      time: now - 30 * 1000,
      moisture: 48,
      pumpState: "OFF" as const,
      label: "LEMBAP",
    },
  ];

  for (const config of deviceConfigs) {
    const pengendaliId = config.perangkat.find(
      (p) => p.tipe === "pengendali"
    )?.id;
    if (!pengendaliId) continue;

    for (let i = 0; i < readingTemplates.length; i++) {
      const r = readingTemplates[i]!;
      // Variasi moisture untuk setiap lahan
      const moistureVariation = Math.random() * 10 - 5;
      const adjustedMoisture = Math.max(0, Math.min(100, r.moisture + moistureVariation));

      const deviceReadAtTs = Timestamp.fromDate(new Date(r.time));
      const deviceReadAtStr = deviceReadAtTs.toDate().toISOString();
      const readingId = `${pengendaliId}_${deviceReadAtStr.replace(/[^\dT]/g, "")}Z`;

      // Hitung fuzzy membership
      const amK = 30,
        amT = 45,
        amC = 60;
      let muKering = 0,
        muLembap = 0,
        muBasah = 0,
        rawSec = 0;

      if (adjustedMoisture <= amK) {
        muKering = 1;
        rawSec = 20;
      } else if (adjustedMoisture < amT) {
        muKering = (amT - adjustedMoisture) / (amT - amK);
        muLembap = (adjustedMoisture - amK) / (amT - amK);
        rawSec = 20 * muKering + 5 * muLembap;
      } else if (adjustedMoisture <= amC) {
        muLembap = (amC - adjustedMoisture) / (amC - amT);
        muBasah = (adjustedMoisture - amT) / (amC - amT);
        rawSec = 5 * muLembap;
      } else {
        muBasah = 1;
        rawSec = 0;
      }

      const durationSec = Math.round(rawSec);

      await db.collection("readings").doc(readingId).set({
        perangkatId: pengendaliId,
        lahanId: config.lahanId,
        deviceReadAt: deviceReadAtTs,
        readAt: deviceReadAtTs,
        receivedAt: Timestamp.fromDate(new Date(r.time + 2000)),
        seq: i + 1,
        moisture: Math.round(adjustedMoisture * 10) / 10, // Standardized field name (not moisturePct)
        adcRaw: Math.round(
          3500 - ((adjustedMoisture / 100) * (3500 - 1500))
        ),
        pumpState:
          adjustedMoisture < amK
            ? "ON"
            : adjustedMoisture > amC
              ? "OFF"
              : r.pumpState,
        optional: null,
        fw: "1.0.0",
        rssi: -65 - Math.random() * 15,
        clockSkew: false,
        sensorFault: false,
        fuzzy: {
          muKering: Math.round(muKering * 1000) / 1000,
          muLembap: Math.round(muLembap * 1000) / 1000,
          muBasah: Math.round(muBasah * 1000) / 1000,
          label: r.label,
          rawSec: Math.round(rawSec * 100) / 100,
          durationSec,
        },
        commandId: null,
        expireAt: Timestamp.fromDate(
          new Date(now + 90 * 24 * 60 * 60 * 1000)
        ),
      });
      totalReadings++;
    }
  }
  console.log(`   ✓ ${totalReadings} telemetri dibuat`);

  // 5. Buat waterings (riwayat penyiraman) untuk semua lahan
  console.log("\n5️⃣  Membuat riwayat penyiraman...");

  let totalWaterings = 0;

  for (const config of deviceConfigs) {
    const pengendaliId = config.perangkat.find(
      (p) => p.tipe === "pengendali"
    )?.id;
    if (!pengendaliId) continue;

    // Buat 4-5 watering events per lahan
    const wateringEvents = [
      {
        startTime: now - 4 * 60 * 60 * 1000, // 4 jam lalu
        duration: 15,
        triggered: "otomatis" as const,
        moistureBefore: 28,
        moistureAfter: 40,
      },
      {
        startTime: now - 3 * 60 * 60 * 1000, // 3 jam lalu
        duration: 12,
        triggered: "otomatis" as const,
        moistureBefore: 32,
        moistureAfter: 45,
      },
      {
        startTime: now - 2 * 60 * 60 * 1000, // 2 jam lalu
        duration: 18,
        triggered: "otomatis" as const,
        moistureBefore: 25,
        moistureAfter: 38,
      },
      {
        startTime: now - 1 * 60 * 60 * 1000, // 1 jam lalu
        duration: 10,
        triggered: "manual" as const,
        moistureBefore: 45,
        moistureAfter: 52,
      },
      {
        startTime: now - 30 * 60 * 1000, // 30 menit lalu
        duration: 20,
        triggered: "otomatis" as const,
        moistureBefore: 20,
        moistureAfter: 35,
      },
    ];

    for (let i = 0; i < wateringEvents.length; i++) {
      const w = wateringEvents[i]!;
      const wId = `wtr-${pengendaliId}-${Date.now()}-${i}`;
      const endTime = w.startTime + w.duration * 1000;

      await db.collection("waterings").doc(wId).set({
        lahanId: config.lahanId,
        perangkatId: pengendaliId,
        commandId: null,
        pemicu: w.triggered,
        dimintaOleh: w.triggered === "manual" ? admin.uid : null,
        namaDimintaOleh:
          w.triggered === "manual" ? admin.nama : null,
        startedAt: Timestamp.fromDate(new Date(w.startTime)),
        endedAt: Timestamp.fromDate(new Date(endTime)),
        durationSec: w.duration,
        moistureBeforePct: w.moistureBefore,
        moistureAfterPct: w.moistureAfter,
        status: "selesai",
        fuzzy: {
          keringSec: 20,
          lembapSec: 5,
          basahSec: 0,
        },
        dibuatPada: Timestamp.fromDate(new Date(endTime)),
      });
      totalWaterings++;
    }
  }
  console.log(`   ✓ ${totalWaterings} riwayat penyiraman dibuat`);

  // 6. Buat parameter untuk setiap lahan
  console.log("\n6️⃣  Membuat parameter lahan...");
  for (const config of deviceConfigs) {
    await db.collection("parameter").doc(config.lahanId).set({
      lahanId: config.lahanId,
      keringSec: 60,
      lembapSec: 120,
      basahSec: 180,
      ambangKering: 30,
      titikTengah: 45,
      ambangCukup: 60,
      dibuatPada: nowUtc(),
      diperbaruiPada: nowUtc(),
      diperbaruiOleh: admin.uid,
      versiSkema: 1,
    });
    console.log(`   ✓ Parameter untuk ${config.lahanId}`);
  }

  // 7. Buat kalibrasi untuk setiap sensor
  console.log("\n7️⃣  Membuat kalibrasi sensor...");
  
  // Get all devices and create kalibrasi for sensors
  const devicesSnap = await db.collection("devices").get();
  let kalibrasiCount = 0;
  
  for (const deviceDoc of devicesSnap.docs) {
    const device = deviceDoc.data() as any;
    const deviceId = deviceDoc.id;
    
    // Only create kalibrasi for sensors
    if (device.tipe === "sensor") {
      const existingKalibrasi = await db.collection("kalibrasi").doc(deviceId).get();
      
      if (!existingKalibrasi.exists) {
        // Create default kalibrasi for this sensor
        await db.collection("kalibrasi").doc(deviceId).set({
          deviceId: deviceId,
          lahanId: device.lahanId,
          adcKering: 3500,
          adcBasah: 1500,
          dibuatPada: nowUtc(),
          diperbaruiPada: nowUtc(),
          diperbaruiOleh: admin.uid,
          versiSkema: 1,
        });
        console.log(`   ✓ Kalibrasi untuk ${deviceId}`);
        kalibrasiCount++;
      }
    }
  }
  
  if (kalibrasiCount === 0) {
    console.log("   (Semua sensor sudah memiliki kalibrasi)");
  }

  // 8. Buat notifikasi sampel
  console.log("\n8️⃣  Membuat notifikasi sampel...");
  const notificationSamples = [
    // Kering Soil - Warnings & Info
    {
      tipe: "kering_soil" as const,
      lahanId: "lh-demo-01",
      perangkatId: "sen-01",
      pesan: "Kelembapan tanah di Lahan Sawi turun 45%, penyiraman otomatis akan segera dimulai",
      severity: "warning" as const,
      time: now - 2 * 60 * 60 * 1000,
      baca: false,
    },
    {
      tipe: "kering_soil" as const,
      lahanId: "lh-demo-02",
      perangkatId: "sen-02",
      pesan: "Kelembapan tanah optimal, tetap dalam kondisi ideal",
      severity: "info" as const,
      time: now - 100 * 60 * 1000,
      baca: true,
    },
    {
      tipe: "kering_soil" as const,
      lahanId: "lh-demo-03",
      perangkatId: "sen-03",
      pesan: "Kelembapan tanah mencapai level kritis 35%, penyiraman prioritas tinggi",
      severity: "error" as const,
      time: now - 85 * 60 * 1000,
      baca: false,
    },

    // Pump Failure - Errors & Warnings
    {
      tipe: "pump_failure" as const,
      lahanId: "lh-demo-03",
      perangkatId: "pmp-03",
      pesan: "Pompa penyiram pada Lahan Kapri tidak merespon perintah. Gagal mengirim sinyal kontrol ke perangkat",
      severity: "error" as const,
      time: now - 90 * 60 * 1000,
      baca: false,
    },
    {
      tipe: "pump_failure" as const,
      lahanId: "lh-demo-01",
      perangkatId: "pmp-01",
      pesan: "Tekanan pompa lebih rendah dari normal. Periksa kondisi fisik pompa",
      severity: "warning" as const,
      time: now - 60 * 60 * 1000,
      baca: true,
    },
    {
      tipe: "pump_failure" as const,
      lahanId: "lh-demo-02",
      perangkatId: "pmp-02",
      pesan: "Pompa beroperasi normal, semua parameter dalam kondisi optimal",
      severity: "info" as const,
      time: now - 45 * 60 * 1000,
      baca: true,
    },

    // Sensor Error - Critical & Warnings
    {
      tipe: "sensor_error" as const,
      lahanId: "lh-demo-02",
      perangkatId: "sen-02",
      pesan: "Sensor kelembapan mengalami gangguan komunikasi. Data tidak valid selama 5 menit terakhir",
      severity: "error" as const,
      time: now - 90 * 60 * 1000,
      baca: false,
    },
    {
      tipe: "sensor_error" as const,
      lahanId: "lh-demo-01",
      perangkatId: "sen-01",
      pesan: "Kalibrasi sensor kelembapan direkomendasikan untuk akurasi optimal",
      severity: "warning" as const,
      time: now - 50 * 60 * 1000,
      baca: true,
    },
    {
      tipe: "sensor_error" as const,
      lahanId: "lh-demo-03",
      perangkatId: "sen-03",
      pesan: "Pembacaan sensor suhu kembali normal setelah gangguan singkat",
      severity: "info" as const,
      time: now - 35 * 60 * 1000,
      baca: true,
    },

    // Manual Trigger - Info & Warnings
    {
      tipe: "manual_trigger" as const,
      lahanId: "lh-demo-01",
      perangkatId: "gf-01",
      pesan: "Penyiraman manual dimulai oleh admin (Durasi: 10 menit)",
      severity: "info" as const,
      time: now - 30 * 60 * 1000,
      baca: false,
    },
    {
      tipe: "manual_trigger" as const,
      lahanId: "lh-demo-02",
      perangkatId: "gf-02",
      pesan: "Penyiraman manual dihentikan lebih awal oleh user",
      severity: "warning" as const,
      time: now - 25 * 60 * 1000,
      baca: true,
    },
    {
      tipe: "manual_trigger" as const,
      lahanId: "lh-demo-03",
      perangkatId: "gf-03",
      pesan: "Parameter penyiraman diubah: Threshold 50% → 45%",
      severity: "info" as const,
      time: now - 20 * 60 * 1000,
      baca: true,
    },

    // System Alert - Info & Warnings
    {
      tipe: "system_alert" as const,
      lahanId: "lh-demo-02",
      perangkatId: "gf-02",
      pesan: "Firmware v2.3.1 tersedia untuk perangkat pengendali. Update direkomendasikan",
      severity: "info" as const,
      time: now - 15 * 60 * 1000,
      baca: false,
    },
    {
      tipe: "system_alert" as const,
      lahanId: "lh-demo-01",
      perangkatId: "gf-01",
      pesan: "Koneksi WiFi perangkat hilang. Perangkat akan reconnect otomatis",
      severity: "warning" as const,
      time: now - 12 * 60 * 1000,
      baca: false,
    },
    {
      tipe: "system_alert" as const,
      lahanId: "lh-demo-03",
      perangkatId: "gf-03",
      pesan: "Backup konfigurasi selesai. Data tersimpan dengan aman di cloud",
      severity: "info" as const,
      time: now - 8 * 60 * 1000,
      baca: true,
    },
    {
      tipe: "system_alert" as const,
      lahanId: "lh-demo-01",
      perangkatId: "gf-01",
      pesan: "Penyimpanan lokal 85% penuh. Pertahankan log hanya untuk 7 hari terakhir",
      severity: "warning" as const,
      time: now - 5 * 60 * 1000,
      baca: false,
    },
    {
      tipe: "system_alert" as const,
      lahanId: "lh-demo-02",
      perangkatId: "gf-02",
      pesan: "Pemeliharaan sistem terjadwal. Tidak ada gangguan pada layanan",
      severity: "info" as const,
      time: now - 2 * 60 * 1000,
      baca: true,
    },
  ];

  let totalNotifications = 0;
  for (const notif of notificationSamples) {
    await db.collection("notifikasi").add({
      tipe: notif.tipe,
      lahanId: notif.lahanId,
      perangkatId: notif.perangkatId,
      pesan: notif.pesan,
      severity: notif.severity,
      baca: notif.baca,
      dibuatPada: Timestamp.fromDate(new Date(notif.time)),
      versiSkema: 1,
    });
    totalNotifications++;
  }
  console.log(`   ✓ ${totalNotifications} notifikasi dibuat`);

  // 6. Info akses
  console.log("\n✅ Seed data demo selesai!\n");
  console.log("🔐 Data akses:");
  console.log(`   Lahan ID: lh-demo-01, lh-demo-02, lh-demo-03`);
  console.log(`   Pengendali: gf-01, gf-02, gf-03`);
  console.log(`   Token (SIMPAN INI): ${token}`);
  console.log(`\n💻 URL Dashboard: http://localhost:5173`);
  console.log(`   Login dengan: ${pengguna?.email || admin.email}`);
  console.log(`\n📊 Data yang dibuat:`);
  console.log(`   • 3 lahan dengan berbagai ukuran`);
  console.log(`   • 9 perangkat (3 pengendali, 3 sensor, 3 pompa)`);
  console.log(`   • ${totalReadings} telemetri readings`);
  console.log(`   • ${totalWaterings} riwayat penyiraman`);
  console.log(`   • 3 parameter lahan`);
  console.log(`   • 3 kalibrasi sensor`);
  console.log(`   • ${totalNotifications} notifikasi sampel`);
  console.log(`\n📡 Untuk kirim telemetri ESP32:`);
  console.log(`   POST http://localhost:3000/api/v1/telemetry`);
  console.log(`   Header: {"Authorization": "Bearer ${token}"}`);

  process.exit(0);
}

seedDemo().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
