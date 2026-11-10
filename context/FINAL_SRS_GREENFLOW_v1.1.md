# Software Requirements Specification

## GREENFLOW: Implementasi Smart Irrigation untuk Mencukupi Kebutuhan Air pada Tanaman Sayuran Sawi

**Versi 1.1 (disesuaikan dengan implementasi)**

**Disusun oleh**

- 231011054 – Firmayanti
- 231011042 – Nabilah Harun Nurfadilah
- 241011034 – Raninur Indah Sari
- 221011110 – Alfira Zalsabila
- 231011064 – Mutiah Zayatul Jannah

**Kelompok 20 TUMBUH**

**3 November 2026**

---

## Lembar Revisi

| Versi | Tanggal | Penyusun | Ringkasan Perubahan |
|---|---|---|---|
| 1.0 | 22 September 2025 | Tim GREENFLOW | Draf awal SRS. Sebagian isi masih memakai template proyek perumahan/RTH dan rancangan awal (Mamdani, PostgreSQL, Next.js/Laravel). |
| 1.1 | 3 November 2026 | Tim GREENFLOW | SRS diselaraskan dengan sistem yang benar-benar dibangun: Fuzzy Sugeno di ESP32, Firebase (Auth + Firestore + Realtime Database), Express + React/Vite, dua peran (admin/pengguna), perangkat keras aktual (3 sensor tanah, DHT11, RTC DS1307, LCD I2C, buzzer), serta status implementasi setiap kebutuhan. |

### Ringkasan penyesuaian v1.0 → v1.1

| Aspek | SRS v1.0 | Implementasi (v1.1) |
|---|---|---|
| Metode keputusan | Fuzzy **Mamdani** dihitung di **server** | Fuzzy **Sugeno orde-nol** (2 masukan: kelembapan tanah dan suhu; 9 aturan) dihitung **di firmware ESP32**. Server hanya menyediakan pratinjau, simulator, dan verifikasi. |
| Basis data | **PostgreSQL** (+ PostGIS) | **Firebase**: Firebase Authentication (akun), **Cloud Firestore** (data aplikasi), **Realtime Database** (kotak surat perangkat). |
| Frontend | Next.js (React) | **React 19 + Vite + TypeScript + Tailwind CSS v4 + React Router 8**, berbasis TailAdmin Free React. |
| Backend | Laravel | **Express 5 + TypeScript**, satu-satunya pintu browser ke Firebase. |
| Peran | Operator, Developer, Petugas IoT, Masyarakat | **admin** dan **pengguna** saja. |
| Domain | Perumahan, unit rumah, RTH, surat-menyurat | **Lahan sawi**, perangkat irigasi, penyiraman. Istilah perumahan/RTH/PostGIS dihapus. |
| Registrasi | Registrasi akun *Developer* + verifikasi operator | Registrasi publik, akun langsung aktif dengan peran **pengguna**. |
| Autentikasi perangkat | Token perangkat unik per ESP32 | ESP32 menulis langsung ke Realtime Database memakai kredensial database; browser tidak pernah menyentuh Firebase. |
| Sensor | 1 sensor tanah; DHT22; sensor hujan/level/aliran/katup/solar opsional | **3 sensor tanah kapasitif** (rata-rata), **DHT11**, **RTC DS1307**, **LCD I2C 16×2**, **buzzer aktif**, relay 1 kanal + pompa DC 12 V. Sensor hujan, level air, aliran air, katup solenoid, dan panel surya **dikeluarkan dari v1**. |
| Pin map | Usulan, sebagian bentrok dengan ADC2 | Pin aktual: soil **GPIO34/35/32**, DHT11 **GPIO4**, relay **GPIO26**, buzzer **GPIO25**. |
| Parameter | Diubah di server lalu server mengirim keputusan | Parameter disimpan di Firestore; penyalinan ke node `/config` perangkat **belum didukung firmware** (ditandai 🔧). |
| Notifikasi | Dashboard/email otomatis saat kondisi kritis | Notifikasi **di dalam aplikasi** (daftar, tandai dibaca, hapus). Pembuatan otomatis dari status perangkat **belum terpasang**. |
| Ekspor laporan | CSV/XLSX/PDF | Laporan ringkas + grafik; **ekspor belum diimplementasikan**. |
| Audit | Audit trail wajib | Penulisan audit tersedia di backend untuk sebagian aksi; **API dan halaman audit masih placeholder**. |

### Legenda status implementasi

| Simbol | Arti |
|:---:|---|
| ✅ | Terimplementasi dan dapat dipakai |
| ◐ | Terimplementasi sebagian / cakupan lebih sempit dari spesifikasi |
| 🔧 | Bergantung pada perubahan firmware atau integrasi perangkat yang belum selesai |
| ○ | Belum diimplementasikan (placeholder/rencana) |

---

## Daftar Isi

1. Pendahuluan
   1. Tujuan Penulisan Dokumen
   2. Audiens yang Dituju dan Pembaca yang Disarankan
   3. Batasan Produk
   4. Definisi dan Istilah
   5. Referensi
2. Deskripsi Umum
   1. Deskripsi Produk
   2. Fungsi Produk
   3. Penggolongan Karakteristik Pengguna
   4. Lingkungan Operasi
   5. Batasan Desain dan Implementasi
   6. Dokumentasi Pengguna
3. Kebutuhan Antarmuka Eksternal
   1. Antarmuka Pengguna
   2. Antarmuka Perangkat Keras
   3. Antarmuka Perangkat Lunak
   4. Antarmuka Komunikasi
4. Kebutuhan Fungsional
   1. Autentikasi dan Akun
   2. Dashboard dan Pemantauan
   3. Kontrol Penyiraman
   4. Riwayat dan Laporan
   5. Notifikasi
   6. Data Master dan Parameter
   7. Fitur Pendukung
   8. Use Case
   9. Model Data dan Hubungan Antar-Kelas
5. Kebutuhan Non-Fungsional
6. Lampiran

---

# 1. Pendahuluan

## 1.1 Tujuan Penulisan Dokumen

Dokumen Software Requirements Specification (SRS) ini menjelaskan kebutuhan sistem **GREENFLOW**, yaitu sistem *smart irrigation* untuk mencukupi kebutuhan air tanaman sawi. GREENFLOW adalah sistem penyiraman otomatis berbasis Internet of Things (IoT). Sistem membaca kelembapan tanah melalui tiga sensor, menghitung durasi penyiraman dengan metode **Fuzzy Sugeno** di dalam mikrokontroler ESP32, lalu menyajikan data dan kendali kepada admin dan pengguna melalui aplikasi web.

Dokumen ini merupakan **revisi v1.1** dari SRS v1.0 tertanggal 22 September 2025. Revisi dilakukan agar isi SRS sesuai dengan sistem yang benar-benar dibangun pada repositori GREENFLOW, bukan lagi rancangan awal. Setiap kebutuhan diberi penanda status implementasi supaya pembaca dapat membedakan fitur yang sudah berjalan, baru sebagian, menunggu firmware, atau masih direncanakan.

Penyiraman manual sering tidak sesuai dengan kebutuhan air tanaman, dan irigasi konvensional belum efisien dalam penggunaan air. Tanaman sawi peka terhadap kelembapan tanah. Penelitian terdahulu menyebutkan rentang kelembapan yang sesuai untuk sawi sekitar 30%–60%, sedangkan petani umumnya masih menyiram secara manual (Ramadhani, 2025). Pendekatan berbasis sensor kelembapan tanah dan mikrokontroler dapat mengatasi masalah ini. Pamungkas (2025) melaporkan bahwa sistem penyiraman sawi berbasis ESP32, sensor kelembapan tanah, dan logika fuzzy mampu meningkatkan efisiensi penggunaan air hingga 50%. Ramadhani (2025) melaporkan penghematan air sekitar 30% dibandingkan penyiraman manual pada sistem sawi berbasis IoT.

Kedua penelitian tersebut memakai metode Mamdani. GREENFLOW memakai **Sugeno orde-nol** karena keluarannya berupa konstanta detik sehingga ringan dijalankan pada mikrokontroler dan mudah diverifikasi. Perhitungan dijalankan **di ESP32**, bukan di server, agar penyiraman otomatis tetap berjalan walaupun koneksi internet terputus.

## 1.2 Audiens yang Dituju dan Pembaca yang Disarankan

Dokumen ini ditujukan kepada pihak-pihak berikut.

| Pembaca | Bagian yang relevan | Manfaat |
|---|---|---|
| Tim pengembang web (frontend/backend) | Bab 3, 4, 5 | Acuan implementasi antarmuka, API, validasi, dan perilaku sistem. |
| Tim IoT (firmware dan perangkat keras) | Bab 3.2, 3.4, 4.3, Lampiran A | Acuan kontrak data, pin map, dan pengaman pompa. |
| Dosen pembimbing dan penguji | Seluruh bab | Menilai kelengkapan dan konsistensi kebutuhan. |
| Pengguna akhir (admin dan pengguna) | Bab 2, 3.1 | Memahami fungsi, hak akses, dan batasan sistem. |
| Pengelola/operator sistem | Bab 5, Lampiran B | Memahami kebutuhan non-fungsional dan prosedur operasi. |

Pembaca diasumsikan memahami dasar aplikasi web dan IoT. Istilah teknis dijelaskan pada Bagian 1.4.

## 1.3 Batasan Produk

GREENFLOW adalah sistem yang berdiri sendiri (bukan bagian dari sistem pemerintahan atau sistem perumahan lain). Sistem bergantung pada komponen pendukung berikut agar dapat berjalan:

1. perangkat keras di lahan (ESP32, tiga sensor tanah, DHT11, relay, pompa, RTC, LCD, buzzer);
2. koneksi Wi-Fi 2,4 GHz dan internet di sekitar lahan;
3. layanan Firebase (Authentication, Cloud Firestore, Realtime Database);
4. server Express sebagai satu-satunya pintu aplikasi web ke Firebase;
5. peramban modern di komputer atau ponsel untuk mengakses aplikasi web.

Batasan penting yang membedakan GREENFLOW dari SRS v1.0:

- **Keputusan penyiraman tidak bergantung pada server.** Fuzzy Sugeno dihitung di ESP32. Server tidak mengirim keputusan penyiraman otomatis; server hanya mengirim perintah manual (mode, siram, matikan, reset cooldown) melalui Realtime Database.
- **Tidak ada perhitungan fuzzy real-time di server.** Implementasi fuzzy di server hanya untuk pratinjau parameter, simulator, dan pengujian.
- **Hanya dua peran.** Tidak ada Developer, Operator, Petugas IoT, atau Masyarakat.
- **Satu perangkat = satu ESP32** dengan tiga sensor tanah, satu DHT11, dan satu pompa. Belum ada dukungan multi-perangkat dalam satu node Realtime Database (jalur masih `/irigasi`, bukan `/irigasi/{kode}`).
- **Data status ditimpa.** Node `/irigasi/status` ditulis ulang setiap 5 detik dan tidak menyimpan riwayat. Riwayat kelembapan untuk grafik berasal dari sampel yang disimpan server ke Firestore.
- **Sensor tambahan tidak termasuk v1.** Sensor hujan, sensor level air, sensor aliran air, katup solenoid, dan panel surya tidak dipakai.
- **Belum ada aplikasi seluler native.** Antarmuka hanya berupa aplikasi web responsif.

## 1.4 Definisi dan Istilah

| Istilah | Definisi |
|---|---|
| **GREENFLOW** | Nama sistem smart irrigation untuk tanaman sawi yang dijelaskan pada dokumen ini. |
| **ESP32** | Mikrokontroler yang membaca sensor, menghitung fuzzy, mengendalikan relay, dan berkomunikasi dengan Realtime Database. |
| **Fuzzy Sugeno** | Metode inferensi fuzzy dengan keluaran berupa konstanta. GREENFLOW memakai orde-nol, 2 masukan (tanah, suhu), 9 aturan, dan keluaran durasi dalam detik. |
| **Derajat keanggotaan (μ)** | Nilai 0–1 yang menyatakan seberapa kuat suatu nilai termasuk dalam himpunan fuzzy (Kering/Normal/Basah atau Sejuk/Normal/Panas). |
| **Cooldown** | Jeda wajib setelah penyiraman otomatis selesai sebelum penyiraman otomatis berikutnya boleh dimulai (bawaan 300 detik). |
| **Realtime Database (RTDB)** | Basis data Firebase berbentuk pohon JSON yang dipakai sebagai kotak surat perangkat: `/status`, `/kontrol`, `/riwayat`, `/config`. |
| **Cloud Firestore** | Basis data dokumen Firebase untuk data aplikasi: pengguna, lahan, perangkat, sampel pembacaan, riwayat penyiraman, notifikasi, kalibrasi, audit. |
| **Firebase Authentication** | Layanan autentikasi Firebase yang mengelola kredensial dan sesi pengguna. |
| **Sesi** | Status login pengguna yang disimpan pada cookie `__session` (httpOnly) berlaku 7 hari. |
| **RBAC** | *Role-Based Access Control*, pembatasan akses berdasarkan peran `admin` dan `pengguna`. |
| **Lahan** | Unit budidaya sawi yang dipantau, memiliki lokasi, luas, status, dan parameter penyiraman. |
| **Perangkat** | Satu unit ESP32 beserta sensor dan pompa yang terpasang pada satu lahan. |
| **Pembacaan (reading)** | Sampel nilai sensor yang disimpan server ke Firestore untuk grafik dan laporan. |
| **Penyiraman (watering)** | Satu siklus pompa menyala, dicatat dengan waktu mulai, durasi, pemicu, dan kondisi awal. |
| **WITA** | Waktu Indonesia Tengah (UTC+8, `Asia/Makassar`) yang dipakai untuk tampilan waktu. |
| **E-01 … E-08** | Kode pesan kesalahan antarmuka yang didefinisikan pada Tabel 3.5. |
| **FR / NFR / UC / UI** | Berturut-turut: *Functional Requirement*, *Non-Functional Requirement*, *Use Case*, dan *User Interface*. |
| **🔧** | Penanda kebutuhan yang bergantung pada perubahan firmware atau integrasi perangkat yang belum selesai. |

## 1.5 Referensi

1. IEEE. (1998). *IEEE Std 830-1998: IEEE recommended practice for software requirements specifications*. IEEE.
2. Pamungkas, R. (2025). Sistem penyiraman pintar dan monitoring tanaman sawi otomatis berbasis ESP32 dan sensor kelembaban tanah menggunakan metode fuzzy Mamdani. *Jurnal Al-Azhar Indonesia Seri Sains dan Teknologi*, 10(2).
3. Ramadhani, R. (2025). *Sistem irigasi otomatis tanaman sawi berbasis IoT*. (ringkasan penelitian terdahulu)
4. Republik Indonesia. (2022). *Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi*.
5. Tim GREENFLOW. (2026). *PRD — GREENFLOW Panel & Dashboard*, versi 0.3.
6. Tim GREENFLOW. (2026). *Architecture — GREENFLOW Panel & Dashboard*, versi 0.2.
7. Tim GREENFLOW. (2026). *Schema — GREENFLOW (Realtime Database + Cloud Firestore + Firebase Auth)*, versi 0.2.
8. Tim GREENFLOW. (2026). *Design — GREENFLOW Panel & Dashboard*.
9. Tim IoT GREENFLOW. (2026). *Kode IoT Smart Irrigation Sawi v4* (firmware ESP32).
10. Dokumentasi Firebase: Authentication, Cloud Firestore, dan Realtime Database. https://firebase.google.com/docs

---

# 2. Deskripsi Umum

## 2.1 Deskripsi Produk

GREENFLOW adalah sistem penyiraman otomatis berbasis IoT yang dibuat khusus untuk tanaman sayuran sawi. Sistem ini berdiri sendiri, tetapi agar dapat berjalan ia terhubung dengan perangkat keras di lahan, layanan Firebase, server aplikasi, dan aplikasi web.

Alur kerja sistem secara garis besar:

1. Tiga sensor kelembapan tanah kapasitif membaca kadar air pada media tanam. Nilai ADC tiap sensor diubah menjadi persen memakai nilai kalibrasi kering dan basah masing-masing sensor.
2. ESP32 menghitung rata-rata kelembapan tanah dan membaca suhu serta kelembapan udara dari DHT11.
3. ESP32 menghitung durasi penyiraman dengan **Fuzzy Sugeno orde-nol** berdasarkan dua masukan: rata-rata kelembapan tanah (%) dan suhu udara (°C).
4. Bila mode **Otomatis**, pompa mati, cooldown habis, dan durasi hasil fuzzy minimal 1 detik, ESP32 menyalakan relay dan pompa sesuai durasi (maksimum 10 detik untuk otomatis).
5. ESP32 menulis status terbaru ke node `/irigasi/status` setiap 5 detik dan menulis satu entri ke `/irigasi/riwayat` setiap penyiraman selesai.
6. Express membaca node Realtime Database, menyimpan sampel pembacaan dan salinan riwayat ke Cloud Firestore, lalu menyajikannya melalui REST API ke aplikasi web.
7. Admin dan pengguna memantau kondisi lahan, mengubah mode, menyiram manual, mengatur parameter, dan melihat riwayat melalui aplikasi web.

Sistem terdiri atas empat bagian utama:

| Lapisan | Komponen | Tanggung jawab |
|---|---|---|
| **Perangkat (edge)** | ESP32, 3 sensor tanah, DHT11, relay, pompa, RTC DS1307, LCD I2C, buzzer | Membaca sensor, menghitung fuzzy, mengendalikan pompa, menulis status/riwayat ke RTDB, membaca perintah dari `/kontrol`. |
| **Layanan data** | Firebase Authentication, Cloud Firestore, Realtime Database | Menyimpan akun, data master, sampel, riwayat, notifikasi, kalibrasi, audit; menjadi kotak surat perangkat. |
| **Server aplikasi** | Express 5 + TypeScript | Satu-satunya pintu browser ke Firebase; menerapkan RBAC, validasi, jembatan RTDB–Firestore, pratinjau fuzzy. |
| **Antarmuka** | React 19 + Vite (TailAdmin) | Dashboard, kontrol, riwayat, laporan, parameter, kalibrasi, pengguna, profil. |

Dengan rancangan ini, penyiraman tidak lagi bergantung pada perkiraan petani, tetapi pada kondisi tanah yang sebenarnya. Karena keputusan dijalankan di perangkat, penyiraman otomatis tetap berlangsung saat internet putus.

## 2.2 Fungsi Produk

Fungsi GREENFLOW dikelompokkan menjadi fungsi otomatis sistem dan fungsi untuk dua aktor.

### 2.2.1 Fungsi otomatis sistem

| No | Fungsi | Status |
|---:|---|:---:|
| 1 | Membaca tiga sensor kelembapan tanah dan DHT11 secara berkala (siklus utama ±2 detik). | ✅ |
| 2 | Mengubah nilai ADC menjadi persen memakai kalibrasi kering/basah per sensor, mengabaikan sensor yang terlepas. | ✅ |
| 3 | Menghitung durasi penyiraman dengan Fuzzy Sugeno (2 masukan, 9 aturan). | ✅ |
| 4 | Menyalakan dan mematikan pompa melalui relay sesuai mode, cooldown, dan batas durasi. | ✅ |
| 5 | Menulis status terbaru ke `/irigasi/status` setiap 5 detik. | ✅ |
| 6 | Membaca perintah dari `/irigasi/kontrol` setiap 2 detik dan menjalankannya sekali per `id`. | ✅ |
| 7 | Menulis riwayat penyiraman ke `/irigasi/riwayat` setiap siklus selesai. | ✅ |
| 8 | Menyalakan buzzer untuk pola peringatan (boot, Wi-Fi, penyiraman, error sensor). | ✅ |
| 9 | Menampilkan status lokal pada LCD I2C 16×2 dan memberi cap waktu RTC DS1307. | ✅ |
| 10 | Menyimpan sampel pembacaan dan salinan riwayat dari RTDB ke Firestore. | ◐ (jembatan belum berjalan otomatis penuh) |
| 11 | Membuat notifikasi otomatis saat tanah kering, sensor bermasalah, atau perangkat offline. | ○ |
| 12 | Menyalin parameter dan kalibrasi dari Firestore ke node `/config` agar dibaca ESP32. | 🔧 |

### 2.2.2 Fungsi untuk admin

| No | Fungsi | Status |
|---:|---|:---:|
| 1 | Registrasi, login, logout, lupa kata sandi. | ✅ |
| 2 | Melihat dashboard kelembapan tanah, suhu, kelembapan udara, status pompa, mode, cooldown, dan data perangkat. | ✅ |
| 3 | Melihat rincian tiga sensor tanah (S1–S3), nilai mentah, dan persentase. | ✅ |
| 4 | Melihat riwayat penyiraman dengan filter lahan dan paginasi. | ✅ |
| 5 | Melihat laporan ringkas dan tren kelembapan. | ◐ |
| 6 | Mengubah mode Otomatis/Manual serta menyalakan dan mematikan pompa secara manual. | ✅ |
| 7 | Mengelola akun pengguna (tambah, ubah, aktif/nonaktif, hapus, reset kata sandi). | ✅ |
| 8 | Mengelola lahan (tambah, ubah, hapus). | ✅ |
| 9 | Mengelola perangkat (tambah, ubah, hapus). | ✅ |
| 10 | Mengatur parameter penyiraman dan parameter fuzzy per lahan. | ◐ |
| 11 | Mengkalibrasi sensor tanah (nilai kering/basah). | ◐ |
| 12 | Menerima dan mengelola notifikasi. | ◐ |
| 13 | Melihat log aktivitas (audit). | ○ |
| 14 | Mengekspor laporan ke CSV/XLSX. | ○ |

### 2.2.3 Fungsi untuk pengguna

| No | Fungsi | Status |
|---:|---|:---:|
| 1 | Registrasi, login, logout, lupa kata sandi. | ✅ |
| 2 | Melihat dashboard kelembapan tanah, suhu, kelembapan udara, status pompa, mode, dan cooldown. | ✅ |
| 3 | Melihat riwayat penyiraman. | ✅ |
| 4 | Melihat laporan ringkas dan tren kelembapan. | ◐ |
| 5 | Mengubah mode serta menyalakan dan mematikan pompa. | ✅ |
| 6 | Mengelola profil dan mengganti kata sandi. | ✅ |
| 7 | Menerima dan mengelola notifikasi. | ◐ |
| 8 | Mengakses halaman bantuan. | ○ (placeholder) |
| 9 | Mengelola akun, lahan, perangkat, parameter, dan kalibrasi. | ❌ (khusus admin) |

> **Catatan hak akses.** Pada SRS v1.0 pengguna hanya boleh memantau. Pada implementasi, pengguna juga dapat mengubah mode dan menyiram manual. Penulisan data master (lahan, perangkat, parameter, kalibrasi) dan pengelolaan akun dibatasi untuk admin dan ditegakkan di server, bukan hanya dengan menyembunyikan menu.

## 2.3 Penggolongan Karakteristik Pengguna

Pengguna GREENFLOW dibagi menjadi dua golongan sesuai hak akses dan kebutuhannya. Keduanya memakai basis data yang sama, tetapi menu dan kewenangannya berbeda.

**Tabel 2.1 Karakteristik Pengguna**

| Karakteristik | Admin | Pengguna |
|---|---|---|
| Peran utama | Mengelola sistem secara keseluruhan | Memantau dan mengoperasikan lahan sehari-hari |
| Contoh pelaksana | Staf Dinas Pertanian / petugas teknis | Petani / pengelola lahan sawi |
| Hak akses | Penuh: akun, lahan, perangkat, parameter, kalibrasi, seluruh data | Terbatas: dashboard, riwayat, laporan, notifikasi, mode, siram manual, profil |
| Tingkat pendidikan | Minimal SMA/sederajat | Tidak ada syarat khusus |
| Keahlian teknis | Paham web dan konsep dasar IoT | Cukup dapat memakai peramban atau ponsel |
| Frekuensi penggunaan | Sering, terutama saat konfigurasi dan pengecekan sistem | Rutin, misalnya harian untuk mengecek lahan |
| Pelatihan | Pelatihan singkat pengelolaan sistem | Panduan singkat penggunaan dashboard |

**Tabel 2.2 Matriks Hak Akses**

| Kemampuan | Admin | Pengguna |
|---|:---:|:---:|
| Register / login / logout / ubah profil & kata sandi | ✅ | ✅ |
| Dashboard (kelembapan, suhu, kelembapan udara, status pompa, grafik) | ✅ | ✅ |
| Riwayat penyiraman + filter | ✅ | ✅ |
| Laporan ringkas dan tren | ✅ | ✅ |
| Notifikasi | ✅ | ✅ |
| Lihat lahan dan perangkat | ✅ | ✅ |
| Ubah mode, siram manual, matikan pompa, reset cooldown | ✅ | ✅ |
| Kelola lahan, perangkat, parameter, kalibrasi | ✅ | ❌ |
| Kelola akun pengguna | ✅ | ❌ |
| Log aktivitas | ✅ | ❌ |

## 2.4 Lingkungan Operasi

### 2.4.1 Perangkat keras

| Komponen | Spesifikasi |
|---|---|
| Mikrokontroler | ESP32 DevKit (Wi-Fi 2,4 GHz) |
| Sensor kelembapan tanah | 3 × sensor kapasitif, output analog |
| Sensor suhu/kelembapan udara | DHT11 |
| Modul relay | 1 kanal, 5 V, aktif LOW (dapat disesuaikan) |
| Pompa air | DC 12 V |
| RTC | DS1307 (I2C) |
| Tampilan lokal | LCD I2C 16×2, alamat 0x27 (alternatif 0x3F) |
| Buzzer | Buzzer aktif 5 V |
| Catu daya | Adaptor 12 V + step-down 5 V |
| Pelindung | Kotak IP65 untuk ESP32, relay, dan sambungan kabel |
| Server | Linux x86_64 (fisik, VM, atau container) |
| Klien | Komputer, laptop, atau ponsel dengan peramban modern |

### 2.4.2 Perangkat lunak

| Lapisan | Teknologi |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, React Router 8, TanStack Query 5, React Hook Form + Zod, ApexCharts, i18next |
| Backend | Node.js ≥ 22.12, Express 5, TypeScript, Zod, Pino, Helmet, express-rate-limit, firebase-admin |
| Basis data | Firebase Authentication, Cloud Firestore, Realtime Database |
| Firmware | Arduino framework (C/C++), library DHT, LiquidCrystal_I2C, RTClib, HTTPClient, FreeRTOS |
| Komunikasi | HTTPS + REST + JSON |
| Alat bantu | Firebase Emulator Suite, Vitest, oxlint, ESLint |

### 2.4.3 Jaringan dan lingkungan fisik

- Koneksi internet stabil dan Wi-Fi 2,4 GHz di sekitar lahan. ESP32 tidak mendukung Wi-Fi 5 GHz.
- Lahan memiliki akses sumber air dan listrik.
- Perangkat lapangan dilindungi dari percikan air dan cuaca ekstrem.
- Server Express dan Firebase dapat diakses melalui HTTPS.
- Zona waktu tampilan: **WITA (Asia/Makassar)**; waktu baku disimpan dalam UTC.

## 2.5 Batasan Desain dan Implementasi

**Standar dokumen.** Penyusunan spesifikasi mengacu pada IEEE Std 830-1998.

**Perlindungan data.** Pengelolaan data akun admin dan pengguna mengikuti Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi. Data pribadi dibatasi pada nama dan email.

**Metode keputusan.** Penentuan durasi penyiraman pada mode otomatis wajib menggunakan **Fuzzy Sugeno orde-nol** dengan dua masukan (kelembapan tanah rata-rata dan suhu udara), tiga himpunan per masukan, sembilan aturan, dan keluaran berupa konstanta detik. Perhitungan dijalankan di **firmware ESP32**, bukan di server.

**Perangkat keras.** Pengendali yang digunakan adalah ESP32 dengan tiga sensor kelembapan tanah, DHT11, relay, dan pompa air sebagai komponen utama. RTC, LCD, dan buzzer bersifat pendukung operasional.

**Platform.** Aplikasi berbasis web dengan Firebase sebagai basis data terpusat dan Express sebagai satu-satunya pintu akses dari browser.

**Hak akses.** Hanya dua peran yang didukung, yaitu admin dan pengguna. Hanya admin yang boleh mengubah akun, lahan, perangkat, parameter, dan kalibrasi. Penegakan dilakukan di server.

**Ketergantungan sumber daya.** Sistem memerlukan air, listrik, dan koneksi internet untuk pemantauan dan kendali dari web. Bila koneksi terputus, penyiraman otomatis tetap berjalan di perangkat, tetapi data terbaru tidak tampil di aplikasi sampai koneksi pulih.

**Cakupan tanaman.** Sistem difokuskan pada sawi, sehingga parameter dan aturan fuzzy disesuaikan dengan kebutuhan air tanaman tersebut.

**Cakupan fungsi.** Sistem tidak menangani pemupukan, pengendalian hama dan penyakit, prakiraan cuaca, jual beli hasil panen, maupun surat-menyurat.

**Batasan Realtime Database.** Jalur data perangkat saat ini tetap `/irigasi` (belum `/irigasi/{kode}`), sehingga satu node dipakai satu perangkat.

**Batasan konfigurasi perangkat.** Firmware v4 belum membaca node `/config`. Perubahan parameter dan kalibrasi di aplikasi belum otomatis memengaruhi keputusan di perangkat sampai firmware diperbarui.

## 2.6 Dokumentasi Pengguna

Dokumentasi pengguna direncanakan berupa halaman **Bantuan** di dalam aplikasi (FR-60, UI-16). Halaman tersebut saat ini masih berupa *placeholder* dan belum berisi panduan. Sampai halaman itu tersedia, panduan operasional diberikan melalui:

1. README repositori (cara menjalankan, konfigurasi lingkungan, seed admin);
2. panduan singkat yang dibagikan saat pelatihan;
3. pesan bantuan kontekstual pada formulir (teks di bawah kolom isian).

---

# 3. Kebutuhan Antarmuka Eksternal

Bab ini menjelaskan bagaimana GREENFLOW berhubungan dengan pengguna, perangkat keras, layanan perangkat lunak, dan jaringan.

## 3.1 Antarmuka Pengguna

Antarmuka pengguna GREENFLOW berupa aplikasi web yang dibuka admin dan pengguna melalui peramban di komputer atau ponsel. Pengguna di lapangan (petani atau pengelola lahan sawi) bisa saja belum terbiasa dengan teknologi, sehingga tampilan dibuat sederhana dan langsung ke inti. Menu yang muncul dibedakan menurut hak akses, dan penolakan akses tetap dilakukan di server.

### 3.1.1 Karakteristik umum antarmuka

- Aplikasi dapat dibuka melalui peramban modern: Google Chrome, Mozilla Firefox, atau Microsoft Edge versi terkini.
- Tampilan responsif, menyesuaikan layar komputer/laptop dan ponsel. Lebar minimum yang didukung 360 piksel; resolusi acuan desktop 1366 × 768 piksel.
- Seluruh teks, label, dan pesan memakai Bahasa Indonesia yang sederhana. Istilah teknis seperti “Fuzzy Sugeno” tidak ditampilkan sebagai istilah utama kepada pengguna; yang ditampilkan adalah hasilnya (status pompa, durasi, rekomendasi durasi).
- Setiap peran memiliki satu halaman utama (dashboard). Menu admin tidak ditampilkan untuk pengguna, dan akses langsung melalui URL tetap ditolak server (E-03).
- Data status perangkat diperbarui otomatis setiap 5 detik tanpa memuat ulang halaman.
- Tersedia mode terang dan gelap yang tersimpan pada preferensi peramban.
- Tombol dan pesan konsisten dengan Tabel 3.3 dan Tabel 3.5.

### 3.1.2 Standar tampilan (*style guide*)

**Tabel 3.1 Standar Tampilan Antarmuka**

| Elemen | Ketentuan |
|---|---|
| **Warna utama** | Hijau `#2E7D32` (`brand-600`), dengan skala `brand-50` sampai `brand-950`. Latar putih atau abu-abu muda; teks gelap dengan kontras minimal 4,5 : 1. |
| **Warna status kelembapan** | **Kering = merah**, **Normal = hijau**, **Basah = biru**. Setiap warna selalu disertai label teks sehingga informasi tidak bergantung pada warna saja. |
| **Huruf** | Sans-serif yang jelas. Teks isi minimal 14 piksel (16 piksel di ponsel); judul halaman 20–24 piksel. |
| **Tata letak** | Header berisi identitas GREENFLOW, nama akun, pemilih tema, dan tombol keluar. Menu di sisi kiri pada desktop dan berubah menjadi tombol (hamburger) pada ponsel. |
| **Data utama** | Kelembapan tanah ditampilkan dalam persen berukuran besar beserta label kategori; status pompa dalam teks “Menyala”/“Mati”; tren kelembapan dalam grafik garis dengan garis ambang batas. |
| **Tabel data** | Riwayat diurutkan dari yang terbaru, 10 baris per halaman, dan dapat disaring. |
| **Umpan balik** | Pesan berhasil berwarna hijau, pesan galat berwarna merah dan ditempatkan dekat kolom atau di bagian atas halaman. |
| **Bahasa dan penulisan** | Bahasa Indonesia baku, singkat, tanpa singkatan yang tidak umum. |

### 3.1.3 Daftar halaman antarmuka

**Tabel 3.2 Daftar Halaman Antarmuka Pengguna**

| Kode | Halaman | Rute | Aktor | Isi dan elemen utama | Status |
|---|---|---|---|---|---|
| **UI-01** | Masuk | `/signin` | Publik | Kolom email, kata sandi, tombol Masuk, tautan Daftar dan Lupa kata sandi. | ✅ |
| **UI-02** | Daftar | `/signup` | Publik | Nama, email, kata sandi, konfirmasi kata sandi. Akun baru berperan `pengguna`. | ✅ |
| **UI-03** | Lupa kata sandi | `/reset-password` | Publik | Kolom email, tombol kirim tautan reset. | ✅ |
| **UI-04** | Dashboard | `/` | Admin, pengguna | Kartu kelembapan tanah (persen + label + S1–S3), suhu, kelembapan udara, status pompa, mode, cooldown, penyiraman terakhir, informasi perangkat (uptime, RSSI, status DHT, waktu pembaruan), dan grafik tren. | ✅ |
| **UI-05** | Lahan | `/lahan` | Admin (ubah), pengguna (lihat) | Daftar lahan, pencarian, tambah/ubah/hapus. | ✅ |
| **UI-06** | Perangkat | `/perangkat` | Admin (ubah), pengguna (lihat) | Daftar perangkat, filter lahan, tambah/ubah/hapus. | ✅ |
| **UI-07** | Penyiraman | `/penyiraman` | Admin, pengguna | Pilih lahan dan mode, siram manual dengan durasi, matikan pompa, ringkasan status. | ◐ |
| **UI-08** | Riwayat | `/riwayat` | Admin, pengguna | Tabel riwayat, filter lahan, paginasi. | ✅ |
| **UI-09** | Laporan | `/laporan` | Admin, pengguna | Ringkasan periode, tabel penyiraman, grafik tren kelembapan. | ◐ |
| **UI-10** | Parameter | `/parameter` | Admin | Formulir parameter penyiraman dan nilai keluaran fuzzy per lahan. | ◐ |
| **UI-11** | Kalibrasi | `/kalibrasi` | Admin | Pilih lahan/perangkat, nilai ADC kering dan basah, simpan, reset. | ◐ |
| **UI-12** | Notifikasi | `/notifikasi` | Admin, pengguna | Daftar notifikasi, filter tingkat, tandai dibaca, hapus. | ◐ |
| **UI-13** | Profil | `/profil` | Admin, pengguna | Ubah nama, ganti kata sandi. | ✅ |
| **UI-14** | Kelola pengguna | `/pengguna` | Admin | Daftar akun, pencarian, tambah, ubah, aktif/nonaktif, hapus, reset kata sandi. | ✅ |
| **UI-15** | Log aktivitas | `/audit` | Admin | Catatan aksi penting. | ○ placeholder |
| **UI-16** | Bantuan | `/bantuan` | Admin, pengguna | Panduan singkat penggunaan. | ○ placeholder |
| **UI-17** | 403 / 404 | — | Admin, pengguna | Halaman galat akses dan halaman tidak ditemukan. | ✅ |

> **Catatan.** UI-15 dan UI-16 saat ini menampilkan `PlaceholderPage` dan belum memiliki fungsi.

### 3.1.4 Standar tombol dan fungsi

**Tabel 3.3 Standar Tombol dan Fungsi**

| Tombol | Fungsi | Tampilan |
|---|---|---|
| **Masuk** | Memeriksa email dan kata sandi, lalu membuka dashboard. | Tombol hijau lebar penuh |
| **Daftar** | Membuat akun baru dengan peran `pengguna`. | Tombol hijau |
| **Keluar** | Mengakhiri sesi dan kembali ke halaman masuk. Tersedia di header. | Tombol putih di header |
| **Tambah** | Membuka formulir untuk menambah data (khusus admin untuk data master). | Tombol hijau |
| **Ubah** | Membuka formulir berisi data yang sudah ada. | Tombol biru atau ikon pensil |
| **Hapus** | Menghapus data setelah konfirmasi. | Tombol merah |
| **Simpan** | Menyimpan isian dan menampilkan pesan berhasil. | Tombol hijau |
| **Batal** | Menutup formulir tanpa menyimpan. | Tombol abu-abu |
| **Siram** | Memulai penyiraman manual sesuai durasi yang dipilih. | Tombol hijau |
| **Matikan pompa** | Menghentikan pompa yang sedang menyala. | Tombol merah |
| **Mode Otomatis/Manual** | Mengubah mode kendali perangkat. | Pemilih (segmented/select) |
| **Cari / Saring** | Menyaring daftar atau riwayat. | Kolom isian dan tombol |
| **Tandai dibaca** | Menandai notifikasi sebagai sudah dibaca. | Ikon/teks |
| **Bantuan (?)** | Menampilkan panduan singkat. | Ikon tanda tanya di menu |

### 3.1.5 Pintasan keyboard

**Tabel 3.4 Pintasan Keyboard**

| Tombol | Fungsi |
|---|---|
| **Tab / Shift + Tab** | Berpindah ke kolom atau tombol berikutnya/sebelumnya |
| **Enter** | Mengirim formulir yang sedang aktif (Masuk atau Simpan) |
| **Esc** | Menutup kotak dialog atau formulir tanpa menyimpan |

### 3.1.6 Pesan galat dan pesan sistem

Pesan ditulis dengan bahasa yang mudah dipahami dan memberi tahu langkah yang dapat dilakukan. Pesan galat tampil berwarna merah di dekat kolom atau di bagian atas halaman; pesan berhasil tampil berwarna hijau.

**Tabel 3.5 Daftar Pesan Galat**

| Kode | Kondisi | Pesan yang ditampilkan |
|---|---|---|
| **E-01** | Kolom wajib masih kosong atau format tidak valid. | “Kolom ini wajib diisi.” / pesan validasi spesifik |
| **E-02** | Email atau kata sandi salah. | “Email atau kata sandi salah. Silakan coba lagi.” |
| **E-03** | Pengguna membuka halaman di luar hak aksesnya. | “Anda tidak memiliki hak akses untuk tindakan ini.” |
| **E-04** | Sesi login sudah habis atau akun dinonaktifkan. | “Sesi Anda telah berakhir. Silakan masuk kembali.” |
| **E-05** | Data terbaru dari lahan belum diterima server. | “Data sudah usang. Periksa koneksi perangkat.” |
| **E-06** | Aplikasi tidak dapat terhubung ke server. | “Layanan sedang sibuk. Silakan coba beberapa saat lagi.” |
| **E-07** | Nilai parameter tidak valid. | “Nilai tidak valid. Periksa rentang dan urutan ambang.” |
| **E-08** | Data yang akan dihapus masih terhubung dengan data lain. | “Data tidak dapat dihapus karena masih digunakan oleh data lain.” |

Kode teknis tambahan yang dipakai API: `AUTH_REQUIRED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL`. Frontend memetakan kode teknis tersebut ke pesan E-01…E-08 yang sesuai.

### 3.1.7 Prinsip aksesibilitas dan kegunaan

- Setiap status warna disertai label teks.
- Semua formulir memiliki label yang terhubung ke kolom isian.
- Fokus keyboard terlihat; dialog dapat ditutup dengan Esc.
- Tombol aksi berbahaya (hapus, matikan pompa) meminta konfirmasi.
- Jumlah klik dari dashboard ke fitur utama tidak lebih dari tiga.

## 3.2 Antarmuka Perangkat Keras

Antarmuka perangkat keras menjelaskan perangkat fisik yang berhubungan langsung dengan GREENFLOW dan cara perangkat tersebut terhubung.

### 3.2.1 Komponen perangkat keras utama

**Tabel 3.6 Komponen Perangkat Keras Utama**

| No | Komponen | Jenis/Model | Fungsi utama |
|---:|---|---|---|
| 1 | Mikrokontroler | ESP32 DevKit | Membaca sensor, menghitung fuzzy, mengendalikan relay, berkomunikasi dengan RTDB. |
| 2 | Sensor kelembapan tanah | 3 × kapasitif (v1.2/v2.0) | Mengukur kadar air media tanam; rata-rata menjadi masukan fuzzy. |
| 3 | Sensor suhu & kelembapan udara | DHT11 | Mengukur suhu dan RH sekitar tanaman; suhu menjadi masukan fuzzy. |
| 4 | Modul relay | 1 kanal, 5 V | Menyambung/memutus daya pompa. |
| 5 | Pompa air | DC 12 V | Mengalirkan air dari sumber ke tanaman. |
| 6 | RTC | DS1307 (I2C) | Memberi waktu lokal untuk cap waktu dan LCD. |
| 7 | LCD | I2C 16×2, alamat 0x27 | Menampilkan status lokal (kelembapan, mode, pompa, waktu). |
| 8 | Buzzer | Aktif 5 V | Pola bunyi untuk boot, Wi-Fi, penyiraman, dan galat sensor. |
| 9 | Catu daya | Adaptor 12 V + step-down 5 V | Memberi daya ESP32, relay, pompa, dan modul lain. |
| 10 | Kotak pelindung | IP65 | Melindungi elektronik dari air, debu, dan panas. |
| 11 | Server | Linux x86_64 | Menjalankan Express dan mengakses Firebase. |
| 12 | Perangkat klien | Komputer/laptop/ponsel | Mengakses aplikasi web melalui peramban. |
| 13 | Jaringan | Wi-Fi 2,4 GHz + internet | Jalur data ESP32 ↔ RTDB dan peramban ↔ server. |

> **Perubahan dari v1.0.** DHT22 diganti **DHT11**. Jumlah sensor tanah menjadi **tiga**. Ditambahkan **RTC DS1307**, **LCD I2C 16×2**, dan **buzzer**. Sensor hujan, sensor level air, sensor aliran air, katup solenoid, dan panel surya **dihapus** dari daftar komponen v1.

### 3.2.2 Penempatan pin dan sambungan

**Tabel 3.7 Penempatan Pin dan Sambungan Perangkat**

| Perangkat | Pin perangkat | Pin ESP32 | Jenis sinyal | Keterangan |
|---|---|---|---|---|
| Sensor tanah S1 | VCC, GND, AOUT | 3V3, GND, **GPIO34** (ADC1) | Analog 0–3,3 V | Nilai ADC dikonversi ke persen memakai kalibrasi S1. |
| Sensor tanah S2 | VCC, GND, AOUT | 3V3, GND, **GPIO35** (ADC1) | Analog 0–3,3 V | Nilai ADC dikonversi ke persen memakai kalibrasi S2. |
| Sensor tanah S3 | VCC, GND, AOUT | 3V3, GND, **GPIO32** (ADC1) | Analog 0–3,3 V | Nilai ADC dikonversi ke persen memakai kalibrasi S3. |
| DHT11 | VCC, GND, DATA | 3V3, GND, **GPIO4** | Digital satu kabel | Pull-up 10 kΩ. |
| Modul relay | VCC, GND, IN | 5 V (VIN), GND, **GPIO26** | Digital keluaran | Relay aktif LOW (bawaan firmware). Kondisi awal mati. |
| Pompa air | + dan − | Tidak langsung ke ESP32 | Daya DC 12 V | Disuplai melalui kontak relay; dioda flyback pada pompa. |
| Buzzer | + dan − | GND, **GPIO25** | Digital keluaran | Buzzer aktif; polaritas dapat diubah pada firmware. |
| RTC DS1307 | VCC, GND, SDA, SCL | 3V3, GND, **GPIO21**, **GPIO22** | I2C | Alamat 0x68. |
| LCD I2C | VCC, GND, SDA, SCL | 5 V, GND, **GPIO21**, **GPIO22** | I2C | Alamat 0x27 (alternatif 0x3F); berbagi bus I2C dengan RTC. |

> **Catatan ADC.** Ketiga sensor memakai pin **ADC1** karena pin ADC2 pada ESP32 tidak dapat dipakai saat Wi-Fi aktif. Nilai mentah ≤ 200 dianggap kabel putus dan diabaikan. Nilai mentah ≥ 3500 dianggap sensor di udara.

### 3.2.3 Ketentuan pemasangan dan keselamatan

- ESP32, relay, RTC, dan sambungan kabel diletakkan di dalam kotak pelindung IP65. Hanya ujung sensor tanah yang ditanam; bagian elektronik tidak boleh terbenam.
- Pompa DC 12 V diberi dioda flyback untuk meredam lonjakan tegangan saat relay memutus arus.
- Seluruh GND disatukan agar sinyal analog stabil.
- Jaringan di sekitar lahan harus menyediakan pita 2,4 GHz.
- Perangkat klien hanya membutuhkan peramban modern dan koneksi internet.
- Pengaman perangkat (ditegakkan di firmware):
  - durasi penyiraman otomatis maksimum **10 detik**;
  - durasi penyiraman manual maksimum **15 detik**;
  - cooldown otomatis **300 detik** setelah penyiraman selesai;
  - durasi minimum untuk memulai penyiraman **1 detik**;
  - pompa tidak menyala saat perangkat baru dinyalakan atau dimulai ulang.

## 3.3 Antarmuka Perangkat Lunak

### 3.3.1 Pola umum

- Browser **tidak pernah** mengakses Firebase secara langsung. Semua akses melewati Express.
- Express memakai Firebase Admin SDK dengan kredensial server.
- Komunikasi memakai HTTPS, REST, dan JSON.
- Autentikasi sesi memakai cookie `__session` (httpOnly, SameSite, Secure di produksi) yang berlaku 7 hari.
- Setiap respons galat mengikuti bentuk:

```json
{
  "error": {
    "code": "E-03",
    "message": "Anda tidak memiliki hak akses untuk tindakan ini.",
    "fields": [{ "field": "nama", "issue": "Wajib diisi" }]
  }
}
```

### 3.3.2 Antarmuka Firebase

| Layanan | Pemakaian |
|---|---|
| **Firebase Authentication** | Menyimpan akun, kata sandi (dikelola Firebase), custom claim `role`, status aktif/nonaktif. |
| **Cloud Firestore** | Koleksi `users`, `lahan`, `devices`, `readings`, `readingRollups`, `waterings`, `commands`, `notifications`, `notificationReads`, `calibrations`, `auditLogs`. |
| **Realtime Database** | Node `/irigasi/status`, `/irigasi/kontrol`, `/irigasi/riwayat`, `/irigasi/config`. |
| **Aturan keamanan** | Menolak akses langsung dari klien; hanya Admin SDK (server) dan kredensial perangkat yang diizinkan. |

### 3.3.3 API REST Express

Semua endpoint memakai prefix `/api/v1`.

**Autentikasi dan profil**

| Metode | Endpoint | Akses | Fungsi |
|---|---|---|---|
| POST | `/auth/register` | Publik | Registrasi akun baru (peran `pengguna`). |
| POST | `/auth/login` | Publik | Masuk dan membuat cookie sesi. |
| POST | `/auth/forgot-password` | Publik | Kirim email reset kata sandi. |
| GET | `/auth/me` | Login | Data pengguna aktif. |
| POST | `/auth/logout` | Login | Mengakhiri sesi. |
| PATCH | `/profile` | Login | Ubah nama profil. |
| POST | `/profile/change-password` | Login | Ganti kata sandi dengan verifikasi sandi lama. |

**Pengguna (admin)**

| Metode | Endpoint | Akses | Fungsi |
|---|---|---|---|
| GET | `/users` | Admin | Daftar akun (paginasi, pencarian). |
| POST | `/users` | Admin | Tambah akun. |
| GET | `/users/:id` | Admin | Detail akun. |
| PATCH | `/users/:id` | Admin | Ubah nama/peran. |
| DELETE | `/users/:id` | Admin | Hapus akun. |
| POST | `/users/:id/disable` | Admin | Nonaktifkan akun. |
| POST | `/users/:id/enable` | Admin | Aktifkan akun. |
| POST | `/users/:id/reset-password` | Admin | Picu reset kata sandi. |

**Lahan, perangkat, parameter, kalibrasi**

| Metode | Endpoint | Akses | Fungsi |
|---|---|---|---|
| GET | `/lahan` | Login | Daftar lahan. |
| POST | `/lahan` | Admin | Tambah lahan. |
| GET | `/lahan/:lahanId` | Login | Detail lahan. |
| PUT | `/lahan/:lahanId` | Admin | Ubah lahan. |
| DELETE | `/lahan/:lahanId` | Admin | Hapus lahan (ditolak bila masih dipakai). |
| GET | `/devices` | Login | Daftar perangkat (filter `lahanId`). |
| POST | `/devices` | Admin | Tambah perangkat. |
| GET | `/devices/:deviceId` | Login | Detail perangkat. |
| PUT | `/devices/:deviceId` | Admin | Ubah perangkat. |
| DELETE | `/devices/:deviceId` | Admin | Hapus perangkat. |
| GET | `/parameter/:lahanId` | Login | Parameter penyiraman dan fuzzy. |
| PUT | `/parameter/:lahanId` | Admin | Ubah parameter. |
| POST | `/kalibrasi` | Admin | Buat data kalibrasi. |
| GET | `/kalibrasi/lahan/:lahanId` | Login | Kalibrasi per lahan. |
| GET | `/kalibrasi/:deviceId` | Login | Kalibrasi per perangkat. |
| PUT | `/kalibrasi/:deviceId` | Admin | Ubah kalibrasi. |
| POST | `/kalibrasi/:deviceId/reset` | Admin | Reset kalibrasi ke bawaan. |

**Pemantauan, penyiraman, laporan**

| Metode | Endpoint | Akses | Fungsi |
|---|---|---|---|
| GET | `/realtime/status` | Login | Payload status terbaru dari `/irigasi/status`. |
| GET | `/realtime/devices` | Login | Status beberapa sensor sekaligus. |
| GET | `/realtime/devices/:sensorId` | Login | Status satu sensor. |
| GET | `/readings` | Login | Daftar sampel pembacaan. |
| GET | `/readings/latest/:perangkatId` | Login | Sampel terbaru per perangkat. |
| GET | `/readings/lahan/:lahanId` | Login | Sampel terbaru per lahan. |
| GET | `/waterings` | Login | Riwayat penyiraman (filter `lahanId`, paginasi). |
| GET | `/kontrol` | Login | Status node `/irigasi/kontrol` saat ini. |
| POST | `/kontrol` | Login | Kirim perintah `on`/`off`/`mode` ke RTDB (tanpa durasi). |
| POST | `/waterings/trigger` | Login | Alias lama untuk menyalakan pompa (`on`). |
| GET | `/waterings/stats/:lahanId` | Login | Statistik penyiraman. |
| GET | `/laporan/overview/:lahanId` | Login | Ringkasan laporan per periode. |
| GET | `/laporan/waterings/:lahanId` | Login | Laporan penyiraman per periode. |
| GET | `/laporan/moisture-trend/:lahanId` | Login | Tren kelembapan per periode. |
| GET | `/notifikasi` | Login | Daftar notifikasi. |
| POST | `/notifikasi` | Login | Membuat notifikasi. |
| PUT | `/notifikasi/:notifId/baca` | Login | Tandai dibaca. |
| DELETE | `/notifikasi/:notifId` | Login | Hapus notifikasi. |
| POST | `/telemetry` | Tanpa sesi (endpoint perangkat) | Menerima telemetry dari perangkat/simulator. |
| GET | `/telemetry/status` | Tanpa sesi | Status telemetry. |
| GET | `/telemetry/history` | Tanpa sesi | Riwayat telemetry. |

> **Catatan keamanan.** Endpoint `/telemetry` belum memakai autentikasi perangkat dan perlu dikunci sebelum produksi (lihat NFR-05).

### 3.3.4 Kontrak data Realtime Database

**Tabel 3.8 Node Realtime Database**

| Node | Penulis | Isi | Keterangan |
|---|---|---|---|
| `/irigasi/status` | ESP32, ditimpa tiap 5 detik | `tanah` (`s1`,`s2`,`s3` → `raw`,`pct`; `rata`; `kategori`), `udara` (`suhu`,`rh`,`dht_ok`), `fuzzy_detik`, `mode`, `pompa`, `cooldown_detik`, `siram_terakhir`, `waktu`, `wifi_rssi`, `uptime_s`, `ts` | Hanya data terbaru, tanpa riwayat. |
| `/irigasi/kontrol` | Express | `mode` (`auto`/`manual`), `aksi` (`on`/`off`/`siram`/`reset`/`""`), `detik`, `id` | ESP32 membaca tiap 2 detik; aksi dijalankan sekali saat `id` berubah. |
| `/irigasi/riwayat` | ESP32 | `waktu`, `durasi_detik`, `mode`, `tanah_awal`, `suhu`, `alasan`, `ts` | Satu entri per penyiraman selesai. |
| `/irigasi/config` 🔧 | Express | Ambang, durasi maksimum, cooldown, kalibrasi | **Belum dibaca firmware v4.** |

Contoh payload `/irigasi/status`:

```json
{
  "tanah": {
    "s1": { "raw": 2100, "pct": 58.2 },
    "s2": { "raw": 2050, "pct": 61.0 },
    "s3": { "raw": 2200, "pct": 52.4 },
    "rata": 57.2,
    "kategori": "Normal"
  },
  "udara": { "suhu": 28.3, "rh": 81, "dht_ok": true },
  "fuzzy_detik": 3.0,
  "mode": "auto",
  "pompa": false,
  "cooldown_detik": 0,
  "siram_terakhir": "2026-11-03 14:02:11",
  "waktu": "2026-11-03 14:07:45",
  "wifi_rssi": -62,
  "uptime_s": 86400,
  "ts": 1793695665
}
```

## 3.4 Antarmuka Komunikasi

**Tabel 3.9 Protokol dan Format Komunikasi**

| Jalur | Protokol | Format | Frekuensi | Catatan |
|---|---|---|---|---|
| ESP32 → Realtime Database | HTTPS REST | JSON | Tulis `/status` tiap 5 detik; tulis `/riwayat` saat selesai | Memakai kredensial database perangkat. |
| ESP32 ← Realtime Database | HTTPS REST | JSON | Baca `/kontrol` tiap 2 detik | Aksi dijalankan sekali per perubahan `id`. |
| Browser ↔ Express | HTTPS REST | JSON | Sesuai aksi pengguna; polling status tiap 5 detik | Cookie `__session`. |
| Express ↔ Firestore | Firebase Admin SDK | Dokumen | Sesuai permintaan | Server-side. |
| Express ↔ Realtime Database | Firebase Admin SDK | JSON | Saat membaca status/menulis kontrol | Server-side. |
| Express ↔ Firebase Auth | Firebase Admin SDK + REST | JSON | Saat login/registrasi/reset | Verifikasi kata sandi melalui REST. |

Ketentuan umum:

- Semua komunikasi memakai TLS 1.2 atau lebih baru.
- Waktu disimpan dalam UTC (epoch atau ISO-8601); tampilan dikonversi ke WITA.
- Permintaan yang mengubah data memakai metode POST/PUT/PATCH/DELETE dan dilindungi pemeriksaan Origin/CSRF.
- Percobaan login dibatasi 5 kali per menit per kombinasi IP + email; registrasi 10 kali per jam per IP; lupa kata sandi 5 kali per jam per IP.

---

# 4. Kebutuhan Fungsional

Bab ini memuat daftar kebutuhan fungsional beserta prioritas dan status implementasi. Penomoran mempertahankan ID yang dipakai pada PRD agar dapat dilacak. ID yang tidak muncul (misalnya FR-08, FR-09, FR-17–FR-19, FR-25–FR-29) adalah kebutuhan SRS v1.0 yang **dihapus** karena berasal dari proyek perumahan/RTH atau sudah digantikan oleh kebutuhan lain.

**Prioritas:** M = *Must*, S = *Should*, C = *Could*.

**Status:** ✅ terimplementasi · ◐ sebagian · 🔧 menunggu firmware · ○ belum/placeholder.

## 4.1 Autentikasi dan Akun

**Tabel 4.1 Kebutuhan Autentikasi dan Akun**

| ID | Kebutuhan | Penjelasan | Prio | Status |
|---|---|---|:-:|:-:|
| FR-01 | Registrasi akun | Formulir nama, email, kata sandi, dan konfirmasi. Akun baru berperan `pengguna`, langsung aktif, email unik. Kata sandi minimal 8 karakter. | M | ✅ |
| FR-02 | Login | Email + kata sandi. Setelah berhasil diarahkan ke dashboard. Sesi berakhir otomatis dan menghasilkan E-04. | M | ✅ |
| FR-03 | Logout | Tombol keluar di header setiap halaman; sesi diakhiri dan cookie dihapus. | M | ✅ |
| FR-04 | Lupa/reset kata sandi | Kirim tautan reset ke email melalui Firebase Authentication. Respons disamarkan agar tidak membocorkan status pendaftaran. | S | ✅ |
| FR-05 | Profil | Ubah nama tampilan dan ganti kata sandi dengan verifikasi kata sandi lama. | S | ✅ |
| FR-06 | Kelola akun (admin) | Daftar + cari, tambah, ubah nama/peran, aktif/nonaktif, hapus dengan konfirmasi, picu reset kata sandi. Admin terakhir tidak boleh dihapus atau diturunkan perannya. | M | ✅ |
| FR-07 | Penonaktifan akun | Akun nonaktif tidak dapat login; sesi yang sedang berjalan dicabut. | M | ✅ |

**Kriteria penerimaan FR-01…FR-07**

1. Registrasi dengan email yang sudah terdaftar menampilkan pesan jelas dan tidak membuat akun ganda.
2. Kata sandi kurang dari 8 karakter ditolak dengan pesan validasi.
3. Pengguna biasa yang memanggil endpoint `/users` menerima HTTP 403 dan antarmuka menampilkan E-03.
4. Menghapus akun selalu meminta konfirmasi.
5. Akun yang dinonaktifkan langsung kehilangan akses pada permintaan berikutnya.

## 4.2 Dashboard dan Pemantauan

**Tabel 4.2 Kebutuhan Dashboard dan Pemantauan**

| ID | Kebutuhan | Penjelasan | Prio | Status |
|---|---|---|:-:|:-:|
| FR-10 | Kartu kelembapan tanah | Persen rata-rata berukuran besar + label **Kering/Normal/Basah/Sensor lepas** + warna; rincian **tiga sensor** (S1–S3: persen dan nilai mentah). | M | ✅ |
| FR-11 | Kartu status pompa | Status “Menyala”/“Mati”, mode Otomatis/Manual, dan sisa cooldown (detik). | M | ✅ |
| FR-12 | Kartu penyiraman terakhir dan status perangkat | Waktu dan durasi penyiraman terakhir; status online/offline, kekuatan Wi-Fi (RSSI), lama menyala (uptime). | M | ✅ |
| FR-13 | Grafik tren kelembapan | Grafik garis kelembapan rata-rata per periode dengan garis ambang batas. Sumber data adalah sampel yang disimpan server. | M | ◐ |
| FR-14 | Pembaruan otomatis | Data status diperbarui tiap 5 detik tanpa memuat ulang; menampilkan waktu pembaruan terakhir dan peringatan E-05 bila data basi. | M | ✅ |
| FR-15 | Ringkasan semua lahan | Jumlah perangkat online, lahan kering, aktivitas terbaru. | S | ○ |
| FR-16 | Kartu udara dan rekomendasi fuzzy | Suhu (°C), kelembapan udara (%), indikator DHT ok/error, dan durasi rekomendasi fuzzy saat ini (`fuzzy_detik`). | M | ✅ |

**Aturan label kelembapan (firmware v4).** Label tampilan ditentukan terpisah dari himpunan fuzzy:

| Label | Rentang | Warna |
|---|---|---|
| Kering | < 30% | Merah |
| Normal | 30%–78% | Hijau |
| Basah | > 78% | Biru |
| Sensor lepas | Semua sensor tidak valid | Abu-abu |

**Kriteria penerimaan FR-10…FR-16**

1. Dashboard menampilkan angka rata-rata, label, dan tiga nilai sensor dalam satu tampilan tanpa membuka halaman lain.
2. Bila `/irigasi/status` tidak ada atau `ts` sudah lama, dashboard menampilkan indikator data usang, bukan angka palsu.
3. Nilai `fuzzy_detik` yang ditampilkan sama dengan yang tertulis di RTDB.

## 4.3 Kontrol Penyiraman

**Tabel 4.3 Kebutuhan Kontrol Penyiraman**

| ID | Kebutuhan | Penjelasan | Prio | Status |
|---|---|---|:-:|:-:|
| FR-20 | Pilih mode | Mengubah mode perangkat menjadi `auto` atau `manual` melalui `/irigasi/kontrol`. | M | ✅ |
| FR-21 | Kontrol pompa ON/OFF | Pilih lahan, tekan **Nyalakan Pompa** atau **Matikan Pompa**; tidak ada isian durasi. | M | ✅ |
| FR-22 | Blokir perintah tidak valid | Perintah ON ditolak bila pompa sudah menyala; perintah OFF ditolak bila pompa sudah mati; perangkat offline ditandai pada antarmuka. | S | ✅ |
| FR-23 | Umpan balik perintah | Status “menunggu perangkat → dijalankan” berdasarkan perubahan status pompa; perintah memakai `id` yang naik secara atomik. | M | ◐ |
| FR-24 | Kembali ke mode otomatis | Tombol **Aktifkan Mode Otomatis** tersedia saat perangkat berada pada mode manual. | S | ✅ |

**Catatan implementasi FR-20…FR-24**

- Halaman `/penyiraman` mengirim perintah ke `POST /api/v1/kontrol` dengan aksi `on`, `off`, atau `mode`.
- Kontrol manual hanya berupa tombol **ON/OFF pompa**, tanpa isian waktu/durasi.
- Backend menulis langsung ke **Realtime Database `/irigasi/kontrol`** dengan bentuk `{ mode, aksi, detik: 0, id }`, sesuai kontrak firmware v4.
- `id` dinaikkan secara atomik melalui transaksi RTDB agar setiap perintah hanya dijalankan sekali oleh firmware.
- Aksi `on` memaksa `mode: "manual"`; aksi `off` mempertahankan mode yang sedang berjalan.
- Perintah yang menyertakan field `detik` ditolak oleh validasi (skema ketat) karena durasi tidak lagi didukung.
- Setiap perintah dicatat pada koleksi Firestore `commands` (status `menunggu`) dan `auditLogs` untuk jejak.
- Perintah juga dicerminkan ke dokumen Firestore `irigasi/kontrol` agar terlihat di konsol, sedangkan perangkat tetap membaca RTDB.
- Umpan balik masih bersifat heuristik: status pompa dibaca dari `/irigasi/status`; belum ada pengakuan (`ack`) eksplisit dari perangkat.

**Kriteria penerimaan FR-20…FR-24**

1. Perintah ON/OFF menghasilkan perubahan `pompa` pada `/status` dalam ≤ 10 detik.
2. Perintah yang sama tidak dijalankan dua kali (idempotensi melalui `id`).
3. Pompa tidak pernah menyala melebihi batas pengaman firmware.
4. Setiap penolakan menyebutkan alasan yang dapat ditindaklanjuti.

## 4.4 Riwayat dan Laporan

**Tabel 4.4 Kebutuhan Riwayat dan Laporan**

| ID | Kebutuhan | Penjelasan | Prio | Status |
|---|---|---|:-:|:-:|
| FR-30 | Riwayat penyiraman | Waktu mulai, durasi, pemicu (otomatis/manual), kelembapan awal, suhu, alasan berhenti, pelaku bila manual; urut terbaru; 10 baris/halaman; filter lahan dan tanggal. | M | ◐ |
| FR-31 | Laporan ringkas | Total siram, total durasi, rata-rata kelembapan dan suhu per rentang tanggal; tabel penyiraman dan tren kelembapan. | S | ◐ |
| FR-32 | Ekspor data | Ekspor riwayat/laporan/sampel ke CSV dan XLSX. | S | ○ |

**Catatan implementasi FR-30…FR-32**

- Riwayat menggabungkan dua sumber: koleksi Firestore `waterings` (aksi dari web) dan `riwayat_siram` (dikirim firmware setiap pompa selesai). Keduanya dipetakan ke bentuk respons yang sama, diurutkan `startedAt` menurun, lalu dipaginasi 20 baris per halaman.
- Filter lahan, jenis pemicu (`otomatis`/`manual`), serta rentang tanggal (`from`/`to`) diterapkan di backend sebelum paginasi.
- Kelembapan sesudah penyiraman tidak dikirim firmware; nilai awal dipakai sebagai pengganti agar tidak terbaca sebagai penurunan 100%.
- Laporan menyediakan tiga endpoint: ringkasan, penyiraman, dan tren kelembapan. Belum ada tombol ekspor atau pembuatan berkas.
- Laporan memakai sumber data yang sama dengan riwayat: koleksi `waterings` (aksi dari web) digabung dengan `riwayat_siram` (kiriman firmware). Ringkasan dan tabel penyiraman dihitung dari data dalam rentang tanggal terpilih.
- Tren kelembapan disusun dari tiga sumber nyata: koleksi `readings` bila tersedia (saat ini belum terisi), titik kejadian penyiraman memakai nilai `tanah_awal` pada `riwayat_siram`, dan satu titik status terbaru dari RTDB `/irigasi/status` bila waktunya masih dalam periode. Karena perangkat belum menyimpan telemetri kontinu, tren bersifat sparse (titik peristiwa, bukan kurva rapat) dan tidak diisi titik rekaan.
- Rata-rata suhu belum ditampilkan pada ringkasan karena suhu hanya tercatat saat penyiraman berlangsung; ringkasan menampilkan kelembapan min/rata-rata/maks.
- Rentang tanggal di antarmuka memakai awal hari lokal (`00:00:00`) untuk `from` dan akhir hari lokal (`23:59:59.999`) untuk `to`, agar seluruh data pada tanggal terpilih ikut terhitung.

**Kriteria penerimaan FR-30…FR-32**

1. Riwayat menampilkan data terbaru lebih dulu dan jumlah halaman sesuai total data.
2. Filter lahan mengubah isi tabel tanpa memuat ulang halaman.
3. Bila tidak ada data pada periode terpilih, tampil pesan kosong yang jelas (bukan tabel kosong tanpa penjelasan).
4. Ekspor menghasilkan berkas yang dapat dibuka di pengolah angka (target).

## 4.5 Notifikasi

**Tabel 4.5 Kebutuhan Notifikasi**

| ID | Kebutuhan | Penjelasan | Prio | Status |
|---|---|---|:-:|:-:|
| FR-40 | Notifikasi dalam aplikasi | Daftar notifikasi dengan tipe (`kering_soil`, `pump_failure`, `sensor_error`, `manual_trigger`, `system_alert`), tingkat (`info`/`warning`/`error`), status baca, dan aksi tandai dibaca/hapus. | M | ◐ |
| FR-41 | Tanpa notifikasi berulang | Kondisi yang sama tidak menghasilkan notifikasi baru sampai kondisi pulih. | M | ○ |
| FR-42 | Notifikasi email/WhatsApp | Kanal tambahan di luar aplikasi. | C | ○ |

**Catatan implementasi FR-40…FR-42**

- Backend menyediakan CRUD notifikasi (`GET`, `POST`, `PUT /:id/baca`, `DELETE`). Antarmuka menampilkan daftar, filter tingkat, dan aksi baca/hapus.
- **Pembuatan notifikasi otomatis** dari kondisi perangkat (tanah kering, sensor lepas, perangkat offline) belum terpasang. Notifikasi saat ini hanya muncul bila dibuat melalui API atau data seed.
- Histeresis yang direncanakan: aktif saat rata-rata < 30%, pulih saat > 35%.

## 4.6 Data Master dan Parameter

**Tabel 4.6 Kebutuhan Data Master dan Parameter**

| ID | Kebutuhan | Penjelasan | Prio | Status |
|---|---|---|:-:|:-:|
| FR-50 | Kelola lahan | Nama, lokasi/alamat, luas (opsional), status; tambah/ubah/hapus. | M | ✅ |
| FR-51 | Kelola perangkat | Kode unik, nama, tipe (`pengendali`/`sensor`/`pompa`), lahan, status. Satu perangkat mewakili satu ESP32 dengan tiga sensor tanah, DHT11, dan pompa. | M | ✅ |
| FR-52 | Identitas dan koneksi perangkat | Menampilkan jalur data, “terakhir terlihat”, dan versi firmware bila tersedia. Rahasia/kredensial tidak ditampilkan. | M | ◐ |
| FR-53 | Tolak hapus data terpakai | Penghapusan ditolak dengan E-08 bila data masih direferensikan; disarankan menonaktifkan. | M | ◐ |
| FR-54 🔧 | Parameter penyiraman | Ambang kering (30), ambang basah (78), durasi maksimum otomatis (10 s), durasi maksimum manual (15 s), cooldown (300 s). Validasi E-07. Disimpan di Firestore dan disalin ke `/config`. | M | ◐ |
| FR-55 🔧 | Parameter Fuzzy Sugeno | Titik trapesium himpunan tanah dan suhu, tabel keluaran 3×3 (detik), tombol kembalikan ke bawaan, dan pratinjau (tanah, suhu) → durasi. | M | ◐ |
| FR-56 🔧 | Kalibrasi sensor tanah | Nilai ADC kering dan basah per sensor (S1–S3), tombol “Gunakan nilai sekarang”, validasi kering > basah, riwayat kalibrasi, salin ke `/config`. | S | ◐ |

**Catatan implementasi FR-50…FR-56**

- Halaman Parameter saat ini mengelola `keringSec`, `lembapSec`, `basahSec`, `ambangKering`, `titikTengah`, dan `ambangCukup`. Ini **belum** mencakup seluruh 3×3 tabel aturan fuzzy maupun parameter durasi maksimum/cooldown.
- Halaman Kalibrasi mengelola `adcKering` dan `adcBasah` per perangkat serta menyediakan reset. Tombol “Gunakan nilai sekarang” belum ada.
- Perubahan parameter dan kalibrasi belum disinkronkan ke perangkat karena firmware v4 belum membaca `/config`. Sampai firmware diperbarui, halaman ini berfungsi sebagai penyimpanan konfigurasi dan pratinjau, bukan pengubah perilaku perangkat.

## 4.7 Fitur Pendukung

**Tabel 4.7 Kebutuhan Fitur Pendukung**

| ID | Kebutuhan | Penjelasan | Prio | Status |
|---|---|---|:-:|:-:|
| FR-60 | Halaman Bantuan | Panduan singkat membaca dashboard, mengelola lahan dan perangkat, mengatur parameter, serta memahami status penyiraman. | S | ○ |
| FR-61 | Log aktivitas (audit) | Catatan aksi penting: kelola akun, ubah parameter, siram manual, reset cooldown. Ditampilkan khusus admin. | S | ◐ |
| FR-62 | Mode terang dan gelap | Mengikuti tema TailAdmin, preferensi disimpan di peramban. | C | ✅ |

**Catatan implementasi FR-60…FR-62**

- Penulisan audit tersedia di backend (`lib/audit.ts`) dan dipakai pada sebagian aksi (login, pengelolaan pengguna, seed admin). Belum ada endpoint pembacaan audit dan halaman `/audit` masih placeholder.
- Halaman `/bantuan` masih placeholder.
- Mode terang/gelap berfungsi dan tersimpan pada `localStorage`.

## 4.8 Use Case

### UC-01 Login

**Aktor:** Admin dan Pengguna
**Kondisi awal:** Aktor memiliki akun aktif dan aplikasi dapat terhubung ke server.
**Kondisi akhir:** Aktor masuk dan memperoleh akses sesuai perannya, atau tetap di halaman masuk bila autentikasi gagal.

| Stimulus / Aksi Aktor atau Sistem | Respons Sistem |
|---|---|
| Aktor membuka halaman masuk. | Sistem menampilkan kolom email, kata sandi, tombol Masuk, serta tautan Daftar dan Lupa kata sandi. |
| Aktor mengisi email dan kata sandi. | Sistem memeriksa kelengkapan isian. |
| Aktor menekan Masuk. | Sistem mengirim kredensial ke server. |
| Kredensial benar dan akun aktif. | Sistem membuat cookie sesi dan mengarahkan aktor ke dashboard. |
| Aktor menekan Keluar. | Sistem mengakhiri sesi dan kembali ke halaman masuk. |

**Kondisi alternatif**

- Kolom kosong → pesan “Kolom ini wajib diisi.” (E-01).
- Kredensial salah → E-02.
- Akun nonaktif → E-04.
- Terlalu banyak percobaan → pesan pembatasan sementara (`RATE_LIMITED`).

### UC-02 Melihat Dashboard

**Aktor:** Admin dan Pengguna
**Kondisi awal:** Aktor sudah login.
**Kondisi akhir:** Aktor melihat kondisi lahan terbaru.

| Stimulus / Aksi Aktor atau Sistem | Respons Sistem |
|---|---|
| Aktor membuka Dashboard. | Sistem meminta status terbaru ke server. |
| Server membaca `/irigasi/status`. | Sistem mengirim kelembapan rata-rata, S1–S3, suhu, kelembapan udara, status pompa, mode, cooldown, dan waktu pembaruan. |
| Aktor melihat kartu ringkasan. | Sistem menampilkan persen, label kategori berwarna, status pompa, dan penyiraman terakhir. |
| Lima detik berlalu. | Sistem memperbarui data tanpa memuat ulang halaman. |
| Status tidak tersedia atau sudah lama. | Sistem menampilkan indikator data usang (E-05). |

### UC-03 Melihat Riwayat Penyiraman

**Aktor:** Admin dan Pengguna
**Kondisi awal:** Aktor login dan data riwayat tersedia.

| Stimulus / Aksi Aktor atau Sistem | Respons Sistem |
|---|---|
| Aktor membuka Riwayat. | Sistem menampilkan tabel riwayat terbaru. |
| Aktor memilih lahan. | Sistem memuat riwayat lahan tersebut. |
| Aktor berpindah halaman. | Sistem menampilkan data lanjutan sesuai paginasi. |

**Kondisi alternatif:** Tidak ada data → pesan “Belum ada riwayat penyiraman.”

### UC-04 Menerima Notifikasi

**Aktor:** Admin dan Pengguna
**Kondisi awal:** Aktor login dan terdapat notifikasi.

| Stimulus / Aksi Aktor atau Sistem | Respons Sistem |
|---|---|
| Aktor membuka Notifikasi. | Sistem menampilkan daftar notifikasi beserta tingkat dan waktu. |
| Aktor memfilter tingkat tertentu. | Sistem menampilkan notifikasi yang sesuai. |
| Aktor menandai notifikasi dibaca. | Sistem memperbarui status baca. |
| Aktor menghapus notifikasi. | Sistem menghapus setelah konfirmasi. |

> **Status:** antarmuka dan CRUD tersedia, tetapi pembuatan notifikasi otomatis dari kondisi perangkat belum ada.

### UC-05 Mengubah Mode Penyiraman

**Aktor:** Admin dan Pengguna
**Kondisi awal:** Aktor login dan perangkat terhubung.
**Kondisi akhir:** Mode perangkat berubah dan tercermin pada `/status`.

| Stimulus / Aksi Aktor atau Sistem | Respons Sistem |
|---|---|
| Aktor membuka halaman Penyiraman. | Sistem menampilkan mode saat ini dan status pompa. |
| Aktor memilih Otomatis atau Manual. | Sistem mengirim perintah mode ke server. |
| Server menulis perintah ke `/kontrol` dengan `id` baru. | ESP32 membaca perintah dan menerapkannya. |
| Perangkat menulis status baru. | Dashboard menampilkan mode yang sudah berubah. |

### UC-06 Menyiram Manual

**Aktor:** Admin dan Pengguna
**Kondisi awal:** Aktor login, lahan dipilih, pompa mati.
**Kondisi akhir:** Pompa menyala sesuai durasi lalu mati, dan riwayat tercatat.

| Stimulus / Aksi Aktor atau Sistem | Respons Sistem |
|---|---|
| Aktor memilih lahan. | Sistem menampilkan status lahan dan mode. |
| Aktor memasukkan durasi dan menekan Siram. | Sistem memvalidasi durasi dan mengirim permintaan. |
| Server menulis perintah siram. | Sistem menampilkan status “menunggu perangkat”. |
| ESP32 menjalankan perintah. | Status pompa berubah menjadi Menyala. |
| Durasi habis atau aktor menekan Matikan pompa. | Pompa mati dan status diperbarui. |

**Kondisi alternatif**

- Durasi di luar batas → E-07.
- Perangkat offline → pesan perangkat tidak terhubung (target FR-22).
- Pompa sedang menyala → permintaan ditolak (target FR-22).

### UC-07 Mengatur Parameter Penyiraman

**Aktor:** Admin
**Kondisi awal:** Admin login dan membuka Parameter.

| Stimulus / Aksi Aktor atau Sistem | Respons Sistem |
|---|---|
| Admin memilih lahan. | Sistem menampilkan parameter lahan. |
| Admin mengubah nilai. | Sistem menampilkan isian. |
| Admin menekan Simpan. | Sistem memvalidasi rentang dan urutan ambang. |
| Nilai valid. | Sistem menyimpan dan menampilkan pesan berhasil. |
| Nilai tidak valid. | Sistem menolak dan menampilkan E-07. |

> **Status:** penyimpanan berfungsi; penerapan ke perangkat menunggu dukungan `/config` pada firmware.

### UC-08 Mengatur Parameter Fuzzy

**Aktor:** Admin
**Kondisi awal:** Admin login dan membuka Parameter.

| Stimulus / Aksi Aktor atau Sistem | Respons Sistem |
|---|---|
| Admin membuka bagian fuzzy. | Sistem menampilkan nilai keluaran untuk Kering, Lembap, dan Basah. |
| Admin mengubah nilai keluaran. | Sistem menerima perubahan. |
| Admin menekan Simpan. | Sistem memvalidasi dan menyimpan. |
| Admin memakai pratinjau. | Sistem menghitung durasi dari pasangan (tanah, suhu) yang dimasukkan. |

> **Status:** penyimpanan nilai keluaran tersedia; editor lengkap titik trapesium dan tabel 3×3 belum tersedia.

### UC-09 Mengelola Akun Pengguna

**Aktor:** Admin
**Kondisi awal:** Admin login dan membuka Kelola Pengguna.

| Stimulus / Aksi Aktor atau Sistem | Respons Sistem |
|---|---|
| Admin membuka Kelola Pengguna. | Sistem menampilkan daftar akun dengan pencarian. |
| Admin menekan Tambah. | Sistem menampilkan formulir akun. |
| Admin menyimpan. | Sistem memvalidasi dan membuat akun. |
| Admin mengubah akun. | Sistem memperbarui nama/peran. |
| Admin menonaktifkan akun. | Sistem mencabut akses akun tersebut. |
| Admin menghapus akun. | Sistem meminta konfirmasi lalu menghapus. |
| Admin memicu reset kata sandi. | Sistem mengirim email reset. |

**Kondisi alternatif:** Admin terakhir tidak boleh dihapus/diturunkan → pesan penolakan.

### UC-10 Mengelola Lahan dan Perangkat

**Aktor:** Admin
**Kondisi awal:** Admin login.

| Stimulus / Aksi Aktor atau Sistem | Respons Sistem |
|---|---|
| Admin membuka Lahan atau Perangkat. | Sistem menampilkan daftar data. |
| Admin menambah data. | Sistem menampilkan formulir. |
| Admin menyimpan. | Sistem memvalidasi dan menyimpan. |
| Admin mengubah data. | Sistem menampilkan data terpilih untuk diperbarui. |
| Admin menghapus data. | Sistem meminta konfirmasi; penghapusan ditolak bila data masih dipakai (E-08). |

### UC-11 Mengkalibrasi Sensor Tanah

**Aktor:** Admin
**Kondisi awal:** Admin login dan perangkat terdaftar.

| Stimulus / Aksi Aktor atau Sistem | Respons Sistem |
|---|---|
| Admin memilih lahan dan perangkat. | Sistem menampilkan nilai kalibrasi saat ini. |
| Admin memasukkan ADC kering dan basah. | Sistem menampilkan isian. |
| Admin menyimpan. | Sistem memvalidasi kering > basah lalu menyimpan. |
| Admin mereset. | Sistem mengembalikan kalibrasi ke nilai bawaan setelah konfirmasi. |

> **Status:** tersimpan di Firestore; penerapan ke perangkat menunggu `/config`.

### UC-12 Melihat Laporan

**Aktor:** Admin dan Pengguna
**Kondisi awal:** Aktor login.

| Stimulus / Aksi Aktor atau Sistem | Respons Sistem |
|---|---|
| Aktor membuka Laporan. | Sistem menampilkan pemilih lahan dan periode. |
| Aktor memilih lahan dan periode. | Sistem memuat ringkasan, tabel penyiraman, dan grafik tren. |
| Tidak ada data. | Sistem menampilkan pesan bahwa data periode ini tidak tersedia. |

### UC-13 Mengekspor Data

**Aktor:** Admin dan Pengguna
**Status:** ○ belum diimplementasikan. Rencana: tombol Ekspor CSV/XLSX pada halaman Laporan dan Riwayat.

### UC-14 Registrasi

**Aktor:** Publik
**Kondisi awal:** Pengunjung membuka halaman Daftar.
**Kondisi akhir:** Akun baru berperan `pengguna` dan dapat langsung masuk.

| Stimulus / Aksi Aktor atau Sistem | Respons Sistem |
|---|---|
| Aktor membuka halaman Daftar. | Sistem menampilkan nama, email, kata sandi, konfirmasi. |
| Aktor mengisi dan menekan Daftar. | Sistem memvalidasi format dan kecocokan kata sandi. |
| Data valid dan email belum terdaftar. | Sistem membuat akun dan mengarahkan ke halaman masuk. |

**Kondisi alternatif:** Email sudah terdaftar → pesan jelas; kata sandi lemah → pesan validasi.

### UC-15 Mengelola Profil

**Aktor:** Admin dan Pengguna

| Stimulus / Aksi Aktor atau Sistem | Respons Sistem |
|---|---|
| Aktor membuka Profil. | Sistem menampilkan nama dan email. |
| Aktor mengubah nama lalu menyimpan. | Sistem memperbarui profil. |
| Aktor mengganti kata sandi. | Sistem memverifikasi kata sandi lama lalu menyimpan yang baru. |

### 4.8.1 Ringkasan Use Case

**Tabel 4.8 Daftar Use Case**

| Kode | Use Case | Aktor | Status |
|---|---|---|---|
| UC-01 | Login/Logout | Admin, Pengguna | ✅ |
| UC-02 | Melihat dashboard | Admin, Pengguna | ✅ |
| UC-03 | Melihat riwayat penyiraman | Admin, Pengguna | ◐ |
| UC-04 | Menerima notifikasi | Admin, Pengguna | ◐ |
| UC-05 | Mengubah mode penyiraman | Admin, Pengguna | ◐ |
| UC-06 | Menyiram manual | Admin, Pengguna | ◐ |
| UC-07 | Mengatur parameter penyiraman | Admin | ◐ |
| UC-08 | Mengatur parameter fuzzy | Admin | ◐ |
| UC-09 | Mengelola akun pengguna | Admin | ✅ |
| UC-10 | Mengelola lahan dan perangkat | Admin | ✅ |
| UC-11 | Mengkalibrasi sensor tanah | Admin | ◐ |
| UC-12 | Melihat laporan | Admin, Pengguna | ◐ |
| UC-13 | Mengekspor data | Admin, Pengguna | ○ |
| UC-14 | Registrasi | Publik | ✅ |
| UC-15 | Mengelola profil | Admin, Pengguna | ✅ |

## 4.9 Model Data dan Hubungan Antar-Kelas

Model data GREENFLOW mengikuti implementasi Firebase. “Kelas” pada bagian ini dipetakan ke koleksi Firestore atau node Realtime Database.

**Tabel 4.9 Kelas Data Utama**

| Kelas (koleksi/node) | Atribut utama | Tanggung jawab |
|---|---|---|
| **User** (`users/{uid}`) | `uid`, `nama`, `email`, `peran`, `status`, `dibuatPada`, `diperbaruiPada` | Menyimpan akun admin/pengguna dan peran untuk pembatasan akses. |
| **Lahan** (`lahan/{lahanId}`) | `id`, `nama`, `lokasi`, `luasM2`, `status`, `parameter`, `dibuatOleh`, `dibuatPada`, `diperbaruiPada`, `versiSkema` | Identitas lahan dan parameter penyiraman. |
| **Device** (`devices/{kode}`) | `id`, `nama`, `tipe`, `lahanId`, `status`, `statusTerakhir`, `config` | Perangkat ESP32 beserta sensor dan pompa pada satu lahan. |
| **Reading** (`readings/{kode}_{slot}`) | `perangkatId`, `lahanId`, `readAt`, `tanah`, `suhu`, `rh`, `fuzzy` | Sampel pembacaan untuk grafik dan laporan. |
| **ReadingRollup** (`readingRollups/{kode}_{yyyyMMddHH}`) | `perangkatId`, `jam`, `rataTanah`, `minTanah`, `maxTanah`, `rataSuhu`, `jumlahSampel` | Ringkasan per jam untuk menghemat kuota. |
| **Watering** (`waterings/{kode}_{pushId}`) | `lahanId`, `perangkatId`, `pemicu`, `dimintaOleh`, `startedAt`, `endedAt`, `durationSec`, `moistureBeforePct`, `moistureAfterPct`, `status`, `alasan` | Catatan siklus penyiraman. |
| **Command** (`commands/{id}`) | `perangkatId`, `mode`, `aksi`, `detik`, `id`, `dibuatOleh`, `dibuatPada`, `status` | Perintah dari web ke perangkat. |
| **Notification** (`notifications/{id}`) | `tipe`, `lahanId`, `perangkatId`, `pesan`, `severity`, `baca`, `dibuatPada` | Pemberitahuan kondisi sistem. |
| **NotificationRead** (`notificationReads/{uid}`) | `uid`, `terakhirDibaca` | Penanda notifikasi telah dibaca per pengguna. |
| **Calibration** (`calibrations/{id}`) | `deviceId`, `lahanId`, `adcKering`, `adcBasah`, `diperbaruiPada` | Nilai kalibrasi sensor tanah. |
| **AuditLog** (`auditLogs/{id}`) | `aktor`, `aksi`, `target`, `detail`, `waktu` | Jejak aksi penting untuk audit. |
| **DeviceStatus** (`/irigasi/status`) | `tanah`, `udara`, `fuzzy_detik`, `mode`, `pompa`, `cooldown_detik`, `waktu`, `wifi_rssi`, `uptime_s`, `ts` | Status terbaru dari perangkat (tanpa riwayat). |
| **DeviceControl** (`/irigasi/kontrol`) | `mode`, `aksi`, `detik`, `id` | Kotak surat perintah ke perangkat. |
| **DeviceHistory** (`/irigasi/riwayat`) | `waktu`, `durasi_detik`, `mode`, `tanah_awal`, `suhu`, `alasan`, `ts` | Riwayat penyiraman dari perangkat. |

### 4.9.1 Hubungan antar-kelas

```text
User (admin) 1 ──< Lahan (dibuatOleh)
Lahan 1 ──< Device (lahanId)
Lahan 1 ──1 Parameter (tertanam pada dokumen Lahan)
Device 1 ──< Reading (perangkatId)
Device 1 ──< Calibration (deviceId)
Device 1 ──< Command (perangkatId)
Device 1 ──< Watering (perangkatId)
Lahan 1 ──< Watering (lahanId)
Lahan 1 ──< Notification (lahanId)
User 1 ──< NotificationRead (uid)
User 1 ──< AuditLog (aktor)
```

Penjelasan:

- **User** memiliki peran `admin` atau `pengguna`. Hak akses ditentukan oleh peran dan ditegakkan di server.
- Satu **Lahan** memiliki banyak **Device**; setiap Device terdaftar pada tepat satu Lahan.
- Parameter penyiraman dan fuzzy tertanam pada dokumen **Lahan** (bukan koleksi terpisah).
- Satu **Device** menghasilkan banyak **Reading**, **Watering**, **Command**, dan **Calibration**.
- **Reading** menjadi masukan untuk grafik dan laporan, bukan untuk keputusan penyiraman (keputusan dihitung di perangkat dari data sensor langsung).
- **Watering** dihasilkan dari penyiraman yang dijalankan perangkat; salinannya dibuat oleh Express dari `/irigasi/riwayat`.
- **Notification** dapat merujuk pada Lahan dan/atau Device.
- **AuditLog** mencatat aksi penting pengguna dan sistem.

### 4.9.2 Aturan integritas data

1. `users.email` unik.
2. `lahanId` pada Device harus merujuk pada Lahan yang ada.
3. `deviceId` pada Reading, Watering, Calibration, dan Command harus merujuk pada Device yang ada.
4. Penghapusan Lahan/Device ditolak bila masih memiliki riwayat (E-08); alternatifnya menonaktifkan.
5. `waterings.durationSec` harus ≥ 0 dan sesuai batas firmware (≤ 15 detik untuk manual, ≤ 10 detik untuk otomatis).
6. `readings` hanya menyimpan nilai yang valid; sampel dengan semua sensor lepas ditandai, bukan diisi angka palsu.
7. Waktu disimpan UTC; konversi ke WITA dilakukan di lapisan tampilan.

---

# 5. Kebutuhan Non-Fungsional

**Tabel 5.1 Kebutuhan Non-Fungsional**

| ID | Aspek | Kebutuhan | Status |
|---|---|---|:-:|
| **NFR-01** | Ketersediaan | Aplikasi web dan server tersedia minimal 99% per bulan di luar pemeliharaan terjadwal. Data Firebase dicadangkan berkala dengan RPO ≤ 24 jam. Bila internet di lahan terputus, penyiraman otomatis tetap berjalan dan data terbaru tampil kembali setelah koneksi pulih. | ◐ |
| **NFR-02** | Keandalan | Layanan inti (login, baca status, simpan sampel) memiliki tingkat galat ≤ 0,1%. ESP32 mencoba menyambung ulang Wi-Fi secara berkala; tugas Firebase berjalan terpisah sehingga kegagalan jaringan tidak mengganggu pembacaan sensor dan pengaman pompa. Data yang sudah diterima server tidak hilang. | ◐ |
| **NFR-03** | Kinerja | CRUD panel selesai ≤ 2,5 detik (p95). Dashboard tampil ≤ 3 detik pada 4G. Perintah kontrol mencapai perangkat ≤ 10 detik. | ◐ |
| **NFR-04** | Ergonomi | Antarmuka responsif 360 piksel sampai desktop; kontras ≥ 4,5 : 1 (WCAG 2.1 AA); fitur utama dapat dicapai ≤ 3 klik dari dashboard; status selalu disertai label teks. | ✅ |
| **NFR-05** | Keamanan | HTTPS/TLS ≥ 1,2. RBAC ditegakkan di server. Kata sandi dikelola Firebase Authentication (hash oleh penyedia). Rate limit login 5/menit per IP+email. Validasi input dengan Zod. Proteksi XSS, CSRF, dan injeksi mengacu OWASP ASVS L2. Aturan Firebase menolak akses klien langsung. Kredensial perangkat tidak boleh ada di repositori. Endpoint telemetry harus diautentikasi sebelum produksi. | ◐ |
| **NFR-06** | Privasi | Mengikuti UU No. 27 Tahun 2022 (PDP). Data pribadi dibatasi pada nama dan email. Hak hapus akun tersedia melalui admin. Akses data dibatasi peran. | ◐ |
| **NFR-07** | Portabilitas | Backend dapat dijalankan di Linux x86_64 atau container tanpa state lokal; konfigurasi melalui variabel lingkungan. | ✅ |
| **NFR-08** | Kompatibilitas | Berjalan pada Chrome, Firefox, dan Edge versi terkini, baik desktop maupun ponsel. | ✅ |
| **NFR-09** | Bahasa | Seluruh antarmuka, pesan, dan panduan memakai Bahasa Indonesia. | ✅ |
| **NFR-10** | Retensi data | Sampel kelembapan disimpan terbatas (usulan 90 hari); ringkasan per jam disimpan lebih lama; riwayat penyiraman disimpan permanen. | ◐ |
| **NFR-11** | Keselamatan | Pompa tidak boleh menyala tanpa batas. Durasi maksimum (10 detik otomatis, 15 detik manual) dan cooldown 300 detik ditegakkan **di firmware**. Server hanya mengirim perintah dalam batas tersebut. Relay mati saat boot dan saat koneksi terputus. | ✅ |
| **NFR-12** | Pemeliharaan | Modul fuzzy tersedia sebagai fungsi murni di server untuk pratinjau dan pengujian, dengan kasus uji yang sama seperti firmware. Parameter dapat diubah melalui aplikasi tanpa mengubah kode. Kegagalan layanan dan galat sensor dicatat pada log terstruktur. | ◐ |
| **NFR-13** | Akurasi | Nilai ADC dikonversi menjadi persen memakai kalibrasi kering/basah per sensor, dengan selisih pembacaan ≤ ±5% terhadap alat pembanding. Hasil fuzzy di server (pratinjau) harus sama dengan firmware untuk masukan yang sama, selisih ≤ 0,1 detik. | ◐ |
| **NFR-14** | Identitas tampilan | Warna utama hijau `#2E7D32`; header menampilkan identitas GREENFLOW, nama akun, pemilih tema, dan tombol keluar. Logo instansi hanya dipasang bila sudah disetujui dan mengikuti pedoman identitas visual. | ✅ |

## 5.1 Rincian NFR-02 (keandalan perangkat)

1. Perhitungan sensor, fuzzy, dan pengaman pompa berada di loop utama; komunikasi Firebase berjalan pada task terpisah (core 0).
2. Koneksi lambat atau terputus tidak boleh memblokir pembacaan sensor, buzzer, atau pengaman pompa.
3. Saat boot, relay dipaksa mati sebelum logika lain berjalan.
4. Setiap penyiraman memiliki batas waktu keras di firmware, terlepas dari perintah yang diterima.
5. Status ditulis ulang setiap 5 detik sehingga server dapat mendeteksi perangkat offline dari `ts` yang tidak maju.

## 5.2 Rincian NFR-05 (keamanan)

1. Cookie sesi `__session` bersifat httpOnly, SameSite, dan Secure di produksi; masa berlaku 7 hari.
2. Login dibatasi 5 percobaan per menit per kombinasi IP + email; registrasi 10 per jam per IP; lupa kata sandi 5 per jam per IP.
3. Setiap endpoint yang mengubah data memeriksa Origin dan token CSRF.
4. Peran diperiksa di middleware server (`requireRole("admin")`), bukan hanya di antarmuka.
5. Semua input divalidasi dengan skema Zod sebelum menyentuh Firestore.
6. Firebase Security Rules menolak baca/tulis langsung dari klien.
7. Rahasia (service account, kredensial database) hanya berada di variabel lingkungan server.

## 5.3 Rincian NFR-11 (keselamatan pompa)

| Parameter | Nilai | Penegak |
|---|---|---|
| Durasi otomatis maksimum | 10 detik | Firmware |
| Durasi manual maksimum | 15 detik | Firmware |
| Durasi minimum untuk memulai | 1 detik | Firmware |
| Cooldown setelah otomatis | 300 detik | Firmware |
| Relay saat boot | Mati | Firmware |
| Validasi durasi API | 1–3600 detik | Backend |

> **Catatan.** Terdapat ketidaksesuaian antara batas API (3600 detik) dan batas firmware (15 detik). Firmware tetap memotong durasi, tetapi antarmuka sebaiknya membatasi isian pada 15 detik agar umpan balik sesuai kenyataan.

---

# 6. Lampiran

## Lampiran A — Logika Fuzzy Sugeno (mengikuti firmware v4)

### A.1 Masukan dan himpunan (trapesium `(a, b, c, d)`)

| Masukan | Himpunan | Parameter | Bentuk |
|---|---|---|---|
| **Tanah (%)** | Kering | (−∞, −∞, 20, 40) | μ = 1 sampai 20, turun linear 20→40 |
| | Normal | (20, 40, 68, 88) | naik 20→40, μ = 1 pada 40–68, turun 68→88 |
| | Basah | (68, 88, +∞, +∞) | naik 68→88, μ = 1 mulai 88 |
| **Suhu (°C)** | Sejuk | (−∞, −∞, 25, 29) | μ = 1 sampai 25, turun 25→29 |
| | Normal | (25, 29, 31, 35) | naik 25→29, μ = 1 pada 29–31, turun 31→35 |
| | Panas | (31, 35, +∞, +∞) | naik 31→35, μ = 1 mulai 35 |

### A.2 Basis aturan (9 aturan, keluaran konstan dalam detik)

| Tanah \ Suhu | Sejuk | Normal | Panas |
|---|---:|---:|---:|
| **Kering** | 3 | 6 | 10 |
| **Normal** | 0 | 3 | 6 |
| **Basah** | 0 | 0 | 0 |

### A.3 Perhitungan

```text
w_i     = min(μ_tanah_i, μ_suhu_i)          untuk setiap aturan i
durasi  = Σ(w_i × z_i) ÷ Σ w_i              bila Σ w_i > 0
durasi  = 0                                 bila Σ w_i = 0
```

Keterangan: `z_i` adalah keluaran konstan aturan ke-i (tabel A.2). Bobot minimum (bukan perkalian) dipakai agar sesuai implementasi firmware.

### A.4 Pengaman dan aturan tambahan

- **Tanah rata-rata** = rata-rata sensor yang valid.
- Nilai mentah ≤ 200 (kabel putus) diabaikan.
- Nilai mentah ≥ 3500 (sensor di udara) dianggap 0% pada mode uji, atau diabaikan bila `UDARA_DIANGGAP_KERING = false`.
- Bila semua sensor lepas → label “Sensor lepas”, durasi 0, pompa tidak menyala.
- Persen tiap sensor = `(kering − raw) ÷ (kering − basah) × 100`, dibatasi 0–100.
- Penyiraman otomatis berjalan bila: mode `auto` **dan** pompa mati **dan** cooldown = 0 **dan** durasi ≥ 1 detik.
- Durasi nyata otomatis = `min(durasi, 10)` detik; setelah selesai cooldown 300 detik.
- Siram manual maksimum 15 detik; cooldown tidak berlaku untuk manual.
- Label tampilan terpisah dari himpunan fuzzy: **Kering < 30%, Normal 30–78%, Basah > 78%**.

### A.5 Kasus uji

| Tanah (%) | Suhu (°C) | `fuzzy_detik` |
|---:|---:|---:|
| 20 | 33 | 8,0 |
| 10 | 30 | 6,0 |
| 25 | 28 | 4,0 |
| 30 | 29 | 4,5 |
| 40 | 29 | 3,0 |
| 55 | 29 | 3,0 |
| 80 | 33 | 2,0 |
| 15 | 36 | 10,0 |
| 90 | 33 | 0,0 |

Implementasi fuzzy di server (pratinjau/simulator) wajib lulus seluruh baris tabel ini.

## Lampiran B — Pemetaan Kebutuhan SRS v1.0 ke Implementasi

| Kebutuhan SRS v1.0 | Keputusan pada v1.1 | Alasan |
|---|---|---|
| FR-01 Registrasi akun Developer | Diganti **FR-01 Registrasi akun pengguna** | Tidak ada peran Developer. |
| FR-02 Login dengan token sesi | **FR-02/FR-03** dengan cookie `__session` | Implementasi memakai cookie httpOnly. |
| FR-03 RBAC 4 peran | **FR-06/FR-07** dengan 2 peran | Ruang lingkup disederhanakan. |
| FR-04 Verifikasi akun Developer | Dihapus | Registrasi langsung aktif. |
| FR-05 CRUD Data Perumahan | Diganti **FR-50 Kelola lahan** | Domain berubah ke lahan sawi. |
| FR-06 CRUD Unit Rumah | Dihapus | Tidak relevan. |
| FR-07 Unggah dokumen legal | Dihapus | Tidak relevan. |
| FR-08 Verifikasi data & dokumen | Dihapus | Tidak relevan. |
| FR-09 Publikasi ke portal publik | Dihapus | Tidak relevan. |
| FR-10 Pencarian & filter perumahan | Diganti pencarian pada **FR-06/FR-50/FR-51** | Disesuaikan dengan data master. |
| FR-11 Peta interaktif (PostGIS) | Dihapus | Tidak ada data spasial. |
| FR-12 Surat menyurat digital | Dihapus | Tidak relevan. |
| FR-13 Dashboard & laporan (PDF/CSV) | **FR-10…FR-16**, **FR-31**, **FR-32** | Ekspor belum diimplementasikan. |
| FR-14 Registrasi perangkat + token | Diganti **FR-51/FR-52** | Perangkat didaftarkan dengan kode, tanpa token aplikasi. |
| FR-15 Penerimaan data sensor via HTTPS/MQTT | **Bagian 3.3.4** (RTDB) + **FR-13** | ESP32 menulis ke RTDB. |
| FR-16 Monitoring real-time | **FR-10…FR-16** | Diperluas dengan S1–S3, udara, cooldown. |
| FR-17 Penetapan ambang + hysteresis | **FR-54** | Hysteresis ada di firmware (30/35). |
| FR-18 Otomatisasi penyiraman | **FR-20**, **Lampiran A** | Dijalankan di ESP32. |
| FR-19 Override manual terbatas | **FR-21…FR-23** | Batas 15 detik di firmware. |
| FR-20 Notifikasi kondisi kritis | **FR-40/FR-41** | Pembuatan otomatis belum ada. |
| FR-21 Log kesehatan perangkat | **FR-12** (sebagian) | Uptime/RSSI dari status. |
| FR-22 Catatan kalibrasi & maintenance | **FR-56** | Tanpa unggah foto. |
| FR-23 Riwayat penyiraman | **FR-30** | Tanpa kelembapan sesudah. |
| FR-24 Ekspor CSV/XLSX/PDF | **FR-32** | Belum diimplementasikan. |
| FR-25 Audit trail | **FR-61** | API/halaman belum ada. |
| FR-26 Profil & password | **FR-05** | Sesuai. |
| FR-27 Manajemen konten Help/FAQ | **FR-60** | Masih placeholder. |
| FR-28 Pengaturan lokasi RTH per proyek | **FR-50** (lokasi lahan) | Diganti istilah lahan. |
| FR-29 Validasi integritas dokumen | Dihapus | Tidak ada dokumen legal. |
| FR-30 Jadwal kirim sensor 5–10 menit | Diganti interval **5 detik (status)** dan sampel server | Mengikuti firmware. |
| NFR PostgreSQL/CPU 4 core/8 GB | Diganti **NFR-07** (Linux/container) | Basis data Firebase. |
| NFR sesi 30 menit | Diganti **7 hari** | `SESSION_COOKIE_DAYS=7`. |
| NFR token perangkat | Dihapus | Tidak dipakai. |
| NFR fuzzy di server | Diganti **NFR-13** (paritas firmware) | Fuzzy di ESP32. |

## Lampiran C — Matriks Keterlacakan Ringkas

| Kelompok kebutuhan | Modul backend | Halaman frontend | Sumber data |
|---|---|---|---|
| FR-01…FR-07 | `auth`, `users`, `profile` | `/signin`, `/signup`, `/reset-password`, `/profil`, `/pengguna` | Firebase Auth + `users` |
| FR-10…FR-16 | `realtime`, `readings`, `laporan` | `/` | `/irigasi/status`, `readings` |
| FR-20…FR-24 | `waterings` | `/penyiraman` | `commands`, `/irigasi/kontrol` |
| FR-30…FR-32 | `waterings`, `laporan` | `/riwayat`, `/laporan` | `waterings`, `readings` |
| FR-40…FR-42 | `notifikasi` | `/notifikasi` | `notifications` |
| FR-50…FR-53 | `lahan`, `devices` | `/lahan`, `/perangkat` | `lahan`, `devices` |
| FR-54…FR-56 | `parameter`, `kalibrasi` | `/parameter`, `/kalibrasi` | `lahan.parameter`, `calibrations` |
| FR-60…FR-62 | — | `/bantuan`, `/audit`, tema | — |

## Lampiran D — Daftar Ketidaksesuaian yang Masih Terbuka

| No | Temuan | Dampak | Rencana |
|---:|---|---|---|
| 1 | Firmware belum membaca `/config` | Perubahan parameter dan kalibrasi belum memengaruhi perangkat | Perbarui firmware agar membaca `/config` secara berkala |
| 2 | ~~Perintah manual ditulis ke Firestore~~ | **Selesai:** perintah kini ditulis ke RTDB `/irigasi/kontrol` melalui `POST /api/v1/kontrol`. | — |
| 3 | ~~Batas durasi API vs firmware~~ | **Selesai:** kontrol manual disederhanakan menjadi ON/OFF tanpa durasi. | — |
| 4 | Jalur RTDB masih `/irigasi`, belum per kode perangkat | Satu node hanya untuk satu perangkat | Terapkan `/irigasi/{kode}` |
| 5 | Notifikasi otomatis belum ada | Admin/pengguna tidak diberi tahu kondisi kritis | Tambahkan pendeteksi kondisi + histeresis |
| 6 | Halaman audit dan bantuan masih placeholder | Fitur FR-60/FR-61 belum dapat dipakai | Implementasikan API audit dan isi panduan |
| 7 | Ekspor laporan belum ada | FR-32 belum terpenuhi | Tambahkan endpoint dan tombol ekspor |
| 8 | Endpoint `/telemetry` tanpa autentikasi | Risiko penyalahgunaan | Tambahkan autentikasi perangkat |
| 9 | Beberapa gambar/diagram SRS v1.0 masih menggambarkan arsitektur lama | Dapat menyesatkan pembaca | Gunakan diagram pada `architecture.md` dan `schema.md` |

## Lampiran E — Daftar Singkatan

| Singkatan | Arti |
|---|---|
| ADC | *Analog-to-Digital Converter* |
| API | *Application Programming Interface* |
| CRUD | *Create, Read, Update, Delete* |
| DHT | *Digital Humidity and Temperature* (sensor) |
| FR | *Functional Requirement* |
| I2C | *Inter-Integrated Circuit* |
| IoT | *Internet of Things* |
| LCD | *Liquid Crystal Display* |
| NFR | *Non-Functional Requirement* |
| RBAC | *Role-Based Access Control* |
| REST | *Representational State Transfer* |
| RH | *Relative Humidity* |
| RSSI | *Received Signal Strength Indicator* |
| RTDB | *Realtime Database* |
| RTC | *Real-Time Clock* |
| SRS | *Software Requirements Specification* |
| UC | *Use Case* |
| UI | *User Interface* |
| WITA | Waktu Indonesia Tengah |

---

**Akhir dokumen — SRS GREENFLOW v1.1**
