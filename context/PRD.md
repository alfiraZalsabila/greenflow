# PRD — GREENFLOW Panel & Dashboard

> **Smart Irrigation untuk Tanaman Sawi** · Kelompok 20 TUMBUH
> **Versi:** 0.3 (disesuaikan dengan kode IoT v4) · **Tanggal:** 3 November 2026
> **Riwayat:** v0.1 draf awal → v0.2 register langsung aktif, Firebase Auth + Firestore via Express → **v0.3 mengikuti kode firmware ESP32 v4 (fuzzy 2 masukan di ESP32, Realtime Database sebagai kotak surat perangkat, 3 sensor tanah + DHT11)**
> **Sumber:** SRS GREENFLOW v1.0 (22 September 2025), kode IoT “Smart Irrigation Sawi v4”, dan keputusan tim
> **Konfirmasi tim (3 November 2026):** fuzzy dihitung di ESP32 (Q18), jalur data lewat Realtime Database dengan Express sebagai jembatan (Q19), tiga sensor tanah dengan rata-rata (Q20), sensor hujan/level/aliran dikeluarkan dari v1 (Q9)
> **Dokumen turunan:** `architecture.md` v0.2 dan `schema.md` v0.2 mengikuti PRD ini

---

## 1. Ringkasan

GREENFLOW adalah sistem penyiraman otomatis berbasis IoT untuk tanaman sawi. ESP32 membaca tiga sensor kelembapan tanah dan sensor suhu/kelembapan udara (DHT11), menghitung durasi siram dengan **Fuzzy Sugeno**, lalu menggerakkan pompa lewat relay. Datanya dikirim ke Firebase agar bisa dipantau dan dikontrol dari web.

PRD ini mencakup **web panel + dashboard + backend API (Express)**. Firmware dan rangkaian hardware dikerjakan tim IoT; PRD ini mendefinisikan **kontrak data** di antara keduanya (bagian 8) beserta perubahan kecil pada firmware yang dibutuhkan agar pengaturan dari web benar-benar berpengaruh.

**Satu kalimat produk:** panel web berbahasa Indonesia, berwarna hijau, tempat admin dan pengguna memantau kelembapan lahan sawi, mengontrol pompa, mengatur parameter, dan melihat riwayat penyiraman; admin ditambah kemampuan mengelola akun pengguna.

### 1.1 Masalah yang diselesaikan
| Masalah | Dampak |
|---|---|
| Penyiraman manual tidak sesuai kebutuhan air tanaman | Air boros / sawi stres kelembapan |
| Petani tidak punya data kelembapan & riwayat siram | Dinas Pertanian tidak punya bahan evaluasi |
| Pemantauan harus datang ke lahan | Ketergantungan tenaga manual |

### 1.2 Tujuan
1. Memantau kelembapan tanah, suhu udara, dan status pompa dari browser/ponsel dengan jeda singkat.
2. Mengontrol pompa jarak jauh (mode otomatis/manual, siram manual) dengan respons dalam hitungan detik.
3. Mencatat setiap penyiraman sebagai riwayat dan menyajikannya sebagai laporan.
4. Mengelola data master dan parameter (lahan, perangkat, ambang, fuzzy, kalibrasi) lewat panel yang sederhana.
5. Memisahkan peran dengan jelas: **admin** (+ kelola akun) dan **pengguna**.

### 1.3 Bukan tujuan (v1)
Sesuai batasan SRS 1.3 & 2.5: pemupukan, hama/penyakit, prakiraan cuaca, jual-beli hasil panen, tanaman selain sawi, aplikasi mobile native, dan lebih dari dua peran. Ditambah: sensor hujan, level tandon, dan aliran air (tidak ada di perangkat keras v4 — D12).

### 1.4 Indikator keberhasilan
| Indikator | Target |
|---|---|
| Data sensor tampil di dashboard setelah ESP32 mengirim | ≤ 15 detik (kirim tiap 5 detik + polling dashboard 10 detik) |
| Perintah kontrol (siram/mode) sampai dieksekusi ESP32 | ≤ 10 detik dalam kondisi Wi-Fi normal |
| Hasil **pratinjau fuzzy di web** sama dengan keluaran `fuzzy_detik` firmware pada kasus uji (bagian 7.5) | 100% |
| Pengguna non-teknis menyelesaikan “cek kondisi lahan” | ≤ 3 klik dari halaman masuk |
| Akses halaman/endpoint di luar hak akses | 100% ditolak server |

---

## 2. Keputusan Tim & Penyesuaian terhadap SRS

Pembacaan SRS dan kode IoT menemukan hal yang **bertentangan** atau **berasal dari proyek lain**. Tabel ini adalah keputusan yang dipakai PRD. **Mohon dikoreksi bila ada yang tidak sesuai.**

| # | Temuan | Keputusan di PRD | Alasan |
|---|---|---|---|
| D1 | Bab 4 SRS (FR-01…FR-30), sebagian NFR, `image6`, dan istilah *Developer / Operator / Masyarakat / Perumahan / RTH / PostGIS* berasal dari **proyek portal perumahan (SIPERKIM/DISPERKIMTAN)** | Bab 4 SRS **tidak dipakai**; kebutuhan ditulis ulang dari use case GREENFLOW (UC-01…UC-13), Bab 2.2, Bab 3, dan kode IoT | Tidak relevan dengan sawi/irigasi. **Disarankan SRS Bab 4 diperbaiki** |
| D2 | SRS menulis **Mamdani** di beberapa tempat dan **Sugeno** di tempat lain; kode IoT memakai **Sugeno orde nol dengan 2 masukan** (tanah × suhu) | Pakai **Fuzzy Sugeno sesuai kode IoT** (bagian 7). Satu masukan 20/5/0 detik milik SRS **tidak dipakai** | Kode IoT adalah implementasi nyata |
| D3 | SRS: PostgreSQL; kode IoT: **Firebase Realtime Database** | **Firebase** dipakai dua cara: **Firestore** (data aplikasi) + **Realtime Database** (kotak surat perangkat) + **Firebase Auth** (identitas). Frontend tidak pernah mengakses Firebase langsung | Keputusan tim (Q2) + kode IoT |
| D4 | SRS: React/Next.js + Node/Laravel | **React + Vite + Tailwind CSS** (frontend), **Express.js** (backend) | Keputusan tim |
| D5 | SRS: tidak ada registrasi, akun dibuat admin | **Login dan Register.** Register publik **langsung aktif** dan selalu berperan **pengguna**; peran admin hanya dari admin lain / seed awal. Admin dapat menonaktifkan akun | Keputusan tim (Q1) |
| D6 | SRS: hanya admin boleh mengubah perangkat/parameter; use case admin vs pengguna berbeda | **Kedua peran punya fitur yang sama; satu-satunya perbedaan: Kelola Akun Pengguna hanya admin** | Permintaan tim |
| D7 | SRS: dashboard admin dan pengguna terpisah | **Satu dashboard** untuk kedua peran | Konsekuensi D6 |
| D8 | SRS: warna utama hijau `#2E7D32` | **Hijau** sebagai warna primer (token `brand-*` TailAdmin diganti ke skala hijau) | SRS 3.1 + arahan tim |
| D9 | NFR-10: logo Pemkot Parepare/DISPERKIMTAN | **Ditunda** — DISPERKIMTAN adalah instansi proyek lain | Pertanyaan Q4 |
| D10 | UC-13 “Backup data” | Dalam aplikasi: **Ekspor data (CSV/XLSX)**; backup basis data = konfigurasi Firebase | Backup penuh bukan tombol web |
| D11 ✅ | SRS 2.1/3.2: **server** menghitung fuzzy dan relay tetap mati bila tak ada keputusan server; kode IoT: **ESP32 menghitung fuzzy sendiri** dan tetap menyiram saat internet putus | **ESP32 menghitung fuzzy dan menegakkan semua pengaman** (durasi maks, cooldown). Server hanya menyimpan, menampilkan, mengirim perintah manual, dan menyediakan **pratinjau fuzzy** | Perangkat sudah bekerja mandiri dan lebih tahan gangguan internet. Menyimpang dari SRS 3.2 |
| D12 | SRS Tabel 3.6–3.7 mencantumkan sensor hujan, level tandon, aliran, solenoid, ESP32 DevKit + 1 sensor tanah; kode IoT hanya memiliki **3 sensor tanah, DHT11, RTC DS1307, LCD I2C, buzzer, relay 1 kanal** | PRD mengikuti **perangkat keras kode IoT**. Sensor hujan/level/aliran **dikeluarkan dari v1**; notifikasi “air tandon rendah” **dihapus** | Tidak ada di hardware nyata |
| D13 ✅ | SRS SI-01…03: ESP32 `POST` ke server HTTPS dengan token perangkat; kode IoT menulis/membaca **Realtime Database lewat REST** | **Realtime Database dipakai sebagai kotak surat perangkat**; **Express adalah jembatan**: membaca status, menyalin riwayat ke Firestore, menulis perintah `/kontrol` dan konfigurasi `/config`. Token perangkat SRS **tidak dipakai** | Firmware hampir tidak berubah; kontrol cepat (poll 2 detik) |
| D14 | SRS/PRD v0.2: label Kering / Lembap / Basah, ambang 30/45/60; kode IoT: **KERING < 30, NORMAL 30–78, BASAH > 78** | Label tampilan: **Kering / Normal / Basah** (+ **Sensor lepas**), ambang bawaan **30 dan 78**. Nilai 30/45/60 (simulasi, Q6) **dicabut** | Mengikuti data lapangan tim IoT |

---

## 3. Aktor & Hak Akses

Hanya dua peran (batasan SRS). Satu basis data bersama.

| Kemampuan | Admin | Pengguna |
|---|:-:|:-:|
| Register / Login / Logout / Ubah profil & kata sandi | ✅ | ✅ |
| Dashboard (kelembapan, suhu, status pompa, grafik, penyiraman terakhir) | ✅ | ✅ |
| Riwayat penyiraman + filter tanggal | ✅ | ✅ |
| Notifikasi | ✅ | ✅ |
| Kelola lahan dan perangkat | ✅ | ✅ |
| Atur parameter penyiraman & parameter Fuzzy Sugeno | ✅ | ✅ |
| Kalibrasi sensor tanah | ✅ | ✅ |
| Pilih mode (Otomatis / Manual), siram manual, matikan pompa, reset cooldown | ✅ | ✅ |
| Laporan & ekspor data | ✅ | ✅ |
| **Kelola akun pengguna** (tambah, ubah, nonaktifkan, hapus, ubah peran, reset kata sandi) | ✅ | ❌ |

**Aturan:** penegakan hak akses dilakukan **di server** (Express), bukan hanya menyembunyikan menu (SRS 3.1, pesan E-03).

---

## 4. Persona

| | Admin | Pengguna |
|---|---|---|
| Siapa | Staf Dinas Pertanian / petugas teknis | Petani / pengelola lahan sawi |
| Keahlian | Paham web & konsep dasar IoT | Cukup bisa memakai browser atau ponsel |
| Pola pakai | Sering (konfigurasi & pengecekan) | Harian (cek lahan) |
| Kebutuhan utama | Mengelola akun, perangkat, parameter; memastikan sistem sehat | Tahu “tanah kering atau tidak, pompa nyala atau tidak, kapan terakhir disiram” |
| Perangkat | Laptop/desktop (1366×768) | Ponsel (≥ 360 px) |

---

## 5. Kebutuhan Fungsional

Prioritas: **M** = Must · **S** = Should · **C** = Could. *UC* = rujukan use case SRS. Butir bertanda 🔧 **bergantung pada perubahan firmware** (bagian 8.4).

### 5.1 Autentikasi & Akun
| ID | Kebutuhan | UC | Prio |
|---|---|---|:-:|
| FR-01 | **Register**: nama, email, kata sandi (+ konfirmasi). Akun baru berperan *pengguna* dan langsung aktif. Email unik | — (D5) | M |
| FR-02 | **Login** email + kata sandi; setelah berhasil ke dashboard; sesi berakhir otomatis (E-04) | UC-01 | M |
| FR-03 | **Logout** dari header setiap halaman | UC-01 | M |
| FR-04 | Lupa/reset kata sandi lewat email | — | S |
| FR-05 | Profil: ubah nama, ganti kata sandi (verifikasi sandi lama) | — | S |
| FR-06 | **Kelola akun pengguna (admin saja)**: daftar + cari, tambah, ubah (nama, peran), nonaktifkan/aktifkan, hapus (konfirmasi), picu reset sandi. Admin terakhir tidak boleh dihapus/diturunkan | UC-09 | M |
| FR-07 | Akun nonaktif tidak bisa login dan sesinya dicabut | — | M |

**Kriteria penerimaan:** register dengan email terdaftar menampilkan pesan jelas; sandi minimal 8 karakter; pengguna yang memanggil endpoint `/users` mendapat 403 dan UI menampilkan E-03; hapus akun selalu meminta konfirmasi.

### 5.2 Dashboard & Pemantauan
| ID | Kebutuhan | UC | Prio |
|---|---|---|:-:|
| FR-10 | Kartu **kelembapan tanah**: persen rata-rata (besar) + label **Kering / Normal / Basah / Sensor lepas** + warna; rincian **tiga sensor** (S1–S3: persen dan nilai mentah) | UC-02 | M |
| FR-11 | Kartu **status pompa** (“Menyala” / “Mati”), **mode** (Otomatis/Manual), dan **sisa cooldown** (detik) | UC-02 | M |
| FR-12 | Kartu **penyiraman terakhir** (waktu, durasi) dan **status perangkat** (online/offline, kekuatan Wi-Fi, lama menyala) | UC-02 | M |
| FR-13 | **Grafik garis** kelembapan rata-rata (hari ini; dapat diganti 7 hari) dengan **garis ambang batas**; sumber data = sampel yang disimpan server (firmware tidak menyimpan riwayat kelembapan) | UC-02 | M |
| FR-14 | Pembaruan otomatis tanpa muat ulang; tampilkan “terakhir diperbarui” dan peringatan E-05 bila status basi | UC-02 | M |
| FR-15 | Ringkasan semua lahan (jumlah perangkat online, lahan kering, aktivitas terbaru) | UC-02 | S |
| FR-16 | Kartu **udara** (suhu °C, kelembapan %, indikator DHT ok/error) dan **rekomendasi durasi fuzzy saat ini** (`fuzzy_detik`) | UC-02 | M |

Warna label: **Kering = merah, Normal = hijau, Basah = biru**; label teks **selalu** ditampilkan (SRS 3.1). Status “mulai kering/kuning” dari SRS tidak ada di firmware — lihat Q21.

### 5.3 Kontrol Penyiraman
| ID | Kebutuhan | UC | Prio |
|---|---|---|:-:|
| FR-20 | Pilih **mode** Otomatis atau Manual untuk perangkat | UC-05 | M |
| FR-21 | **Siram manual**: pilih durasi 1 s sampai **batas manual** (bawaan 15 s) lalu “Siram”; tombol “Matikan pompa” untuk berhenti; pelaku tercatat di riwayat (sebaik mungkin) | UC-06 | M |
| FR-22 | Siram manual **diblokir** bila perangkat offline atau pompa sedang menyala, dengan pesan jelas | UC-06 | S |
| FR-23 | Umpan balik: “menunggu perangkat → dijalankan” (berdasar status pompa / pengakuan perintah 🔧) dalam ≤ 10 detik; perintah memakai `id` yang naik secara atomik | UC-06 | M |
| FR-24 | **Reset cooldown** (hapus jeda antar siram otomatis), tercatat di audit | — | S |

### 5.4 Riwayat & Laporan
| ID | Kebutuhan | UC | Prio |
|---|---|---|:-:|
| FR-30 | **Riwayat penyiraman**: waktu mulai, durasi, pemicu (otomatis/manual), kelembapan tanah awal, suhu, alasan berhenti (“durasi selesai”, “perintah off”, “beralih ke auto”), pelaku bila manual; urut terbaru; 10 baris/halaman; **filter rentang tanggal** (+ lahan). *Kelembapan sesudah siram tidak tersedia dari firmware* | UC-03 | M |
| FR-31 | **Laporan ringkas**: total siram, total durasi, rata-rata kelembapan dan suhu per rentang tanggal | UC-12 | S |
| FR-32 | **Ekspor** riwayat/laporan/sampel ke CSV dan XLSX | UC-12, UC-13 (D10) | S |

### 5.5 Notifikasi
| ID | Kebutuhan | UC | Prio |
|---|---|---|:-:|
| FR-40 | Notifikasi **di dalam aplikasi** (lonceng di header, badge belum dibaca, tandai dibaca) untuk: **tanah kering**, **sensor bermasalah** (sensor tanah lepas / DHT error), **perangkat offline**. Aturan “tanah kering” mengikuti histeresis firmware: aktif saat rata-rata < 30%, pulih saat > 35% | UC-04 | M |
| FR-41 | Tidak ada notifikasi berulang untuk kondisi yang sama selama belum pulih | UC-04 | M |
| FR-42 | Notifikasi lewat email/WhatsApp | UC-04 | C (di luar v1) |

### 5.6 Data Master & Parameter
| ID | Kebutuhan | UC | Prio |
|---|---|---|:-:|
| FR-50 | **Kelola lahan**: nama, lokasi/alamat, luas (opsional), status; tambah/ubah/hapus | UC-10 | M |
| FR-51 | **Kelola perangkat**: kode unik, nama, lahan, status. Satu perangkat = satu ESP32 beserta 3 sensor tanah, DHT11, dan pompa | UC-10 | M |
| FR-52 | **Identitas & koneksi perangkat**: tiap perangkat memiliki jalur data `/irigasi/{kode}`; panel menampilkan jalur itu, “terakhir terlihat”, dan versi firmware bila ada. Rahasia/kredensial **tidak** ditampilkan (D13) | UC-10 | M |
| FR-53 | Hapus data yang masih dipakai ditolak dengan pesan E-08 (mis. perangkat yang sudah punya riwayat → sarankan *noncaktifkan*) | UC-10 | M |
| FR-54 🔧 | **Parameter penyiraman per perangkat**: ambang kering (30), ambang basah (78), durasi maks otomatis (10 s), durasi maks manual (15 s), cooldown (300 s). Validasi E-07. Disimpan di Firestore dan disalin ke `/config` agar dibaca ESP32 | UC-07 | M |
| FR-55 🔧 | **Parameter Fuzzy Sugeno**: titik trapesium himpunan tanah dan suhu, tabel keluaran 3×3 (detik); *Kembalikan ke bawaan firmware v4*; **pratinjau** (tanah, suhu) → durasi | UC-08 | M |
| FR-56 🔧 | **Kalibrasi sensor tanah** per sensor (S1–S3): nilai mentah *kering* dan *basah*; tombol “Gunakan nilai sekarang” mengambil nilai langsung dari status; validasi kering > basah; riwayat kalibrasi; disalin ke `/config` | UC-11 | S |

### 5.7 Pendukung
| ID | Kebutuhan | Prio |
|---|---|:-:|
| FR-60 | Halaman **Bantuan** singkat (ikon `?` di menu) | S |
| FR-61 | **Log aktivitas** (audit) untuk aksi penting: kelola akun, ubah parameter, siram manual, reset cooldown | S |
| FR-62 | Mode terang & gelap (bawaan TailAdmin) | C |

---

## 6. Alur Utama

**A. Alur data otomatis (ESP32 mandiri)**
1. ESP32 membaca sensor tiap 2 detik, menghitung rata-rata tanah dan `fuzzy_detik`.
2. Bila mode Otomatis, pompa mati, cooldown 0, dan durasi ≥ 1 s → relay menyala (maks 10 s) lalu mati; entri dikirim ke `/riwayat`.
3. ESP32 menimpa `/status` tiap 5 detik.
4. Express (pendengar) menerima perubahan `/status` → memperbarui cache dashboard, menyimpan **sampel** berkala ke Firestore, dan mengevaluasi notifikasi.
5. Express menyalin entri `/riwayat` ke Firestore (idempoten).
6. Dashboard menampilkan perubahan lewat polling.

**B. Alur kontrol dari web**
`Pengguna menekan “Siram 5 detik” → Express memeriksa hak akses & aturan → menulis /kontrol {aksi:"siram", detik:5, id: id+1} → ESP32 (poll 2 detik) menjalankan sekali → /status.pompa=true → UI: “dijalankan”`

**C. Alur pengguna**
`Register/Login → Dashboard → (lihat lahan / riwayat / notifikasi) → opsional ubah mode atau siram manual`

**D. Alur admin tambahan**
`Login → Kelola Akun → tambah/ubah/nonaktifkan pengguna`

---

## 7. Logika Fuzzy Sugeno (mengikuti firmware v4)

### 7.1 Status dan sumber
⚠ D11: perhitungan dilakukan di **ESP32**. Spesifikasi di bawah **diturunkan dari kode IoT** dan menjadi nilai bawaan. Server memiliki implementasi **identik** hanya untuk (a) pratinjau di halaman Parameter (FR-55), (b) simulator pengujian, dan (c) verifikasi hasil. Jika kode firmware berubah, bagian ini ikut diperbarui.

### 7.2 Masukan dan himpunan (trapesium `(a, b, c, d)`)
| Masukan | Himpunan | Parameter | Bentuk |
|---|---|---|---|
| **Tanah (%)** | Kering | (−∞, −∞, 20, 40) | μ=1 sampai 20, turun linear 20→40 |
| | Normal | (20, 40, 68, 88) | naik 20→40, μ=1 pada 40–68, turun 68→88 |
| | Basah | (68, 88, +∞, +∞) | naik 68→88, μ=1 mulai 88 |
| **Suhu (°C)** | Sejuk | (−∞, −∞, 25, 29) | μ=1 sampai 25, turun 25→29 |
| | Normal | (25, 29, 31, 35) | naik 25→29, μ=1 pada 29–31, turun 31→35 |
| | Panas | (31, 35, +∞, +∞) | naik 31→35, μ=1 mulai 35 |

### 7.3 Basis aturan (9 aturan; keluaran konstan dalam detik)
| Tanah \ Suhu | Sejuk | Normal | Panas |
|---|---:|---:|---:|
| **Kering** | 3 | 6 | 10 |
| **Normal** | 0 | 3 | 6 |
| **Basah** | 0 | 0 | 0 |

### 7.4 Perhitungan dan pengaman
- Bobot tiap aturan `w = min(μ_tanah, μ_suhu)`; `durasi = Σ(w·z) ÷ Σw`; bila `Σw = 0` maka 0.
- **Tanah rata-rata** = rata-rata sensor yang valid. Nilai mentah ≤ 200 (kabel putus) diabaikan; nilai mentah ≥ 3500 (sensor di udara) dianggap 0% pada mode uji, atau diabaikan bila `UDARA_DIANGGAP_KERING = false`. Bila **semua** sensor lepas → label “Sensor lepas”, durasi 0, pompa tidak menyala.
- Persen tiap sensor = `(kering − raw) ÷ (kering − basah) × 100`, dibatasi 0–100 (nilai kalibrasi per sensor).
- Penyiraman otomatis berjalan bila: mode Otomatis **dan** pompa mati **dan** cooldown = 0 **dan** durasi ≥ 1 s. Durasi nyata = min(durasi, **10 s**). Setelah selesai, **cooldown 300 s**.
- Siram manual maksimum **15 s**; cooldown tidak berlaku untuk manual.
- Label tampilan **terpisah dari himpunan fuzzy**: **Kering < 30%, Normal 30–78%, Basah > 78%**.

### 7.5 Contoh perhitungan (kasus uji; dihitung ulang dari kode)
| Tanah (%) | Suhu (°C) | `fuzzy_detik` |
|---:|---:|---:|
| 20 | 33 | **8,0** |
| 10 | 30 | **6,0** |
| 25 | 28 | **4,0** |
| 30 | 29 | **4,5** |
| 40 | 29 | **3,0** |
| 55 | 29 | **3,0** |
| 80 | 33 | **2,0** |
| 15 | 36 | **10,0** |
| 90 | 33 | **0,0** |

Modul fuzzy di server wajib berupa fungsi murni yang lulus seluruh baris tabel ini.

---

## 8. Kontrak Data IoT (ESP32 ↔ Firebase ↔ Express)

### 8.1 Pola
ESP32 membaca/menulis **Realtime Database** (REST); **Express** membaca/menulis node yang sama dengan Admin SDK. Browser tidak pernah menyentuh Firebase (D3, D13). Detail teknis ada di `architecture.md` dan `schema.md` (akan diperbarui).

### 8.2 Node data per perangkat — `/irigasi/{kode}`
Pada kode saat ini jalurnya tetap `/irigasi`; untuk banyak perangkat konstanta `FB_ROOT` dibuat per perangkat (🔧).

| Node | Penulis | Isi | Keterangan |
|---|---|---|---|
| `/status` | ESP32, ditimpa tiap 5 detik | `tanah` {`s1`,`s2`,`s3` → `raw`,`pct`; `rata`; `kategori`}, `udara` {`suhu`,`rh`,`dht_ok`}, `fuzzy_detik`, `mode`, `pompa`, `cooldown_detik`, `siram_terakhir`, `waktu`, `wifi_rssi`, `uptime_s`, `ts` | Hanya data terbaru, **tanpa riwayat** |
| `/kontrol` | Express | `mode` (`auto`/`manual`), `aksi` (`on`/`off`/`siram`/`reset`/`""`), `detik`, `id` | ESP32 membaca tiap 2 detik; aksi dijalankan **sekali** saat `id` berubah |
| `/riwayat` | ESP32, satu entri per siram selesai | `waktu`, `durasi_detik`, `mode` (`manual`/`otomatis`), `tanah_awal`, `suhu`, `alasan`, `ts` | Tanpa pelaku, tanpa kelembapan sesudah |
| `/config` 🔧 | Express | ambang, durasi maks, cooldown, kalibrasi per sensor, parameter fuzzy | **Belum ada di firmware** |

### 8.3 Aturan interpretasi di server
- **Waktu baku = `ts`** (cap waktu server Firebase, UTC). String `waktu` dan `siram_terakhir` berasal dari RTC lokal tanpa zona waktu dan hanya ditampilkan sebagai informasi.
- **Online** bila `ts` ≤ 30 detik yang lalu; notifikasi “perangkat offline” dikirim bila offline > 2 menit *(usulan)*.
- **Mode sebenarnya** = `status.mode` (firmware dapat pindah ke manual sendiri saat menerima “on”). Saat web mengirim “on”, ia juga menulis `mode:"manual"` di `/kontrol`.
- **Sampel kelembapan** untuk grafik disimpan server tiap 5 menit *(usulan; mengikuti SRS FR-30 lama: 5–10 menit)* — bukan tiap 5 detik — agar hemat kuota.
- Entri `/riwayat` disalin ke Firestore memakai **kunci unik entri** sebagai ID sehingga salinan ulang tidak menggandakan data. Pelaku siram manual diisi dengan mencocokkan perintah yang baru dikirim web (sebaik mungkin).
- Perintah baru: `id = id + 1` melalui transaksi atomik; ESP32 mengabaikan `id` pertama saat boot.

### 8.4 Perubahan firmware yang dibutuhkan (diserahkan ke tim IoT)
| # | Perubahan | Alasan | Prioritas |
|---|---|---|---|
| F1 | Baca `/config` (tiap 30–60 detik) dan terapkan ambang, durasi maks, cooldown, kalibrasi, parameter fuzzy | Agar FR-54/55/56 benar-benar berpengaruh | Tinggi |
| F2 | Tulis `ack_id` (id perintah terakhir dijalankan) dan `cfg_ver` (versi `/config` yang sedang diterapkan) di `/status` | Umpan balik tepat untuk FR-23 dan indikator “sudah diterapkan perangkat” pada FR-54/55/56 | Sedang |
| F3 | Jadikan `FB_ROOT` per perangkat (`/irigasi/{kode}`) | Mendukung banyak perangkat | Sedang |
| F4 | Pindahkan kredensial ke berkas terpisah (mis. `secrets.h`) yang tidak masuk git | Keamanan | **Tinggi** |
| F5 | Ganti *database secret* dengan kredensial yang lebih sempit dan aktifkan verifikasi sertifikat TLS | *Database secret* memberi akses penuh dan lewat URL | Sedang |
| F6 | (Opsional) kirim versi firmware `fw` di `/status` | FR-52 | Rendah |

---

## 9. Antarmuka & Desain

### 9.1 Dasar template
Memakai **TailAdmin Free React** (MIT, v2.5.0, React 19 + Vite 8 + Tailwind v4 + React Router 8 + Base UI). Template ini **SPA murni tanpa backend/auth/store** — semua itu ditambahkan proyek ini.

### 9.2 Peta halaman (menyesuaikan template)
| Rute | Halaman | Akses | Dasar di template |
|---|---|---|---|
| `/signin` | Masuk | Publik | `SignInPage` (ubah + hubungkan auth) |
| `/signup` | Daftar | Publik | `SignUpPage` (ubah + hubungkan auth) |
| `/reset-password` | Lupa kata sandi | Publik | (S) halaman auth tambahan |
| `/` | Dashboard | Semua | Ganti `EcommercePage`; kartu tanah (3 sensor), udara, pompa; grafik ApexCharts |
| `/lahan` | Lahan | Semua | `BasicTablesPage` + dialog form |
| `/perangkat` | Perangkat | Semua | `BasicTablesPage` + dialog form |
| `/penyiraman` | Kontrol (mode, siram, matikan, reset cooldown) | Semua | komponen baru |
| `/riwayat` | Riwayat penyiraman | Semua | tabel + filter tanggal (flatpickr) |
| `/parameter` | Parameter penyiraman & Fuzzy (+ pratinjau) | Semua | `FormElementsPage` |
| `/kalibrasi` | Kalibrasi sensor tanah (S1–S3) | Semua | form + tabel riwayat |
| `/laporan` | Laporan & ekspor | Semua | grafik + tombol ekspor |
| `/notifikasi` | Semua notifikasi | Semua | + dropdown lonceng di header (sudah ada di template) |
| `/profil` | Profil | Semua | `ProfilePage` |
| `/bantuan` | Bantuan | Semua | halaman statis |
| `/pengguna` | Kelola akun | **Admin** | `BasicTablesPage` + dialog form |
| `/error-404`, `/error-403` | Error | — | `Error404Page` + 403 baru |

**Dihapus dari template:** Calendar, halaman demo UI/chart/e-commerce, data dummy. Komponen `src/components/ui/*` dipertahankan.

### 9.3 Arah visual
- **Primer hijau**: ganti skala `--color-brand-50…950` di `src/index.css` (saat ini biru) ke skala hijau dengan `brand-600 ≈ #2E7D32`.
- Label kelembapan: Kering merah, Normal hijau, Basah biru; selalu disertai teks.
- Kontras teks ≥ 4,5:1; isi ≥ 14 px (16 px di ponsel); judul 20–24 px; lebar minimum 360 px; sidebar kiri di desktop, hamburger di ponsel.
- Tombol mengikuti SRS Tabel 3.3 (Masuk/Tambah/Simpan hijau, Ubah biru, Hapus merah, Batal abu-abu); dialog konfirmasi sebelum hapus. Pintasan: `Tab`, `Enter`, `Esc`.
- Halaman Parameter dan Kalibrasi memperlihatkan **nilai langsung dari perangkat** (mis. nilai mentah S1–S3) agar mudah diisi.
- Detail komponen dan token di `design.md`.

### 9.4 Bahasa
Seluruh teks UI **Bahasa Indonesia baku** (NFR-09). Istilah “Fuzzy Sugeno” hanya di halaman Parameter. Tambahkan locale `id` (bawaan), nonaktifkan en/ar/es/de.

### 9.5 Pesan sistem
Kode pesan SRS Tabel 3.5 (E-01 … E-08) dipakai apa adanya; pesan sukses hijau, galat merah.

---

## 10. Stack Teknologi

| Lapisan | Pilihan |
|---|---|
| Frontend | React + Vite + Tailwind CSS + TypeScript, berbasis TailAdmin Free React |
| Backend | Express.js (TypeScript) — **satu-satunya pintu** dari browser ke Firebase; menerapkan RBAC, validasi, jembatan data perangkat, pratinjau fuzzy |
| Basis data | **Firebase**: Cloud Firestore (data aplikasi: pengguna, lahan, perangkat, sampel, riwayat, notifikasi, audit) + **Realtime Database** (kotak surat perangkat: `/status`, `/kontrol`, `/riwayat`, `/config`) + Firebase Authentication. Aturan keamanan keduanya menolak akses langsung klien (Q2) |
| Firmware | ESP32 (Arduino C/C++, REST ke RTDB, FreeRTOS) — dikerjakan tim IoT |
| Komunikasi | HTTPS + REST + JSON |

### 10.1 Versi dependensi (dicek ke npm registry, 1 November 2026)
Semua dependensi dipasang di **versi stabil terbaru**; versi persisnya dikunci lewat `package-lock.json`.

| Paket | Terbaru | Template saat ini | Catatan |
|---|---|---|---|
| `react`, `react-dom` | 19.3.1 | ^19.2.8 | naikkan |
| `vite` | 8.3.5 | ^8.3.0 | `engines.node`: ^20.19 atau ≥22.12 |
| `@vitejs/plugin-react` | 6.1.2 | ^6.1.1 | |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.3 | ^4.3.3 | sudah terbaru |
| `react-router` | 8.5.1 | ^8.4.0 | impor dari `react-router`, bukan `react-router-dom` |
| `apexcharts` / `react-apexcharts` | 8.7.0 / 2.2.0 | ^7.8.0 / ^2.1.1 | `react-apexcharts` mensyaratkan apexcharts ≥ 5.10.1 — naik mayor perlu uji grafik |
| `zod` | 4.6.7 | ^3.25.76 | naik mayor; cek kompatibilitas `@hookform/resolvers` |
| `typescript` | 7.0.2 | ~6.0.2 | **jangan langsung naik** — cek `typescript-eslint` & `oxlint-tsgolint`; naik bila build + lint lolos |
| `express` | 5.3.0 | — | |
| `firebase-admin` | 14.5.0 | — | `engines.node` **≥ 22**; mencakup Firestore, Auth, dan Realtime Database |
| `firebase` (klien) | 13.1.0 | — | **tidak dipakai** pada rancangan ini (login lewat Express); dipertimbangkan hanya bila arsitektur berubah |
| `helmet`, `cors`, `express-rate-limit` | 8.3.0 / 2.8.6 / 8.7.2 | — | keamanan Express |
| **Node.js** | — | — | **22 LTS atau lebih baru** |

Setelah setiap pembaruan: jalankan `npm run build` dan `npm run lint`.

---

## 11. Kebutuhan Non-Fungsional

| ID | Aspek | Kebutuhan |
|---|---|---|
| NFR-01 | Ketersediaan | Target ≥ 99,5% per bulan; pemulihan data via backup Firebase terjadwal (RPO ≤ 24 jam) |
| NFR-02 | Keandalan | **ESP32 tetap menyiram otomatis walau internet putus** (D11) dan mengirim ulang status saat tersambung; Wi-Fi dicoba ulang tiap 30 detik; kegagalan Firebase tidak mengganggu pembacaan sensor dan pengaman pompa (task terpisah) |
| NFR-03 | Kinerja | CRUD panel ≤ 2,5 s (p95); muat dashboard ≤ 3 s di 4G; perintah kontrol mencapai ESP32 ≤ 10 s |
| NFR-04 | Ergonomi | Responsif 360 px–desktop; WCAG 2.1 AA; kontras ≥ 4,5:1; dashboard ≤ 3 klik |
| NFR-05 | Keamanan | HTTPS/TLS ≥ 1.2; RBAC di server; kata sandi dikelola Firebase Auth; rate limiting login; validasi semua input (zod); proteksi XSS/CSRF/injection (OWASP ASVS L2 sebagai acuan); **kredensial perangkat tidak boleh ada di repositori**; aturan Firebase menolak akses klien; **kredensial perangkat yang sudah terlanjur dibagikan harus dicabut dan dibuat ulang** |
| NFR-06 | Privasi | Mengikuti **UU No. 27 Tahun 2022 (PDP)**: data pribadi hanya nama & email, hak hapus akun, akses dibatasi peran |
| NFR-07 | Portabilitas | Backend dapat dijalankan di Linux x86_64 / Docker; tanpa state lokal |
| NFR-08 | Kompatibilitas | Chrome, Firefox, Edge versi terkini |
| NFR-09 | Bahasa | Seluruh antarmuka Bahasa Indonesia |
| NFR-10 | Retensi data | Sampel kelembapan disimpan terbatas (usulan 90 hari); riwayat siram permanen |
| NFR-11 | Keselamatan | Pompa tidak boleh menyala tanpa batas: durasi maks (10 s otomatis, 15 s manual) dan cooldown ditegakkan **di firmware**; server hanya mengirim perintah dalam batas itu |

---

## 12. Asumsi, Ketergantungan, dan Risiko

**Asumsi**
- A1. Satu akun melihat **semua lahan** (belum ada penugasan lahan per pengguna).
- A2. Satu lahan memiliki ≥ 1 perangkat; satu perangkat = 1 ESP32 + 3 sensor tanah (rata-rata dipakai untuk keputusan) + DHT11 + 1 pompa.
- A3. Tampilan memakai **WITA (Asia/Makassar)**; waktu baku disimpan UTC (`ts`).
- A4. “IoT dan SC”: tim IoT mengerjakan firmware/hardware, tim SC mengerjakan web + backend; titik temu = kontrak data bagian 8.
- A5. Selama simulasi, data perangkat dapat dihasilkan **simulator** yang meniru ESP32 (menulis `/status`, membaca `/kontrol`, menulis `/riwayat`) di Firebase Emulator.

**Risiko**
| Risiko | Dampak | Mitigasi |
|---|---|---|
| *Database secret* terlanjur terbuka di berkas yang dibagikan | Siapa pun dapat membaca/menulis seluruh Realtime Database | Cabut dan buat ulang sekarang; pindahkan ke `secrets.h` (F4); kredensial lebih sempit (F5) |
| FR-54/55/56 bergantung pada firmware membaca `/config` (F1) | Halaman Parameter/Kalibrasi tampak berfungsi tapi tidak berpengaruh | Tandai 🔧; tampilkan status “belum diterapkan perangkat” sampai F1 selesai |
| Dua basis data Firebase (RTDB + Firestore) | Kompleksitas dan potensi data tidak sinkron | Satu arah: perangkat → RTDB → Express → Firestore; Firestore sumber kebenaran untuk aplikasi |
| Data status ditimpa (tanpa riwayat) | Grafik kosong bila server mati | Sampel disimpan server; indikator “data tidak tersedia pada periode ini” |
| Trafik RTDB (poll 2 detik + push 5 detik) | Bandwidth/biaya | Pantau pemakaian; interval dapat dinaikkan lewat `/config` |
| Kuota Firestore Spark (20.000 tulis/hari) | Layanan terbatas | Sampel tiap 5 menit, bukan tiap 5 detik; pertimbangkan Blaze dengan anggaran |
| Upgrade mayor (TypeScript 7, ApexCharts 8, Zod 4) memecah template | Build/lint gagal | Naik bertahap, `build` + `lint` tiap langkah |
| SRS belum konsisten (D1, D2, D11, D12) | Salah paham tim | Perbaiki SRS paralel dengan pengembangan |
| Wi-Fi lahan tidak stabil | Data tertunda | Indikator offline + E-05; ESP32 mandiri |
| Kalibrasi sensor kapasitif bervariasi (nilai kering masih “SEMENTARA”) | Persen tidak akurat | FR-56 + tombol “Gunakan nilai sekarang” |

---

## 13. Urutan Pengerjaan (usulan, tanpa tanggal)

| Fase | Isi | Hasil |
|---|---|---|
| 0 | Setup monorepo (`frontend/`, `backend/`), upgrade dependensi, tema hijau, hapus halaman demo | Aplikasi kosong berwarna hijau, build & lint lulus |
| 1 | Firebase + auth, Register/Login, RBAC, Kelola Akun | FR-01…07 |
| 2 | Lahan, Perangkat, identitas perangkat | FR-50…53 |
| 3 | **Jembatan RTDB** (pendengar `/status`, sampel, salinan `/riwayat`), dashboard, pratinjau fuzzy, **simulator** | FR-10…16, bagian 7–8 |
| 4 | Mode & siram manual (`/kontrol`), reset cooldown, riwayat, notifikasi | FR-20…24, 30, 40–41 |
| 5 | Parameter, fuzzy, kalibrasi (`/config`) bersama **perubahan firmware F1–F6** | FR-54…56 |
| 6 | Laporan/ekspor, bantuan, audit log, pengerasan keamanan, UAT dengan tim IoT | FR-31–32, 60–61 |

Perubahan firmware (bagian 8.4) berjalan **paralel** oleh tim IoT.

---

## 14. Pertanyaan Terbuka & Keputusan

| # | Pertanyaan | Status / usulan bawaan |
|---|---|---|
| Q1 | Register publik | ✅ Langsung aktif, peran *pengguna* |
| Q2 | Firebase Auth + Firestore, frontend lewat Express | ✅ Selesai |
| Q3 | Update dashboard | ✅ Polling 10 detik (architecture AD-05) |
| Q4 | **Logo/branding** yang dipakai (Dinas Pertanian dan Peternakan Kota Parepare / GREENFLOW / kampus)? | Logo GREENFLOW sementara |
| Q5 | Pengaman (durasi maks, cooldown) | ✅ Ditegakkan di **ESP32** (D11) |
| Q6 | Titik fuzzy | ✅ **Diganti**: pakai spesifikasi firmware v4 (bagian 7); nilai 30/45/60 dicabut |
| Q7 | Siapa boleh siram manual | ✅ Kedua peran, tercatat di audit |
| Q8 | Penugasan lahan per pengguna | Tidak di v1 (A1) |
| Q9 | Sensor opsional (hujan, level, aliran) | ✅ **Dikeluarkan** (D12) |
| Q18 | Fuzzy dihitung di ESP32 (D11) | ✅ Dikonfirmasi 3 Nov 2026; SRS 3.2 diubah |
| Q19 | Jalur data: RTDB sebagai kotak surat + Express jembatan (D13) | ✅ Dikonfirmasi 3 Nov 2026 |
| Q20 | Tiga sensor tanah per perangkat, rata-rata dipakai | ✅ Dikonfirmasi 3 Nov 2026 |
| Q21 | Label “mulai kering/kuning” dari SRS 3.1 — dipakai (mis. 30–40%) atau cukup Kering/Normal/Basah? | Cukup 3 label (sesuai firmware) |
| Q22 | Interval sampel kelembapan yang disimpan server | 5 menit |
| Q23 | Siapa menjalankan perubahan firmware F1–F6 dan kapan? | Tim IoT, paralel dengan Fase 3–5 |

---

## 15. Jejak ke SRS dan Kode IoT

| Use case SRS | Fitur PRD |
|---|---|
| UC-01 Login | FR-02, FR-03 (+ FR-01 Register, D5) |
| UC-02 Lihat dashboard | FR-10…16 |
| UC-03 Lihat riwayat | FR-30 |
| UC-04 Terima notifikasi | FR-40…42 |
| UC-05 Pilih mode | FR-20 |
| UC-06 Siram manual | FR-21…24 |
| UC-07 Atur ambang batas | FR-54 |
| UC-08 Atur parameter fuzzy | FR-55, bagian 7 |
| UC-09 Kelola akun pengguna | FR-06, FR-07 (**admin saja**) |
| UC-10 Kelola lahan, perangkat | FR-50…53 |
| UC-11 Kalibrasi sensor | FR-56 |
| UC-12 Lihat laporan | FR-31, FR-32 |
| UC-13 Backup data | FR-32 (ekspor), D10 |
| SI-01…SI-03 (ESP32 ↔ server) | Digantikan bagian 8 (D13) |
| SI-04…SI-09 | FR-01…07, 10…16, 30, 50…56 |
| UI-01…UI-07 | Bagian 9.2 (digabung karena D6/D7) |
| Tabel 3.5 (E-01…E-08) | Bagian 9.5 |

| Elemen kode IoT | Fitur PRD |
|---|---|
| `/irigasi/status` | FR-10…14, 16, 40 |
| `/irigasi/kontrol` | FR-20…24 |
| `/irigasi/riwayat` | FR-30, 31 |
| `fuzzySugeno()` + `RULE_Z` | Bagian 7, FR-55 |
| `SOIL_WET/SOIL_DRY` | FR-56 (🔧 F1) |
| `MAX_PUMP_MS`, `MANUAL_MAX_MS`, `COOLDOWN_MS` | FR-54 (🔧 F1), NFR-11 |
| Alarm buzzer (kering, error) | FR-40 (histeresis 30→35 disamakan) |