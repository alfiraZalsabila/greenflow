# GREENFLOW — Penjelasan Sistem untuk Orang Awam & Junior Developer

> Dokumen ini ditulis dengan bahasa sederhana. Tidak perlu jadi ahli untuk membacanya.
> Setiap istilah teknis dijelaskan dengan analogi sehari-hari.
> Untuk dokumen teknis mendalam, lihat `context/architecture.md` dan `context/design.md`.

---

## Daftar Isi

1. [Apa Itu GREENFLOW?](#1-apa-itu-greenflow)
2. [Gambaran Besar: Bagaimana Sistemnya Bekerja](#2-gambaran-besar-bagaimana-sistemnya-bekerja)
3. [Teknologi yang Dipakai (dengan Analogi)](#3-teknologi-yang-dipakai-dengan-analogi)
4. [Struktur Folder Proyek](#4-struktur-folder-proyek)
5. [Cara Menjalankan Proyek di Komputer Anda](#5-cara-menjalankan-proyek-di-komputer-anda)
6. [Akun Demo untuk Coba-Coba](#6-akun-demo-untuk-coba-coba)
7. [Halaman-Halaman di Aplikasi](#7-halaman-halaman-di-aplikasi)
8. [Tur Kode untuk Junior Developer](#8-tur-kode-untuk-junior-developer)
9. [Cara Aliran Data: Dari Sensor Sampai Layar](#9-cara-aliran-data-dari-sensor-sampai-layar)
10. [Konsep Penting yang Sering Bikin Bingung](#10-konsep-penting-yang-sering-bikin-bingung)
11. [Masalah Umum dan Cara Mengatasinya](#11-masalah-umum-dan-cara-mengatasinya)
12. [Kamus Istilah (Glossary)](#12-kamus-istilah-glossary)

---

## 1. Apa Itu GREENFLOW?

**GREENFLOW** adalah panel web (aplikasi yang dibuka lewat browser) untuk mengatur
**penyiraman otomatis tanaman sawi**. Dibuat oleh *Kelompok 20 TUMBUH*.

### Analogi paling sederhana

Bayangkan Anda punya kebun sawi yang tidak bisa selalu Anda pantau setiap hari.
Agar tanaman tidak layu karena kering (atau busuk karena terlalu basah), dipasanglah
sistem seperti ini:

| Dunia nyata | Di GREENFLOW |
|---|---|
| Wig yang mencukur otomatis | **ESP32** (komputer kecil di sawi) — membaca sensor, memutuskan kapan menyiram, menyalakan pompa |
| Alat pencukur otomatis terus bekerja walau wig tidak dipantau | **ESP32 bekerja mandiri** — penyiraman tetap jalan walau server/web sedang mati |
| Orang yang duduk depan TV memantau CCTV hotel | **Dashboard web ini** — Anda cukup melihat lewat browser: "kebun saya sekarang basah/kering, apakah pompa hidup?" |
| Telepon interkom untuk menyuruh kamar tertentu | **Tombol kontrol di web** — menyuruh pompa menyiram selama X detik, meskipun kebunnya jauh |

Jadi intinya:

> **ESP32 yang bekerja di sawi. Web ini yang memantau dan mengendalikan dari jauh.
> Firebase yang menjadi jembatan/lemari arsip data antara keduanya.**

### Peran penting yang perlu diingat dari awal

1. **Pompa tidak bergantung pada server.** Semua keputusan penyiraman (dengan logika
   *fuzzy*) dan pengaman pompa dijalankan langsung di ESP32. Kalau internet atau
   server mati, tanaman tetap tersiram. Ini keputusan desain paling penting (PRD D11).
2. **Browser tidak pernah bicara langsung ke Firebase.** Semua lewat **backend
   Express**. Ini seperti satpam di pintu: semua tamu (browser) harus lewat dia, tidak
   ada pintu belakang.
3. **Hak akses ditegakkan di server**, bukan cuma menyembunyikan menu. Pengguna biasa
   yang "curang" memanggil API admin tetap ditolak oleh server.

---

## 2. Gambaran Besar: Bagaimana Sistemnya Bekerja

```
┌───────────── Lahan sawi (fisik) ─────────────┐
│  3 sensor tanah + sensor udara (DHT11)       │
│        ↓ membaca kelembapan                  │
│      ESP32                                   │
│        ↓ menghitung logika fuzzy             │
│      Relay → Pompa air                       │
└──────────────┬───────────────────────────────┘
               │ kirim status tiap 5 detik (REST)
               ↓
        Firebase Realtime DB   ←─ "kotak surat perangkat"
               │
               ↓ dibaca oleh
┌──────────── Backend Express (server) ─────────┐
│  • Memvalidasi & menyimpan data penting       │
│    ke Firestore (arsip jangka panjang)        │
│  • Login, hak akses, audit                    │
│  • Meneruskan perintah pengguna → pompa      │
└──────────────┬────────────────────────────────┘
               │ cookie sesi ( sudah login? )
               ↓
         Browser / Web Dashboard
   (React — halaman yang Anda lihat sekarang)
```

Cara membacanya dalam dua kalimat:

- **Arah data naik (sensor → layar):** ESP32 menulis status ke "kotak surat"
  (Realtime Database), server mengambil dan mengarsipkan bagian pentingnya ke
  Firestore, lalu browser menampilkannya sebagai grafik/tabel.
- **Arah data turun (layar → pompa):** Anda menekan tombol "siram" di web → server
  memvalidasi (boleh tidak? pompa sedang hidup tidak?) → menulis perintah ke kotak
  surat → ESP32 membaca dan menjalankannya.

---

## 3. Teknologi yang Dipakai (dengan Analogi)

| Teknologi | Analogi | Kenapa dipakai |
|---|---|---|
| **TypeScript** | Buku tulis berkotak-kotak (setiap catatan harus masuk kotak yang tepat) | Mengurangi kesalahan ketik/variable salah; kesalahan ketahuan sebelum jalan |
| **React + Vite** (frontend) | Kertas karton yang bagian-bagiannya bisa ditukar (komponen) | UI cepat dan mudah dikembangkan; banyak template jadi (TailAdmin) |
| **Tailwind CSS v4** | Krayon dengan puluhan warna siap pakai, cukup sebut namanya | Menyusun tampilan tanpa menulis CSS panjang |
| **TailAdmin** | Perabot siap rak (sidebar, tabel, kartu dashboard) | Template admin gratis yang jadi dasar tampilan |
| **Express 5** (backend) | Satpam + resepsionis satu pintu | Semua request harus lewat sini; satu tempat mengatur keamanan |
| **Firebase Auth** | Sistem kartu akses gedung | Menyimpan akun & kata sandi dengan aman |
| **Cloud Firestore** | Arsip pemerintahan berkas rapi per map | Menyimpan data aplikasi jangka panjang (pengguna, lahan, riwayat) |
| **Realtime Database (RTDB)** | Papan digital di kantin, isinya terus berubah dilihat semua orang | Jalur cepat ESP32 ↔ server |
| **Firebase Emulator Suite** | Maket gedung untuk latihan (gratis & tidak merusak yang asli) | Semua orang bisa pengembangan tanpa biaya & tanpa berbahaya |
| **TanStack Query** | Asisten yang rajin menyegarkan layar setiap 10 detik | Data dashboard selalu segar tanpa refresh manual |
| **zod** | Petugas pemeriksa formulir masuk/keluar | Data yang salah bentuk ditolak dengan pesan jelas |
| **Java 21 + Firebase CLI** | Mesin listrik untuk emulator | Dibutuhkan agar emulator Firebase bisa menyala |

> 🔑 **Satu kalimat:** *TypeScript di semua sisi, React untuk tampilan, Express untuk
> pintu, Firebase untuk penyimpanan & login, dan emulatornya supaya semua ini bisa
> dirumah dengan gratis.*

---

## 4. Struktur Folder Proyek

Ini proyek **monorepo** — beberapa "sub-proyek" tinggal di satu repositori dan saling
saling terhubung lewat npm workspaces. Kalau Anda buka folder utamanya:

```text
projek-customer/
├─ package.json              # entri utama: script dev/build/lint/test untuk SEMUA sub-proyek
├─ package-lock.json         # "buku resep" versi yang persis untuk semua paket
├─ firebase.json             # aturan firewall data
├─ firestore.rules           # aturan keamanan Firestore (client tidak boleh langsung)
├─ firestore.indexes.json    # indeks untuk pencarian cepat
├─ explain.md                # dokumen ini
├─ README.md                 # panduan singkat
├─ context/                  # dokumen rancangan (PRD, arsitektur, desain)
│
├─ frontend/                 # 🖥️  APLIKASI WEB — yang tampil di browser
│  ├─ src/
│  │  ├─ App.tsx             # THE route registry: URL ↔ halaman
│  │  ├─ main.tsx            # titik masuk, membungkus semua Provider
│  │  ├─ index.css           # default styling
│  │  ├─ pages/main/…        # halaman dashboard, lahan, perangkat, dst.
│  │  ├─ pages/others/auth/… # halaman signin, signup, resetpassword
│  │  ├─ api/                # client untuk memanggil /api/…
│  │  ├─ hooks/              # (use-dashboard, use-delete-lahan, …)
│  │  ├─ contexts/           # ThemeProvider, AuthProvider, …
│  │  ├─ components/{ui,shared,layout}/
│  │  ├─ icons/  messages/   # ikon SVG, file terjemahan bahasa
│  │  └─ utils/              # fungsi kecil (cn, get-initials, …)
│  └─ vite.config.ts         # dev server + proxy /api → http://localhost:3000
│
├─ backend/                  # 🛡️  API — pintu yang menjaga Firebase
│  ├─ .env                   # rahasia & konfigurasi (JANGAN di-commit)
│  ├─ .env.example           # contoh isi .env
│  ├─ src/
│  │  ├─ server.ts           # menghidupkan server + auto-seed + graceful shutdown
│  │  ├─ app.ts              # menyusun middleware yang berurutan
│  │  ├─ config/             # env.ts (baca variabel lingkungan), firebase.ts (Admin SDK)
│  │  ├─ middleware/         # auth, csrf, rate-limit, error-handler, dst.
│  │  ├─ lib/                # logger, errors (kode E-xx), auto-seed, audit, cookies
│  │  ├─ modules/            # satu folder per fitur: auth, lahan, devices, dst.
│  │  │   └─ <module>/{routes,controller,service,types}.ts
│  │  └─ scripts/            # skrip seed admin & demo (sekali jalan)
│  └─ package.json
│
└─ packages/shared/          # 📦 kode yang dipakai DUA sisi (frontend + backend)
   └─ src/                   #   skema zod, kode error E-xx, konstanta, tipe
```

### Kenapa harus ada `packages/shared`?

Bayangkan frontend dan backend sama-sama harus tahu "nilai ambang kering harus
angka antara 0–100". Kalau tulis dua kali, cepat tak sinkron. Jadi tulis **satu
kali di `packages/shared`**, dan kedua sisi mengimpornya.

### Pola folder modul backend (wajib dipahami junior)

Setiap fitur di `backend/src/modules/<fitur>/` mengikuti pola lapisan:

```
routes.ts        → pendaftar URL + middleware + skema zod (TANPA logika)
controller.ts    → menerima request, memanggil service, mengembalikan respons
service.ts       → otak/logika bisnis (misal: "admin terakhir tidak boleh dihapus")
types.ts         → tipe data untuk fitur ini
```

Kenapa dipisah? Agar **logika bisnis tidak bercampur** dengan detail teknis
(HTTP, database). Kalau mau mengganti Firestore dengan database lain, cukup
tulis ulang lapisan paling bawah, sisanya tetap.

---

## 5. Cara Menjalankan Proyek di Komputer Anda

### Prasyarat

| Alat | Fungsi | Cara cek |
|---|---|---|
| Node.js 22.12+ | Mesin menjalankan JavaScript | `node -v` |
| npm 10+ | Penginstall paket | `npm -v` |
| Java 21 | Dibutuhkan emulator Firebase | `java -version` |
| Firebase CLI (`firebase-tools`) | Menjalankan emulator | `npx firebase --version` |

Pengguna Linux/macOS bisa memakai `.nvmrc`:
```bash
nvm use     # aktifkan versi Node yang disarankan
```

### Langkah (sekali saja di awal)

```bash
# 1. Masuk ke folder proyek
cd projek-customer

# 2. Install semua paket (semua workspace sekaligus)
npm install

# 3. Buat file konfigurasi backend
cp backend/.env.example backend/.env
# Untuk pengembangan lokal nilai bawaan sudah cukup.
# Isi ADMIN_SEED_EMAIL + ADMIN_SEED_PASSWORD untuk admin pertama.
```

### Langkah (setiap hari kerja)

```bash
npm run dev
```

Sekali tekan Enter, tiga hal menyala berbarengan (berkat `concurrently`):

| Nama | Apa yang jalan | Alamat |
|---|---|---|
| `emu` | Firebase Emulator Suite (Auth + Firestore) | http://localhost:4000 (UI emulator) |
| `api` | Backend Express | http://localhost:3000 |
| `web` | Frontend Vite dev server | http://localhost:5173 |

Buka **http://localhost:5173** di browser. Selesai!

> ⚠️ **Kenapa harus emulator?** Firebase Emulator = tiruan gratisan dari Firebase asli.
> Data tersimpan di memori dan hilang saat dimatikan — jadi bebas eksperimen tanpa
> takut merusak data asli dan tanpa biaya. Backend sudah diatur supaya otomatis
> terhubung ke emulator (`FIREBASE_USE_EMULATOR=true` di `backend/.env`).

### Bonus: auto-seed

Saat backend menyala (`npm run dev`), file `backend/src/lib/auto-seed.ts`
otomatis **pastikan akun admin & akun demo Budi ada** (dibuat bila belum ada).
Jadi Anda tidak perlu lagi menjalankan perintah seed manual untuk cicipi dashboard.
Skrip lama tetap ada:

- `npm run seed:admin` — buat/promosikan admin pertama manual
- `npm run seed:demo` — buat lahan/perangkat/readings/waterings dummy

---

## 6. Akun Demo untuk Coba-Coba

Akun-akun ini dibuat otomatis saat backend menyala (di mode emulator/dev).

| Role | Email | Kata Sandi | Bisa apa saja |
|---|---|---|---|
| **Admin** | `admin@greenflow.local` | `adminrahasia` | Akses SEMUA halaman: kelola lahan, perangkat, pengguna, kalibrasi, audit |
| **Pengguna / Operator** (Budi) | `budi@example.com` | `baru12345` | Melihat dashboard, penyiraman, riwayat, notifikasi, profil. Menu admin disembunyikan & server tetap menolak kalau dipaksa |

> 💡 Coba login sebagai **Budi** lalu coba buka `/pengguna` atau `/audit` —
> Anda akan diblokir (403). Itu bukan kutuk, itu **fitur keamanan** yang benar.

> 🔁 Data emulator **hilang** saat emulator dihentikan. Jadi tiap kali `npm run dev`
> dimulai lagi, akun & data dibuat lagi otomatis. Tidak perlu panik.

---

## 7. Halaman-Halaman di Aplikasi

Url dan hak akses (sumber: `frontend/src/App.tsx`):

| URL | Halaman | Siapa boleh | Fungsinya |
|---|---|---|---|
| `/signin` | Masuk | semua | Login ke aplikasi |
| `/signup` | Daftar | semua | Buat akun baru (peran otomatis `pengguna`) |
| `/reset-password` | Lupa sandi | semua | Mengirim email reset sandi |
| `/` | **Dashboard** | semua yang login | Ringkasan lahan, kelembapan, status pompa |
| `/lahan` | Lahan | semua (tambah/admin) | Daftar/ubah data lahan sawi |
| `/perangkat` | Perangkat | semua | Lihat & kelola ESP32/sensor/pompa |
| `/penyiraman` | Penyiraman | semua | Kontrol pompa manual + status perangkat |
| `/riwayat` | Riwayat penyiraman | semua | Tabel kapan saja penyiraman terjadi |
| `/parameter` | Parameter | semua | Atur durasi siram per zona kelembapan |
| `/kalibrasi` | Kalibrasi | semua | Sesuaikan sensor raw ↔ persen |
| `/laporan` | Laporan | semua | Ringkasan + ekspor CSV/XLSX |
| `/notifikasi` | Notifikasi | semua | Peringatan (tanah kering, sensor lepas, offline) |
| `/profil` | Profil | semua | Ubah nama & sandi sendiri |
| `/bantuan` | Bantuan | semua | Panduan penggunaan |
| `/pengguna` | Kelola pengguna | **admin** | Aktif/nonaktifkan akun, reset sandi orang lain |
| `/audit` | Jejak audit | **admin** | Log semua aksi penting dari siapa & kapan |

Dua "penjaga rute" di frontend:

- `<RequireAuth>` — belum login? lempar ke `/signin`.
- `<RequireRole role="admin">` — login tapi bukan admin? lempar ke halaman 403.

**Menu tampilan menyesuaikan peran, tapi server-lah hakim akhir.** Kalau pengguna
biasa curang memanggil API admin, server melempar 403. Tiga lapis pertahanan.

---

## 8. Tur Kode untuk Junior Developer

Bagian ini adalah tur santai bersama pemandu. Baca berurutan, buka file-nya di editor.

### 8.1 Dari `main.tsx` sampai "halaman muncul"

1. Buka `frontend/src/main.tsx` — `StrictMode → BrowserRouter → ThemeProvider
   → HelmetProvider → I18nProvider → TooltipProvider → <App/>`.
   Analogi: ini adalah **pintu masuk mall**, sementara `App.tsx` adalah **peta mall**.
2. Buka `frontend/src/App.tsx` — di sinilah URL dihubungkan ke halaman:

   ```tsx
   <Route element={<RequireAuth />}>          {/* sudah login? kalau tidak → /signin */}
     <Route element={<AppLayout />}>         {/* bingkai: sidebar + header + <Outlet/> */}
       <Route path="/" element={<DashboardPage />} />
       <Route path="/lahan" element={<LahanPage />} />
       …
       <Route element={<RequireRole role="admin" />}>
         <Route path="/pengguna" element={<PenggunaPage />} />
         <Route path="/audit" element={<AuditPage />} />
       </Route>
     </Route>
   </Route>
   <Route element={<PublicOnly />}>
     <Route element={<AuthLayout />}>
       <Route path="/signin" element={<SignInPage />} />
       …
     </Route>
   </Route>
   ```

   Tugas Anda kalau tambah halaman baru: buat folder di `pages/main/<fitur>/`,
   default-kan `index.tsx`, daftarkan di sini, tambahkan item di
   `components/layout/app-layout/sidebar/data.tsx` (dan kunci terjemahannya
   di `messages/*.json`).

### 8.2 Bagaimana halaman mengambil data?

Semua data lewat **TanStack Query** — bukan `useEffect` manual. Contoh
`frontend/src/hooks/use-dashboard.ts`:

```ts
export function useDevices(lahanId?: string) {
  return useQuery({
    queryKey: ["devices", lahanId],                  // "alamat kunci cache"
    queryFn: async () => {
      const params = lahanId ? `?lahanId=${lahanId}` : "";
      const res = await api.get<{ devices: Device[] }>(`/devices${params}`);
      return res.devices || [];
    },
    enabled: !!lahanId,                              // jangan jalan bila id kosong
    staleTime: 1000 * 60 * 5,                        // cache 5 menit
  });
}
```

Tiga manfaat yang langsung terasa: loading/error otomatis, cache sehingga tidak
fetch ulang tiap kali kembali ke halaman, dan mudah polling
(`refetchInterval: 10_000` untuk data status perangkat — berhenti saat tab tak aktif).

### 8.3 Alur API: menuju server

Buka `frontend/src/api/client.ts`. Ini pembungkus `fetch` yang sudah mengatur:
`credentials: "same-origin"` (cookie ikut terkirim), header `X-Requested-With`, dan
**format error seragam**: `{ error: { code, message, details? } }`.
Dari sini permintaan pergi ke `/api/v1/…` yang di-proxy Vite (dev) ke port 3000.

### 8.4 Alur API: di server

Dibuka di `backend/src/app.ts`, urutan middleware seperti pemeriksaan keamanan bertingkat di
gedung:

```
requestId → log (pino-http) → helmet (header aman) → batasan body 100 KB
→ rate limit → cookie parser → csrf → auth → requireRole → router → errorHandler
```

- `middleware/auth.ts` — baca cookie `__session`, verifikasikan ke Firebase,
  taruh `req.user` untuk dipakai controller berikutnya.
- `middleware/csrf.ts` — proteksi serangan "orang jahat mencuri sesi lewat link".
- `middleware/rate-limit.ts` — misal login maksimum 5/menit (biar tak di-*brute force*).
- `middleware/error-handler.ts` — semua error jadi respons JSON rapi
  `{ error: { code, message, details? } }` dengan pesan Bahasa Indonesia.

Ciri Khas modul: `routes → controller → service`, dengan lapisan paling bawah
saja yang bersentuhan dengan Firebase.
Contoh kecil: `backend/src/modules/lahan/lahan.service.ts` —
`getAllLahan()` membaca koleksi `lahan`, `getLabanById()` baca satu dokumen.

### 8.5 Bagaimana pengguna login?

Buka `backend/src/modules/auth/auth.service.ts` → `login()`:

```
1. authenticate(email, password)    → REST ke Firebase Auth (verifyPassword)
2. getUserFromCache(uid)            → pastikan status "aktif"
3. issueSession(idToken, res)       → terbitkan cookie __session (7 hari, httpOnly)
4. recordLogin(uid)                 → update terakhirMasukPada + audit
```

Pesan galat login **satu generik**: `E-02` "Email atau kata sandi salah" —
sengaja tidak dicek berbeda-beda supaya **penyerang tidak tahu mana yang benar**.

Cookie `__session` adalah "kalung tamu" yang tak terjangkau JavaScript browser
(`httpOnly`), sehingga XSS tidak bisa mencurinya. Nama `__session` dipilih karena
hanya cookie itu yang diteruskan bila kelak dideploy ke Firebase Hosting.

### 8.6 Bagaimana halaman admin bekerja secara aman?

- Custom claim di Firebase: `{ role: "admin" }` (dipasang saat register/seed);
- Kebenaran saat request: dokumen `users/{uid}` lewat **cache listener** sehingga
  kalau admin menonaktifkan akun seseorang, efeknya terasa < 1 detik;
- Admin terakhir **dilindungi**: tidak bisa dihapus/turun pangkat/dinonaktifkan
  (dicek dalam transaksi).

### 8.7 Membaca Firestore langsung lewat kode

Semua lewat Admin SDK di `backend/src/lib/firestore.ts` + `auto-seed.ts`
(untuk sekali jalan) atau `users.repository.ts` (untuk query normal).
Contoh yang memakai `Timestamp`:

```ts
import { Timestamp } from "firebase-admin/firestore";
const now = Timestamp.now();       // selalu UTC; ditampilkan dalam WITA di UI
await db.collection("users").doc(uid).set({ …, dibuatPada: now }, { merge: true });
```

---

## 9. Cara Aliran Data: Dari Sensor Sampai Layar

Mari ikuti satu contoh nyata, dari tanah kering sampai Anda melihat angkanya.

### 9.1 Alur penyiraman otomatis (tanpa campur tangan manusia)

1. **Sensor kelembapan tanah** mentah (mis. 1817) dikirim ESP32.
2. **Kalibrasi** mengubah mentah → persen: `55%` (kategori `NORMAL`).
3. Kelembapan di bawah ambang kering (mis. 30%) → kategori `KERING`.
4. **Logika fuzzy** (di ESP32) menghitung "berapa detik harus menyiram":
   dari `tanah` × `suhu` → hasil dalam detik. Sederhananya:
   - Tanah kering + udara panas → siram **lama** (misal 8 detik)
   - Tanah lembap + udara sejuk → siram **singkat** (misal 2 detik)
   - Tanah basah → **tidak menyiram** (0 detik)
5. **pengaman** (semua di ESP32): pompa maksimal 10 detik sekali jalan,
   cooldown 5 menit sebelum boleh nyiram lagi, sensor lepas → boleh gagal.
6. Result: `PUT /status` tiap 5 detik ke RTDB + `POST /riwayat` tiap selesai siram.

### 9.2 Bagaimana web Anda "tahu"?

1. Server Express memasang *listener* Realtime Database (kayak langganan berita).
2. Tiap perubahan `/status` → cache server diperbarui (~1 detik).
3. Browser bertanya tiap 10 detik (`refetchInterval`, polling dengan ETag/304
   supaya hemat) → `GET /dashboard/summary` → dilayani dari **cache**, jadi
   Firestore tidak terbebani baca terus-terusan.
4. Browser menggambar kartu, grafik (ApexCharts), dan badge "Pompa: OFF/ON".

### 9.3 Alur menyiram manual dari web

Anda tekan "Siram 5 detik" →

1. Frontend: `POST /api/v1/devices/:id/pump { aksi: "siram", detik: 5 }`
2. Server cek: peran boleh? perangkat aktif & online? pompa mati? durasi ≤ batas?
3. Server menulis **perintah** ke Firestore (`commands`, status `menunggu`)
   + `writeAudit` → menulis ke `/kontrol` di RTDB dalam transaksi
   (`id = id + 1` supaya ESP32 tahu "ini perintah baru, bukan perintah lama").
4. ESP32 membaca `/kontrol` tiap 2 detik → `id` berubah → jalankan pompa.
5. ESP32 kirim status berisi `ack_id` = "perintah nomor sama sudah saya jalankan".
6. Server lihat `ack_id ≥ id` → tanda command `dijalankan`.
7. UI polling `GET /commands/:id` tiap 2 detik → ubah label
   "menunggu perangkat…" → "dijalankan ✅" (maksimal 15 detik, kalau tidak
   muncul → "tidak merespons ⚠️").

### 9.4 Bagaimana parameter/kalibrasi berpengaruh ke perangkat?

```
Pengguna ubah parameter → validasi zod → tulis devices.config (version + 1)
→ server tulis /config di RTDB → ESP32 baca (F1) → ESP32 tulis cfg_ver di /status
→ UI: status.cfg_ver == config.version → badge "Diterapkan perangkat" ✅
```

Sebenarnya badge "Belum diterapkan" adalah **jujur**: parameter tersimpan, tapi
perangkat belum membaca konfigurasinya. Jadi penyiram memakai aturan lama.

---

## 10. Konsep Penting yang Sering Bikin Bingung

### 10.1 Kenapa ada dua database (Firestore dan Realtime Database)?

| | Firestore | Realtime Database (RTDB) |
|---|---|---|
| Analogi | Arsip pemerintahan (berkas rapi per map) | Papan digital kantin (terus berubah, dilihat semua orang) |
| Isi | Data aplikasi: pengguna, lahan, riwayat, audit | Status perangkat per detik (`/status`), perintah pompa (`/kontrol`) |
| Dibaca siapa | Hanya server (Admin SDK) | ESP32 menulis & baca; server jadi-jadi listener |

Simpelnya: **data "berdenyut" di RTDB, data "diarsip" di Firestore.** Server yang
menyekop dari papan ke arsip supaya kuota hemat dan data penting tidak hilang.

### 10.2 Kenapa browser tidak boleh langsung bicara ke Firebase?

Alasan #1 — **keamanan**. Kalau aturan klien dibuka, pengguna iseng bisa menulis
 langsung: "jadikan aku admin". Dengan satu pintu (Express), aturan klienFirestore
 dan RTDB diset `false` semua. Satu-satunya kunci adalah Admin SDK di backend.

### 10.3 Kenapa parameter melekat pada **perangkat**, bukan **lahan**?

Karena **firmware menerapkan konfigurasinya per perangkat**. Satu ESP32 punya satu
konfigurasi (ambang, durasi, fuzzy, kalibrasi). Lahan hanya berisi data master
(nama, luas, lokasi). Bila kelak 3 ESP32 dipakai, tiap ESP32 punya setelan sendiri.
Ini keputusan (AD-19) supaya tak bingung "lahan punya 3 perangkat, ikut yang mana?"

### 10.4 Kenapa frontend pakai polling, bukan push real-time?

Polling tiap 10 detik cukup untuk kebutuhan ini dan **hemat kuota & sederhana**
(AD-05). SSE/WebSocket adalah peningkatan belakangan. Untuk penyiraman sawi,
jeda 10 detik tidak masalah.

### 10.5 Kenapa pesan error berkode (E-01…E-08)?

Supaya **frontend bisa menangani dan menerjemahkan** pesan berbeda per kode,
tanpa mengubah logika bisnis. Kode disimpen di `packages/shared`.
Contohnya:

| Kode | Arti |
|---|---|
| E-02 | Email atau kata sandi salah |
| E-03 | Anda tidak punya hak akses (403) |
| E-04 | Sesi berakhir — silakan masuk lagi (401) |
| E-07 | Nilai tidak valid (misal ambang kering ≥ ambang basah) |
| E-08 | Data masih dipakai, tidak bisa dihapus (409) |

### 10.6 Kenapa ada `packages/shared`?

Frontend dan backend **sama-sama TypeScript**. Skema zod (`registerSchema`,
`parameterSchema`) yang dipakai untuk validasi di server **dipakai ulang** di
formulir frontend. Satu sumber kebenaran, dua sisi pasti sepaham.

### 10.7 Analogi keseluruhan dalam 1 paragraf

> Bayangkan sawi sebagai **hewan tertutup dalam kandang pintu otomatis**.
> ESP32 adalah **petugas di kandang** yang melihat kelembapan tanah lalu
> membuka keran air; hewan (pompa) nyaman. **Dashboard web** adalah papan CCTV
> + interkom di ruang makan administrator. **Express** adalah resepsionis yang
> memeriksa izin siapa boleh lihat CCTV dan boleh menyuruh kandang.
> **Firestore** adalah lemari arsip pemerintahan yang disekop dari papan CCTV
> tiap 5 menit. **Firebase Emulator** adalah maket kandang untuk latihan
> tanpa takut merusak hewan asli.

---

## 11. Masalah Umum dan Cara Mengatasinya

| Gejala | Penyebab biasa | Solusi |
|---|---|---|
| **"Layanan sedang sibuk"** saat login/registrasi | Emulator Firebase belum jalan (port 9099/8080 tak terisi) | Cakupan saat ini otomatis lewat `npm run dev` (yang bersamaan menyala emulator + api + web). Kalau masih, pastikan Java 21 terpasang |
| **"Email atau kata sandi salah"** untuk admin/Budi | Emulator mulai segar, data lama hilang | Tunggu 5–10 detik — auto-seed berjalan setelah backend siap. Bila harus, dafter akun baru saja |
| **Halaman putih blank setelah login / refresh** | Kode membaca properti bertingkat (misal `lahan.parameter.keringSec`) sedangkan datanya masih `undefined` | Sudah ditambahkan *optional chaining* + nilai default: `currentLahan?.parameter?.ambangKering ?? 30`. Kalau menemui pola serupa di halaman lain, terapkan sama |
| **Dashboard lambat berubah** | Jeda polling 10 detik oleh desain | Tidak masalah — tak antar 10 detik untuk penyiraman sawi |
| **Badge "Belum diterapkan perangkat"** | Firmware belum membaca F1/F2 | Perkiraan. Lencana sengaja jujur supaya tak berpura-pura |
| **Grafik berlubang** | Server sempat mati saat itu, sampel tidak dihasilkan | By design: celah ditampilkan jujur, tidak diinterpolasi palsu |
| **Firefox: cookie tak terkirim di dev** | `SameSite=Strict` + lintas port di dev | Gunakan http://localhost:5173 (jika localhost:127.0.0.1) — frontend mem-proxy /api sehingga origin sama |
| **Test / build gagal setelah edit** | Kode belum lolos lint/type-check | Jalankan `npm run build` + `npm run lint` setelah tiap perubahan (aturan proyek) |

---

## 12. Kamus Istilah (Glossary)

| Istilah | Arti singkat |
|---|---|
| **Admin SDK** | Perpustakaan resmi Firebase untuk server (backend), punya akses penuh |
| **ADR (AD-xx)** | Architecture Decision Record — catatan kenapa keputusan teknis diambil |
| **Ambang (threshold)** | Batas angka untuk mengubah keadaan (misal 30% = sehr kering) |
| **Cloud Firestore** | Database NoSQL arsip per koleksi/dokumen |
| **Cookie `__session`** | "Kalung tamu" httpOnly yang menandai Anda sudah login |
| **CSRF** | Serangan bikin browser korban mengirim request palsu; dijaga di server |
| **Custom claim** | Label kecil (`role: admin`) yang ditempel di akun Firebase Auth |
| **Emulator** | Tiruan gratis dari Firebase asli untuk dev/test |
| **ESP32** | Mikrokontroler (komputer mini) di sawi untuk baca sensor & kendali pompa |
| **ETag / 304** | Trik "tidak berubah → 0 byte" supaya polling hemat bandwidth |
| **Fuzzy (Sugeno)** | Logika subjektif berbasis aturan untuk memutuskan durasi siram |
| **httpOnly** | Cookie yang tak bisa dibaca JavaScript — aman dari XSS |
| **Idempoten** | Dijalankan berkali-kali hasilnya tetap sama (tidak dobel data) |
| **Konstanta E-xx** | Kode error seragam yang dipakai frontend & backend |
| **Monorepo / workspaces** | Beberapa sub-proyek dalam satu repo & satu `npm install` |
| **Optional chaining (`?.`)** | Cara aman baca properti bertingkat; `undefined` tidak meledak |
| **Payload** | Isi data yang dikirim antar komponen |
| **Pino** | Logger JSON cepat (log berbentuk JSON agar mudah disaring) |
| **RBAC / requireRole** | Pembatasan berdasar peran: admin / pengguna |
| **Riwayat / waterings** | Kumpulan catatan "penyiraman terjadi di lahan ini berapa detik" |
| **RTDB** | Firebase Realtime Database — papan data ringan & cepat |
| **Session cookie** | Kartu kontrol gedung yang diberikan setelah login sukses |
| **SSE / WebSocket** | "Push" dari server ke browser (rencana peningkatan belakangan) |
| **staleTime** | Berapa lama data cache dianggap segar (tidak fetch ulang) |
| **TanStack Query** | Pustaka pengampu data server (cache, polling, loading state) |
| **Timestamp** | Cap waktu UTC dari Firebase; di UI ditampilkan dalam WITA |
| **Vite** | Alat build + dev server frontend yang super cepat |
| **WITA** | Waktu Indonesia Tengah (UTC+8) — zona tampilan waktu aplikasi |
| **Workspaces** | Fitur npm untuk monorepo |
| **zod** | Pustaka validasi data: "bentuk data harus begini, kalau bukan → tolak" |

---

## Terima Kasih & Closing Note untuk Junior Developer

Berikut tiga saran bila Anda baru bergabung ke proyek ini:

1. **Jalankan dulu, baca kemudian.** Nyalakan `npm run dev`, login sebagai admin
   dan Budi secara bergantian, klik-klik semua menu. Rasakan dulu sebagai pengguna.
2. **Ikuti pola yang sudah ada.** Mau tambah fitur? Cermati modul yang sudah jadi
   (misal `lahan`): lihat bagaimana `routes → controller → service` di backend dan
   bagaimana page memakai `<PageMeta>`, `<Card>`, hook TanStack Query di frontend.
   **Tulis gaya serupa, jangan menemukan gaya baru.**
3. **Bangun + lint setiap selesai mengubah kode.** Ini disiplin proyek:
   `npm run build && npm run lint`. Suruh ketebalan juga supaya perubahan Anda
   dijamin rapi sebelum di-review.

Selamat belajar, dan semoga sawi Anda (dan user Anda) selalu tersiram cukup! 🌱💧
