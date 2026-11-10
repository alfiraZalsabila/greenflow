# Design — GREENFLOW Panel & Dashboard

> **Versi:** 0.1 · **Tanggal:** 2 November 2026
> **Bergantung pada:** `PRD.md` v0.2 bagian 9, `architecture.md` v0.1 bagian 6, `schema.md` v0.1
> **Status:** tema dasar dan kerangka halaman sudah diterapkan pada Phase 0; detail komponen dan halaman menjadi acuan Phase 1–5.
> **Prinsip:** Bahasa Indonesia, hijau, tenang, data-first, dapat dipakai petani dari ponsel 360 px.

---

## 1. Arah Desain

GREENFLOW bukan dashboard teknis untuk operator IoT, melainkan **panel harian petani** dengan satu pertanyaan utama:

> “Tanah kering atau tidak, pompa menyala atau tidak, kapan terakhir disiram?”

Konsekuensi desain:

1. **Jawaban dulu, detail kemudian.** Tiga kartu teratas di dashboard menjawab pertanyaan di atas tanpa scroll.
2. **Warna tidak pernah sendiri.** Setiap status warna selalu disertai label teks dan ikon (WCAG 2.1 AA, buta warna).
3. **Satu bahasa.** Seluruh UI Bahasa Indonesia baku; istilah teknis hanya muncul di halaman Parameter/Kalibrasi.
4. **Tenang.** Hijau sebagai aksen, bukan latar penuh. Banyak ruang kosong, sedikit garis, tanpa animasi berlebihan.
5. **Mobile-first untuk petani, desktop-first untuk admin.** Tabel berubah menjadi kartu di layar sempit.
6. **Jujur soal data.** Bila data basi/offline, tampilkan peringatan—jangan menyamarkan dengan angka terakhir.

---

## 2. Identitas Visual

| Elemen | Aturan |
|---|---|
| Nama produk | **GREENFLOW** (huruf kapital semua di logo/wordmark) |
| Logo | Daun + tetesan air; wordmark hijau tua. Logo sementara (Q4 belum final) |
| Berkas | `frontend/public/images/logo/logo.svg`, `logo-dark.svg`, `logo-icon.svg`, `auth-logo.svg` |
| Favicon | `frontend/public/favicon.png` |
| Jangan | Memakai logo Dinas/Pemkot sebelum Q4 diputuskan; memakai logo TailAdmin di UI |
| Clear space | Minimal setinggi huruf “G” di sekeliling logo |
| Latar gelap | Gunakan `logo-dark.svg`; jangan memberi bayangan tambahan |

Tagline pendek: **“Irigasi otomatis tanaman sawi”**. Nama kelompok hanya di halaman auth/bantuan: “Kelompok 20 TUMBUH”.

---

## 3. Warna

### 3.1 Skala merek (sudah ada di `src/index.css`)

| Token | Hex | Penggunaan utama |
|---|---|---|
| `brand-50` | `#F1F8F2` | latar badge/ikon aktif |
| `brand-100` | `#DDF0E0` | hover lembut |
| `brand-200` | `#BCE2C2` | border aktif |
| `brand-300` | `#8FCE99` | teks di latar gelap |
| `brand-400` | `#5CB36B` | grafik, ikon sekunder |
| `brand-500` | `#3C9A4D` | tombol hover |
| **`brand-600`** | **`#2E7D32`** | **warna utama**: tombol primer, tautan, fokus |
| `brand-700` | `#266A2B` | tombol pressed |
| `brand-800` | `#1F5525` | teks judul di latar terang |
| `brand-900` | `#1A451F` | panel auth |
| `brand-950` | `#0C2A12` | panel auth tergelap |

Aturan: `brand-600` untuk aksi utama; jangan memakai hijau untuk teks paragraf panjang. Kontras `brand-600` di putih = 5,1:1 (lolos AA).

### 3.2 Warna semantik

| Makna | Latar | Teks/ikon | Border | Contoh |
|---|---|---|---|---|
| Sukses / Basah / Online / Pompa ON | `green-50` | `green-700` | `green-200` | “Basah”, “Menyala” |
| Peringatan / Lembap / Mulai kering | `amber-50` | `amber-700` | `amber-200` | “Lembap”, “Perangkat lambat” |
| Bahaya / Kering / Offline / Gagal | `red-50` | `red-700` | `red-200` | “Kering”, “Mati”, “Gagal” |
| Info / Manual / Netral aktif | `blue-50` | `blue-700` | `blue-200` | “Mode manual” |
| Netral / Nonaktif / Tidak ada data | `gray-100` | `gray-600` | `gray-200` | “Belum ada data” |

Warna Tailwind yang dipakai: `green-50/200/600/700`, `amber-50/200/500/700`, `red-50/200/500/600/700`, `blue-50/200/600/700`, `gray-50…900`.

**Status kelembapan (wajib label):**

| Label | Ikon | Warna | Rentang tampilan |
|---|---|---|---|
| **Kering** | `LeafIcon` miring / tetesan | merah | `< ambangKering` |
| **Lembap** | `WaterDropIcon` | kuning | `ambangKering … ambangCukup` |
| **Basah** | `WaterDropIcon` penuh | hijau | `> ambangCukup` |

Ambang berasal dari parameter lahan, bukan hardcode. Jangan menampilkan “Lembap” hanya karena warna; teks label selalu ada.

### 3.3 Mode gelap

- Latar utama `gray-900`, permukaan `gray-900`/`white/3`, border `gray-800`.
- Teks utama `white/90`, sekunder `gray-400`.
- `brand-600` diganti `brand-400`/`brand-300` untuk teks/ikon agar kontras cukup.
- Status memakai latar transparan (`green-500/15`, `amber-500/15`, `red-500/15`) dengan teks `green-400`, `amber-400`, `red-400`.
- Simpan pilihan tema di `localStorage`; hormati `prefers-color-scheme` pada mode `auto`.

### 3.4 Fokus dan seleksi

- Cincin fokus: 2 px `brand-600` + offset 2 px; dark: `brand-300`.
- Jangan menghapus `outline` tanpa pengganti yang terlihat.
- Seleksi teks: `brand-100` (terang), `brand-500/30` (gelap).

---

## 4. Tipografi

| Peran | Ukuran | Line-height | Berat | Token/kelas |
|---|---|---|---|---|
| Judul halaman | 24 px | 32 px | 600 | `text-heading-six` / `text-2xl font-semibold` |
| Judul kartu | 18 px | 28 px | 600 | `text-title-sm` |
| Angka KPI besar | 32–36 px | 40 px | 700 | `text-3xl font-semibold tabular-nums` |
| Body desktop | 14 px | 22 px | 400 | `text-sm` |
| Body ponsel | 16 px | 24 px | 400 | `text-base sm:text-sm` |
| Label form | 14 px | 20 px | 500 | `text-sm font-medium` |
| Keterangan/bantuan | 12 px | 18 px | 400 | `text-xs` |
| Tabel | 14 px | 20 px | 400; header 500 | `text-sm` |

- Font: **Outfit** (bawaan template), fallback `sans-serif`.
- Angka metrik memakai `tabular-nums` agar tidak “meloncat” saat polling.
- Maksimal 2 ukuran judul per halaman.
- Jangan memakai huruf kapital semua untuk kalimat panjang; kapital hanya label kecil/badge.

---

## 5. Layout dan Spasi

### 5.1 Kerangka aplikasi

| Area | Desktop (≥1280) | Tablet (768–1279) | Ponsel (<768) |
|---|---|---|---|
| Sidebar | 290 px, tetap | 290 px, dapat ditutup | Off-canvas + hamburger |
| Header | 72 px, sticky | 72 px | 64 px |
| Konten | padding 24 px, maks. 1440 px | padding 24 px | padding 16 px |
| Grid | 12 kolom, gap 24 px | 8 kolom, gap 20 px | 4 kolom, gap 16 px |

- Lebar minimum yang didukung: **360 px**.
- Jangan membuat scroll horizontal pada halaman; tabel lebar memakai wrapper `overflow-x-auto` atau berubah menjadi kartu.
- Sidebar dikelompokkan: **Utama** (Dashboard, Lahan, Perangkat, Penyiraman, Riwayat), **Pengaturan** (Parameter, Kalibrasi), **Lainnya** (Laporan, Notifikasi, Profil, Bantuan), lalu **Admin** (Pengguna, Audit—hanya admin).
- Item aktif: latar `brand-50`, ikon/teks `brand-600`, indikator kiri 2 px.
- Header: pemilih lahan (dashboard), tombol tema, lonceng notifikasi, menu pengguna (Profil, Bantuan, Keluar).

### 5.2 Skala spasi

Gunakan kelipatan 4 px: `1=4`, `2=8`, `3=12`, `4=16`, `5=20`, `6=24`, `8=32`, `10=40`, `12=48`. Jarak antar-kartu 16–24 px; padding kartu 20–24 px; jarak label–input 6–8 px.

### 5.3 Sudut dan bayangan

- Kartu: `rounded-xl` (12 px) atau `rounded-2xl` untuk panel besar.
- Input/tombol: `rounded-lg` (8 px).
- Dialog: `rounded-2xl`, `shadow-theme-xl`.
- Bayangan minimal: `shadow-theme-xs` untuk kartu, `shadow-theme-md` untuk dropdown/dialog.
- Border `gray-200` / dark `gray-800`; hindari bayangan + border tebal bersamaan.

---

## 6. Komponen

### 6.1 Tombol

| Aksi | Gaya | Contoh |
|---|---|---|
| Masuk, Tambah, Simpan, Terapkan | primer hijau (`brand-600`) | “Simpan perubahan” |
| Ubah/Edit | outline biru (`blue-600` teks/border) | “Ubah” |
| Hapus/Nonaktifkan | outline/merah (`red-600`) | “Hapus lahan” |
| Batal/Tutup | netral abu (`gray-200`, teks `gray-700`) | “Batal” |
| Aksi sekunder | outline/ghost | “Lihat riwayat”, “Ekspor” |

- Tinggi minimal 40 px; target sentuh ponsel 44 px.
- Ikon opsional 16–20 px, selalu dengan teks kecuali tombol ikon (wajib `aria-label`).
- Saat memproses: spinner + teks “Menyimpan…” dan `disabled`; jangan mengubah lebar tombol.
- Tombol destruktif tidak pernah menjadi aksi default dialog.
- Fokus keyboard terlihat; `Enter` mengirim form, `Esc` menutup dialog.

### 6.2 Formulir

- Layout satu kolom; dua kolom hanya untuk pasangan pendek (mis. ambang kering/cukup) pada desktop.
- Label di atas input, wajib ditandai `*` merah + teks bantuan bila perlu.
- Pesan galat di bawah field, merah, spesifik (“Kata sandi minimal 8 karakter.”), bukan “Input tidak valid”.
- Validasi saat `onTouched` dan saat submit; jangan berkedip saat mengetik pertama.
- Input angka: `inputMode="numeric"`, satuan di kanan (`%`, `detik`, `menit`).
- Input kata sandi: tombol tampil/sembunyi dengan `aria-label`.
- Autofill dan paste diizinkan.
- Saat submit gagal server: pertahankan isian, fokus ke field pertama yang salah, tampilkan ringkasan galat di atas form bila >1.
- Form panjang (Parameter) memakai section + tombol simpan sticky di bawah pada ponsel.

### 6.3 Tabel

- Header sticky di dalam card, latar `gray-50`, teks 12 px kapital, `tracking-wide`.
- Baris tinggi 56 px, hover `gray-50`, garis bawah `gray-100`.
- Kolom aksi di kanan, rata kanan; tombol ikon dengan tooltip.
- Paginasi: “Menampilkan 1–10 dari 42”, tombol Sebelumnya/Berikutnya, ukuran halaman 10.
- Kosong: ilustrasi/ikon daun, judul “Belum ada data”, penjelasan, tombol aksi utama.
- Memuat: skeleton 5 baris, bukan spinner penuh halaman.
- Galat: pesan + tombol “Coba lagi”.
- Ponsel: ubah menjadi daftar kartu; label kolom menjadi label kecil di atas nilai. Jangan memaksa tabel 6 kolom.

### 6.4 Kartu KPI

Struktur: label kecil + ikon, angka besar, label status, keterangan waktu.

| Kartu | Isi | Status |
|---|---|---|
| Kelembapan tanah | `38,4%` + “Lembap” | warna + label + ikon |
| Status pompa | “Menyala”/“Mati” + mode | hijau/abu; mode badge |
| Penyiraman terakhir | “Hari ini, 14.30” + “12 detik” | — |
| Perangkat | “Online 2/3” atau “Offline” | hijau/merah + E-05 |

- Angka `—` bila belum ada data, bukan `0%` (0% berarti kering).
- Tampilkan “Terakhir diperbarui HH.mm.ss WITA” di bawah grid; bila basi, ganti dengan banner E-05.
- Kartu dapat diklik menuju detail (seluruh area), dengan fokus keyboard.

### 6.5 Grafik

- Garis utama `brand-600` 2 px; area gradient `brand-500/15` → transparan.
- Garis ambang: putus-putus, `red-500` (kering) dan `amber-500` (cukup), label di kanan.
- Sumbu X waktu WITA; 24 jam menampilkan `00.00…23.00`; 7 hari menampilkan `Sen 27 Okt`.
- Tooltip: waktu lengkap WITA + nilai + label status.
- Tidak ada data: tampilkan empty state di dalam area grafik, bukan grafik kosong.
- Selalu sediakan ringkasan teks di bawah grafik untuk pembaca layar (“Rata-rata 41%, terendah 28% pada 13.20”).
- Pilihan rentang: segmented control “Hari ini” / “7 hari”.
- Animasi masuk maksimal 300 ms; hormati `prefers-reduced-motion`.

### 6.6 Badge dan status

- Badge pil `rounded-full px-2.5 py-0.5 text-xs font-medium`.
- Varian: success, warning, danger, info, neutral.
- Ikon titik 6 px sebelum teks untuk online/offline.
- Jangan memakai badge untuk kalimat panjang; gunakan alert.

### 6.7 Dialog dan konfirmasi

- Lebar `max-w-lg` (form) / `max-w-md` (konfirmasi).
- Judul + deskripsi singkat; tombol aksi di kanan bawah: Batal (netral) lalu aksi utama.
- Hapus: judul “Hapus {nama}?”, jelaskan konsekuensi, tombol merah “Hapus”. Fokus awal pada Batal.
- Token perangkat: dialog khusus, tampilkan token **sekali**, tombol “Salin”, peringatan “Token tidak dapat dilihat lagi”, checkbox “Saya sudah menyimpan token”.
- Tutup dengan `Esc`/klik luar hanya bila tidak ada perubahan belum disimpan; bila ada, minta konfirmasi.

### 6.8 Notifikasi dan umpan balik

- Toast sukses: kanan atas, hijau, 4 detik, `role="status"`.
- Toast galat: merah, 6 detik, `role="alert"`, menyertakan kode E-xx kecil.
- Banner halaman untuk kondisi persisten (offline, data basi, tandon rendah)—bukan toast yang hilang.
- Lonceng header: badge angka (maks. “99+”), dropdown 5 terbaru + “Lihat semua”.
- Notifikasi belum dibaca: latar `brand-50/50`, titik hijau; sudah dibaca: latar putih.
- Ikon per tipe: kering `LeafIcon`, tandon `WaterDropIcon`, offline `LinkIcon`, sensor `GearIcon`.

### 6.9 Keadaan kosong, memuat, galat

| Keadaan | Tampilan |
|---|---|
| Belum ada lahan | “Mulai dengan menambahkan lahan” + tombol “Tambah lahan” |
| Belum ada perangkat | “Hubungkan perangkat ESP32” + tombol “Tambah perangkat” + tautan bantuan |
| Belum ada telemetri | Kartu `—`, banner “Menunggu data pertama” |
| Memuat | Skeleton kartu/baris; jangan layout shift |
| Galat jaringan | “Tidak dapat memuat data. Periksa koneksi Anda.” + “Coba lagi” |
| 403 | “Anda tidak memiliki hak akses” (E-03) + kembali ke dashboard |
| Sesi habis | Arahkan ke `/signin` dengan banner E-04 |

---

## 7. Spesifikasi Halaman

### 7.1 `/signin` — Masuk

- Dua panel: kiri form (maks. 420 px), kanan panel hijau gelap dengan logo + tagline (sembunyikan di <lg).
- Judul “Masuk ke GREENFLOW”, subjudul “Pantau lahan sawi Anda.”
- Field email + kata sandi; tautan “Lupa kata sandi?”; tombol “Masuk” penuh.
- Tautan “Belum punya akun? Daftar”.
- Galat login generik E-02 di atas tombol; jangan membedakan email/sandi.
- Setelah sukses → `/`; bila sudah login membuka `/signin` → redirect `/`.
- Fokus awal ke email; `autocomplete="email"` dan `current-password`.

### 7.2 `/signup` — Daftar

- Field nama, email, kata sandi, konfirmasi; indikator kekuatan sandi ringan (8+ karakter).
- Catatan “Akun baru berperan Pengguna. Admin dapat mengubah peran.”
- Sukses → langsung masuk ke dashboard (sesuai D5).
- Tautan “Sudah punya akun? Masuk”.

### 7.3 `/reset-password` — Lupa kata sandi

- Satu field email + tombol “Kirim tautan reset”.
- Respons selalu sama: “Jika email terdaftar, tautan reset telah dikirim.” (tidak membocorkan email).
- Tautan kembali ke masuk.

### 7.4 `/` — Dashboard

Urutan blok:

1. Header halaman: “Dashboard” + pemilih lahan (dropdown) + “Terakhir diperbarui …”.
2. Banner kondisi (bila ada): offline, data basi, tandon rendah, kering.
3. Grid 4 kartu: kelembapan, pompa/mode, penyiraman terakhir, perangkat online.
4. Grafik kelembapan (span 8) + panel “Aktivitas terbaru” (span 4).
5. Ringkasan semua lahan (bila >1): kartu kecil per lahan dengan status.
6. Tautan cepat: “Siram manual”, “Lihat riwayat”.

- Polling 10 detik; hentikan saat tab tidak terlihat.
- Bila >1 lahan, pemilih menyimpan pilihan terakhir di `localStorage`.
- Jangan menampilkan angka 0 saat data belum ada.
- Kartu kering memakai ikon + label; jangan hanya mengubah warna.

### 7.5 `/lahan` — Lahan

- Header + tombol “Tambah lahan” (primer).
- Ringkasan kecil: total lahan, aktif, luas total (bila diisi).
- Tabel: Nama, Lokasi, Luas, Perangkat, Status, Aksi (Ubah/Hapus).
- Dialog tambah/ubah: nama, lokasi, luas (opsional), status.
- Hapus: konfirmasi; bila E-08, tampilkan pesan dan sarankan nonaktifkan.
- Ponsel: kartu dengan nama + lokasi + badge status + menu aksi.

### 7.6 `/perangkat` — Perangkat

- Filter: lahan, tipe (Pengendali/Sensor/Pompa), status; tombol “Tambah perangkat”.
- Tabel: Nama, Kode, Tipe, Lahan, Induk, Status, Online, Aksi.
- Form: nama, kode (huruf kecil/angka/tanda hubung, tidak dapat diubah setelah simpan), tipe, lahan, induk (hanya untuk sensor/pompa).
- Setelah membuat pengendali: dialog token sekali + tombol salin + peringatan.
- Aksi: Ubah, Putar token, Cabut token, Hapus. Putar/cabut meminta konfirmasi.
- Baris offline: badge merah + waktu terakhir terlihat; tautan E-05.
- Sensor: tautan “Kalibrasi”.

### 7.7 `/penyiraman` — Kontrol

- Pemilih lahan + kartu pengendali.
- Kartu utama: status pompa besar, mode (segmented Otomatis/Manual), kelembapan saat ini.
- Mode Otomatis: teks “Server menentukan durasi berdasarkan kelembapan.” Tombol manual nonaktif.
- Mode Manual: tombol “Siram sekarang” + pilihan durasi (default 10 detik, maks. parameter); konfirmasi.
- Status perintah: “Menunggu perangkat” → “Dijalankan” → “Selesai”; tampilkan estimasi “dikirim pada kiriman data berikutnya (± 5 menit)”.
- Blokir dengan alasan jelas: offline, tandon rendah, mode otomatis, tidak ada perangkat.
- Riwayat singkat 3 terakhir di bawah.

### 7.8 `/riwayat` — Riwayat penyiraman

- Filter: rentang tanggal (flatpickr, bawaan 7 hari), lahan, pemicu; tombol “Terapkan” dan “Reset”.
- Tabel: Waktu mulai (WITA), Lahan, Durasi, Pemicu (+ nama), Kelembapan sebelum→sesudah, Status.
- Paginasi server 10/halaman.
- Tombol “Ekspor CSV” dan “Ekspor XLSX” (maks. 31 hari).
- Kosong: “Belum ada penyiraman pada rentang ini.”

### 7.9 `/parameter` — Parameter & Fuzzy

- Pemilih lahan.
- Section “Ambang & durasi”: ambang kering, titik tengah, ambang cukup, durasi maksimum, interval kirim.
- Section “Fuzzy Sugeno”: tiga keluaran durasi (Kering/Lembap/Basah) + pratinjau interaktif (slider kelembapan 0–100 → μ dan durasi).
- Grafik keanggotaan kecil (tiga segitiga/bahu) dengan titik 30/45/60.
- Tombol “Kembalikan ke bawaan” (konfirmasi) dan “Simpan perubahan”.
- Validasi E-07 inline; jangan mengizinkan simpan bila `kering ≥ tengah ≥ cukup`.
- Catatan “Nilai ini hanya memengaruhi penyiraman otomatis.”

### 7.10 `/kalibrasi` — Kalibrasi sensor

- Pemilih lahan + sensor.
- Kartu nilai saat ini: ADC kering, ADC basah, estimasi persen.
- Form: ADC kering (0–4095), ADC basah (0–4095), catatan; validasi `kering > basah`.
- Pratinjau: “ADC 2410 → 38%” memakai rumus `(adcKering − adc) / (adcKering − adcBasah) × 100`.
- Tabel riwayat: waktu, ADC kering/basah, oleh, catatan.

### 7.11 `/laporan` — Laporan & ekspor

- Filter rentang tanggal + lahan.
- Kartu ringkasan: total siram, total durasi, rata-rata kelembapan, estimasi volume (bila sensor aliran).
- Grafik batang durasi per hari + garis rata-rata kelembapan.
- Tabel ringkasan per lahan.
- Tombol ekspor CSV/XLSX; status memproses dan unduhan.
- Rentang >31 hari untuk ekspor mentah ditolak dengan pesan jelas.

### 7.12 `/notifikasi` — Notifikasi

- Filter: Semua / Belum dibaca; tipe.
- Tombol “Tandai semua dibaca”.
- Item: ikon, judul, pesan, lahan/perangkat, waktu relatif (“5 menit lalu”) + waktu lengkap di tooltip.
- Klik item → lahan/perangkat terkait (deep link).
- Kosong: “Tidak ada notifikasi. Kondisi lahan aman.”

### 7.13 `/profil` — Profil

- Kartu identitas: inisial/avatar, nama, email, peran, status.
- Form “Ubah nama” (email read-only).
- Form “Ganti kata sandi”: sandi lama, baru, konfirmasi; validasi 8+; sukses mencabut sesi lain.
- Tombol “Keluar” di akhir halaman (selain menu header).

### 7.14 `/bantuan` — Bantuan

- Panduan singkat 3 langkah: cek dashboard → lihat riwayat → siram manual.
- FAQ: arti Kering/Lembap/Basah, kenapa perangkat offline, kenapa tombol siram nonaktif, cara membaca WITA.
- Glosarium istilah.
- Kontak/admin (placeholder sampai data dinas tersedia).
- Tidak ada form yang mengirim data.

### 7.15 `/pengguna` — Kelola akun (admin)

- Hanya tampil untuk admin; pengguna yang membuka URL langsung mendapat halaman 403 (server menolak API).
- Header + “Tambah pengguna”.
- Pencarian nama/email; filter peran/status.
- Tabel: Nama, Email, Peran, Status, Terakhir masuk, Aksi.
- Dialog tambah: nama, email, kata sandi awal, peran (pengguna/admin).
- Aksi: Ubah nama/peran, Nonaktifkan/Aktifkan, Reset kata sandi (kirim email), Hapus (konfirmasi).
- Admin terakhir: tombol hapus/turunkan/nonaktifkan dinonaktifkan dengan tooltip “Minimal satu admin harus aktif.”
- Badge peran: admin `brand`, pengguna `gray`.
- Jangan pernah menampilkan kata sandi.

### 7.16 `/audit` — Log aktivitas (admin)

- Filter tanggal, aktor, jenis aksi.
- Tabel: Waktu (WITA), Aktor, Aksi, Entitas, Ringkasan.
- Dialog detail: sebelum/sesudah (JSON terformat, field sensitif tidak ada), IP, request ID.
- Read-only; tidak ada tombol hapus.

### 7.17 Halaman galat

| Rute | Isi | Aksi |
|---|---|---|
| `/error-403` | “Anda tidak memiliki hak akses” + E-03 | Kembali ke dashboard |
| `/error-404` | “Halaman tidak ditemukan” | Kembali ke dashboard |
| 500 | “Terjadi kesalahan pada server” + E-01 | Coba lagi / dashboard |

Gunakan ilustrasi sederhana (daun/air), bukan gambar stok. Jangan menampilkan stack trace.

---

## 8. Pola Interaksi dan Status

### 8.1 Kesegaran data

- Dashboard: polling 10 detik; teks “Terakhir diperbarui 14.32.10 WITA”.
- Bila `lastSeenAt` > 2× interval: badge **Offline** + banner E-05 “Data sudah usang. Periksa koneksi perangkat.”
- Jangan menghapus angka terakhir; beri label “data terakhir 14.20” agar tidak menyesatkan.
- Tombol “Muat ulang” manual tersedia di banner.

### 8.2 Aksi lama (model pull)

- Setelah “Siram sekarang”: tampilkan status “Menunggu perangkat” dengan penjelasan “Perintah dikirim saat perangkat mengirim data berikutnya (± 5 menit).”
- Jangan menampilkan spinner tanpa batas; gunakan timeline status.
- Bila kedaluwarsa: “Perintah kedaluwarsa. Perangkat tidak merespons.” + tombol coba lagi.

### 8.3 Konfirmasi dan pembatalan

- Hapus akun/lahan/perangkat, rotasi token, reset parameter, dan siram manual selalu meminta konfirmasi.
- Aksi yang dapat dibatalkan (form) menyimpan draft di state, bukan `localStorage`, kecuali pemilih lahan.
- Setelah sukses: toast + tutup dialog + invalidasi data; jangan memuat ulang seluruh halaman.

### 8.4 Penanganan galat

- Tampilkan `message` dari server (sudah Bahasa Indonesia), bukan kode mentah.
- Kode E-xx ditampilkan kecil di bawah pesan untuk dukungan.
- Galat validasi: tandai field terkait; ringkasan di atas form.
- 401: redirect ke `/signin` + banner E-04.
- 403: halaman 403 (bukan toast), sesuai E-03.
- 429: “Terlalu banyak percobaan. Coba lagi dalam …” bila header retry tersedia.
- 503: banner E-06 + tombol coba lagi.

---

## 9. Bahasa dan Penulisan

### 9.1 Nada

- Sapa pengguna dengan **“Anda”**, bukan “kamu”.
- Kalimat pendek, aktif, tanpa istilah teknis berlebihan.
- Hindari “error”, “invalid”, “device”, “fuzzy” di UI umum.
- Gunakan “perangkat”, “pengendali”, “sensor”, “pompa”, “lahan”, “siram”, “kelembapan”, “tandon”.

### 9.2 Format

| Data | Format | Contoh |
|---|---|---|
| Tanggal | `dd MMM yyyy` | `02 Nov 2026` |
| Waktu | `HH.mm` WITA | `14.30 WITA` |
| Tanggal + waktu | `dd MMM yyyy, HH.mm` | `02 Nov 2026, 14.30` |
| Angka desimal | koma | `38,4%` |
| Ribuan | titik | `1.250` |
| Durasi | detik/menit | `12 detik`, `5 menit` |
| Persen | satu desimal | `38,4%` |
| Rentang | en dash | `30–60%` |

- Gunakan `Intl.NumberFormat("id-ID")` dan `Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar" })`.
- Jangan menampilkan timezone UTC di UI; cukup WITA.
- “Hari ini”, “Kemarin”, lalu tanggal untuk lebih lama.

### 9.3 Istilah status

| Konteks | Teks |
|---|---|
| Pompa | “Menyala” / “Mati” |
| Mode | “Otomatis” / “Manual” |
| Perangkat | “Online” / “Offline” / “Nonaktif” |
| Kelembapan | “Kering” / “Lembap” / “Basah” |
| Perintah | “Menunggu perangkat” / “Dikirim” / “Dijalankan” / “Selesai” / “Kedaluwarsa” / “Gagal” |
| Akun | “Aktif” / “Nonaktif” |
| Notifikasi | “Tanah kering” / “Air tandon rendah” / “Perangkat offline” / “Sensor bermasalah” |

---

## 10. Aksesibilitas

- Target **WCAG 2.1 AA**; kontras teks ≥ 4,5:1, teks besar ≥ 3:1.
- Jangan menyampaikan status hanya dengan warna; selalu teks/ikon.
- Semua kontrol dapat dijangkau `Tab`; urutan fokus logis; fokus terlihat.
- `Esc` menutup dialog/dropdown; fokus kembali ke pemicu.
- Form: `label` terhubung ke input, `aria-invalid`, `aria-describedby` untuk pesan galat.
- Tabel: `caption`/judul, header `scope="col"`, tombol aksi berlabel.
- Grafik: ringkasan teks + `aria-label`; jangan mengandalkan tooltip saja.
- Ikon dekoratif `aria-hidden="true"`; ikon bermakna punya `aria-label`.
- Animasi ≤ 300 ms dan hormati `prefers-reduced-motion`.
- Target sentuh ≥ 44×44 px di ponsel.
- Bahasa halaman `lang="id"`; judul halaman unik per rute (`PageMeta`).

---

## 11. Responsif

| Breakpoint | Perilaku |
|---|---|
| `<640` | Satu kolom; tabel → kartu; filter menjadi drawer; tombol aksi utama penuh lebar |
| `640–1023` | Dua kolom kartu; sidebar off-canvas; grafik penuh lebar |
| `1024–1279` | Sidebar dapat ditutup; grid 2–3 kolom |
| `≥1280` | Sidebar tetap; dashboard 4 kartu + grafik 8/4; tabel penuh |

- Uji minimal 360×800, 768×1024, 1366×768.
- Jangan menyembunyikan aksi penting di balik hover (ponsel tidak punya hover).
- Menu aksi tabel memakai dropdown yang dapat disentuh.

---

## 12. Implementasi di TailAdmin

### 12.1 Yang dipertahankan

- `AppLayout`, `AuthLayout`, `components/ui/*`, `PageMeta`, `PageBreadcrumb`, `Card`, `Button`, `Input`, `Field`, `Table`/TanStack, dialog, dropdown, badge, toast.
- Konvensi: folder halaman `pages/main/<fitur>`, rute hanya di `App.tsx`, item sidebar di `sidebar/data.tsx`, teks di `messages/id.json`.

### 12.2 Yang ditambahkan

- `components/shared/status-badge.tsx`: pemetaan status → varian + label + ikon.
- `components/shared/empty-state.tsx`, `error-state.tsx`, `loading-skeleton.tsx`.
- `components/shared/data-freshness.tsx`: “Terakhir diperbarui …” + banner E-05.
- `components/shared/confirm-dialog.tsx`: konfirmasi destruktif standar.
- `components/shared/metric-card.tsx`: kartu KPI.
- `components/shared/date-range-filter.tsx`: flatpickr + preset 7/30 hari.
- Hook `useDashboard`, `useLahan`, `useDevices`, dll. di `src/api/` (TanStack Query).
- `contexts/auth-context.tsx` + `RequireAuth`/`RequireRole` pada Phase 1.

### 12.3 Aturan styling

- Token warna hanya di `src/index.css`; jangan membuat `tailwind.config.*`.
- Gunakan `cn()` untuk menggabungkan kelas; jangan template string bersyarat yang sulit dibaca.
- Selalu sertakan `dark:` untuk permukaan, teks, border, dan status.
- Gunakan utilitas logis (`ms-`, `me-`, `ps-`, `pe-`, `text-start`) meski v1 hanya LTR.
- Ikon dari `@/icons`, bukan SVG inline di halaman.
- Jangan menambah library UI baru tanpa persetujuan (AGENTS.md).

### 12.4 Token yang perlu ditambahkan saat implementasi

```css
/* usulan, tambahkan ke @theme di index.css */
--color-success-50: #f0fdf4;
--color-success-600: #16a34a;
--color-success-700: #15803d;
--color-warning-50: #fffbeb;
--color-warning-500: #f59e0b;
--color-warning-700: #b45309;
--color-danger-50: #fef2f2;
--color-danger-600: #dc2626;
--color-danger-700: #b91c1c;
--color-info-50: #eff6ff;
--color-info-600: #2563eb;
--color-info-700: #1d4ed8;
```

Bila tidak menambah token, gunakan palet Tailwind (`green-*`, `amber-*`, `red-*`, `blue-*`) secara konsisten; jangan mencampur keduanya dalam satu komponen.

---

## 13. Checklist QA Desain

- [ ] Semua teks Bahasa Indonesia; tidak ada sisa “TailAdmin”, “eCommerce”, “Calendar”, atau dummy.
- [ ] Warna status selalu disertai label teks.
- [ ] Kontras AA di terang dan gelap.
- [ ] Fokus keyboard terlihat di semua kontrol.
- [ ] `Esc` menutup dialog/dropdown; fokus kembali.
- [ ] Tidak ada scroll horizontal di 360 px.
- [ ] Tabel berubah menjadi kartu di ponsel.
- [ ] Empty/loading/error state ada di setiap halaman data.
- [ ] Waktu tampil WITA; angka memakai format `id-ID`.
- [ ] Data basi menampilkan E-05, bukan angka seolah segar.
- [ ] Tombol destruktif meminta konfirmasi dan bukan aksi default.
- [ ] Token perangkat hanya tampil sekali dan tidak masuk log/audit.
- [ ] Menu admin tersembunyi untuk pengguna; URL langsung tetap 403.
- [ ] `npm run build` dan `npm run lint` lulus setelah perubahan UI.

---

## 14. Jejak ke PRD/Architecture

| Sumber | Dipenuhi |
|---|---|
| PRD 9.1–9.2 | Dasar TailAdmin, peta halaman, penghapusan demo |
| PRD 9.3 | Hijau `#2E7D32`, kontras, sidebar, tombol, pintasan |
| PRD 9.4 | Bahasa Indonesia, locale `id` saja |
| PRD 9.5 | Pesan E-01…E-08, sukses hijau/galat merah |
| PRD FR-10…16 | Kartu dashboard, grafik, data basi |
| PRD FR-20…23 | Kontrol mode/manual, status menunggu |
| PRD FR-30…32 | Tabel riwayat, filter, ekspor |
| PRD FR-40…41 | Lonceng, badge, notifikasi |
| PRD FR-50…56 | Halaman lahan, perangkat, parameter, kalibrasi |
| PRD FR-60…61 | Bantuan, audit |
| Architecture 6.2–6.4 | Rute, penjaga, lapisan data, format WITA |
| Architecture AD-05 | Polling 10 detik + ETag |
| Architecture AD-10 | Dialog token sekali tampil |
| NFR-04 | Responsif 360 px, WCAG AA |
| NFR-09 | Seluruh UI Bahasa Indonesia |
