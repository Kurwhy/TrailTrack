# TrailTrack

Sistem reservasi dan operasional rental perlengkapan gunung. Penyewa dapat melihat ketersediaan alat per tanggal, memesan dengan DP dan deposit, membayar lewat Midtrans, lalu staf mencatat serah terima, inspeksi kondisi, denda, dan penyelesaian pesanan.

![Halaman katalog TrailTrack](docs/screenshots/01-katalog.png)

## Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur Utama](#fitur-utama)
- [Teknologi](#teknologi)
- [Struktur Proyek](#struktur-proyek)
- [Prasyarat](#prasyarat)
- [Konfigurasi .env](#konfigurasi-env)
- [Menyiapkan Database](#menyiapkan-database)
- [Menjalankan Aplikasi](#menjalankan-aplikasi)
- [Akun dan Data Demo](#akun-dan-data-demo)
- [Halaman dan Tangkapan Layar](#halaman-dan-tangkapan-layar)
- [Alur Bisnis](#alur-bisnis)
- [Pembayaran Midtrans](#pembayaran-midtrans)
- [Keamanan dan SEO](#keamanan-dan-seo)
- [Skrip NPM](#skrip-npm)
- [Pengujian yang Sudah Dilakukan](#pengujian-yang-sudah-dilakukan)
- [Aset dan Lisensi Foto](#aset-dan-lisensi-foto)
- [Catatan dan Batasan](#catatan-dan-batasan)

## Tentang Proyek

TrailTrack adalah aplikasi web untuk basecamp rental alat gunung. Fokusnya ada pada tiga hal yang sering merepotkan pengelola rental:

1. Ketersediaan alat per tanggal, termasuk masa buffer setelah alat kembali, sehingga tidak terjadi overbooking.
2. Perhitungan denda keterlambatan yang jelas, memakai grace period dan tarif per item per hari.
3. Pencatatan kondisi alat saat kembali, termasuk biaya kerusakan dari acuan biaya, sehingga stok rusak tidak muncul sebagai stok siap sewa.

Aplikasi punya dua area:

- Area publik tanpa login: katalog, kalender ketersediaan, pemesanan, detail pesanan, pembayaran, dan cek riwayat memakai nomor HP.
- Area staf dengan login: daftar pesanan, pesanan baru, proses serah terima, inspeksi pengembalian, inventaris, dan daftar penyewa.

Seluruh data disimpan di MySQL melalui API. Data contoh di bawah hanya untuk pengembangan dan dapat diganti dengan data basecamp sebenarnya.

## Fitur Utama

Publik:

- Katalog 24 alat dalam 15 kategori dengan foto, harga sewa, tarif denda, deposit, dan sisa unit.
- Kalender ketersediaan per tanggal dengan angka Terpakai, Buffer, dan Sisa.
- Pencegahan overbooking di server dengan transaksi dan penguncian baris SKU.
- Pemesanan dengan tanggal ambil dan kembali, durasi inklusif, DP, deposit, dan simulasi denda.
- Pembayaran DP dan deposit, serta pelunasan, melalui Midtrans Snap Sandbox.
- Detail pesanan dengan rincian tagihan terpisah.
- Cek riwayat sewa tanpa login memakai nomor HP, dengan nomor yang disamarkan.

Staf:

- Login dengan email dan kata sandi, sesi cookie httpOnly, dan penguncian akun sementara.
- Daftar seluruh pesanan dengan status dan penanda telat.
- Membuat pesanan baru untuk pelanggan.
- Persetujuan atau penolakan pesanan penyewa bermasalah.
- Serah terima Picked Up dengan pemilihan kode unit.
- Pencatatan pengembalian dan inspeksi kondisi per unit.
- Perhitungan denda, biaya kerusakan, dan selisih akhir otomatis.
- Pemeriksaan status pembayaran dan penyelesaian pesanan.
- Inventaris per SKU dan per unit, termasuk Tandai Baik setelah perbaikan.
- Daftar penyewa dengan jumlah telat, jumlah rusak, dan status Normal atau Bermasalah.

## Teknologi

| Lapisan | Teknologi |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Routing | React Router v6 |
| Data fetching | TanStack Query |
| Animasi | Framer Motion, dengan fallback reduced motion |
| Ikon | Lucide React |
| Validasi | zod, di frontend dan backend |
| Backend | Node.js, Express, TypeScript |
| Database | MySQL 8, Drizzle ORM, mysql2 |
| Autentikasi | JWT di cookie httpOnly, bcrypt |
| Pembayaran | Midtrans Snap Sandbox, webhook signature SHA512 |
| Rate limit | express-rate-limit |

## Struktur Proyek

```text
TrailTrack/
  docs/
    screenshots/              Tangkapan layar untuk README
  public/
    brand/                    Logo mark dan logo penuh
    images/gear/              Foto alat yang dipakai katalog
    favicon.png               Ikon tab dari logo
    robots.txt
    sitemap.xml
  server/
    drizzle/                  Migrasi Drizzle Kit
    src/
      db/                     Koneksi, skema, dan seed
      lib/                    Aturan bisnis, ketersediaan, pesanan, Midtrans
      middleware/             Autentikasi dan rate limit
      routes/                 Endpoint publik, admin, dan Midtrans
      env.ts
      index.ts
  src/
    components/
      admin/                  Modal inspeksi
      catalog/                Kalender, kartu alat, drawer pemesanan, media alat
      layout/                 Layout publik dan admin
      shared/                 Logo, empty state, topo pattern
      ui/                     Button, input, card, badge, drawer, modal
    hooks/                    Hook TanStack Query
    lib/                      API client, aturan tampilan, format, tipe
    pages/
      admin/                  Halaman staf
      public/                 Halaman publik
    store/                    Auth context
    App.tsx
    main.tsx
```

## Prasyarat

- Node.js 20 atau lebih baru. Proyek ini diuji pada Node.js 26.
- npm.
- MySQL 8. Skema dan migrasi ditulis untuk dialek MySQL 8. Lingkungan pengembangan saat ini memakai build MySQL yang lebih baru dari Homebrew, namun struktur tabel tetap kompatibel dengan MySQL 8.
- Akun Midtrans Sandbox jika ingin mencoba pembayaran Snap.

## Konfigurasi .env

Salin `.env.example` menjadi `.env`, lalu sesuaikan nilainya. File `.env` sudah diabaikan oleh git.

| Variabel | Keterangan |
| --- | --- |
| `NODE_ENV` | `development` atau `production`. Endpoint simulasi pembayaran hanya aktif di luar production. |
| `PORT` | Port API, default 4000. |
| `APP_URL` | URL aplikasi web. |
| `CORS_ORIGIN` | Origin frontend yang diizinkan, default `http://localhost:5173`. |
| `DATABASE_URL` | URL koneksi MySQL, contoh `mysql://user:password@127.0.0.1:3306/trailtrack`. |
| `JWT_SECRET` | Kunci acak panjang untuk token sesi staf. |
| `ADMIN_SEED_EMAIL` | Email admin yang dibuat oleh seed. |
| `ADMIN_SEED_PASSWORD` | Kata sandi admin awal, disimpan sebagai hash bcrypt. |
| `BUFFER_HARI` | Jumlah hari buffer setelah tanggal kembali. |
| `GRACE_JAM` | Toleransi keterlambatan dalam jam. |
| `JAM_BATAS_KEMBALI` | Jam batas pengembalian pada tanggal kembali, format `HH:MM`. |
| `DP_PERSEN` | Persentase DP dari total sewa. |
| `TELAT_BATAS` | Jumlah keterlambatan yang membuat penyewa Bermasalah. |
| `MIDTRANS_SERVER_KEY` | Kunci server Midtrans. Hanya dipakai backend. Jangan dimasukkan ke variabel VITE. |
| `MIDTRANS_CLIENT_KEY` | Kunci client Midtrans. Untuk Snap di browser, pakai nilai yang sama dengan `VITE_MIDTRANS_CLIENT_KEY`. |
| `MIDTRANS_IS_PRODUCTION` | `true` untuk produksi, `false` untuk Sandbox. |
| `VITE_API_URL` | Alamat API dari sisi frontend, contoh `http://localhost:4000/api`. |
| `VITE_BUFFER_HARI` dan variabel VITE aturan bisnis lain | Duplikat untuk tampilan dan simulasi di frontend, harus sama dengan nilai server. |
| `VITE_ADMIN_EMAIL` dan `VITE_ADMIN_PASSWORD` | Ditampilkan sebagai akun demo di halaman login. |
| `VITE_MIDTRANS_CLIENT_KEY` | Client key untuk memuat Snap.js. |
| `VITE_MIDTRANS_SNAP_JS_URL` | URL script Snap.js, Sandbox atau produksi. |

Aturan bisnis dibaca dari file `.env`. Backend memakai nama tanpa prefix, frontend memakai prefix `VITE_` untuk keperluan tampilan dan simulasi. Jaga nilainya tetap sama.

## Menyiapkan Database

Contoh membuat database dan user MySQL:

```sql
CREATE DATABASE trailtrack CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'trailtrack'@'%' IDENTIFIED BY 'ganti_password';
GRANT ALL PRIVILEGES ON trailtrack.* TO 'trailtrack'@'%';
FLUSH PRIVILEGES;
```

Lalu:

```bash
npm install
npm run db:migrate
npm run db:seed
```

Seed akan membuat:

- Akun admin dari `ADMIN_SEED_EMAIL` dan `ADMIN_SEED_PASSWORD`.
- 24 SKU dalam 15 kategori.
- 192 unit dengan beberapa kondisi khusus untuk demonstrasi stok rusak.
- Acuan biaya untuk Tenda Dome 4 Orang.
- 4 penyewa contoh.
- 8 pesanan contoh yang mewakili status penting.
- Foto alat tersimpan di `public/images/gear` dan dirujuk dari kolom `sku.foto_url`.

## Menjalankan Aplikasi

Cara cepat, jalankan web dan API bersamaan:

```bash
npm run dev:all
```

Atau dua terminal:

```bash
npm run dev:server
npm run dev
```

Alamat:

- Web: `http://localhost:5173`
- API: `http://localhost:4000`
- Health check: `http://localhost:4000/api/health`

Build produksi:

```bash
npm run build        # frontend ke dist/
npm run build:server # backend ke server/dist/
npm run start:server # menjalankan server hasil build
```

## Akun dan Data Demo

Login staf:

```text
Email    : staf@trailtrack.example
Sandi    : trailtrack123
```

Nomor HP untuk Cek Riwayat:

| Nama | Nomor HP | Status |
| --- | --- | --- |
| Rizky Pratama | 081234567810 | Normal |
| Dewi Lestari | 085722104432 | Bermasalah |
| Bagas Wicaksono | 087811906625 | Normal, memiliki riwayat telat dan rusak |
| Rombongan Pendaki | 081298765432 | Normal |

Pesanan contoh:

| Kode | Penyewa | Status | Untuk mencoba |
| --- | --- | --- | --- |
| TT-20261204-0001 | Rizky Pratama | Sedang Disewa | Sudah kembali, denda 150.000, pelunasan 7.500 |
| TT-20261205-0002 | Dewi Lestari | Menunggu Persetujuan | Tombol Setujui dan Tolak di admin |
| TT-20261210-0001 | Rizky Pratama | Menunggu Pembayaran | Pembayaran DP lewat Midtrans |
| TT-20261204-0003 | Rombongan Pendaki | Terkonfirmasi | Picked Up 8 unit tenda |
| TT-20261128-0002 | Bagas Wicaksono | Terkonfirmasi | Picked Up carrier |
| TT-20261122-0001 | Bagas Wicaksono | Sedang Disewa (Telat) | Catat Pengembalian dan inspeksi |
| TT-20261120-0001 | Bagas Wicaksono | Selesai | Contoh pesanan selesai |
| TT-20261125-0001 | Dewi Lestari | Ditolak | Contoh kuota yang dilepas |

## Halaman dan Tangkapan Layar

### 1. Katalog dan Kalender (`/`)

![Halaman katalog](docs/screenshots/01-katalog.png)

Halaman utama untuk pelanggan. Bagian atas berisi hero dengan pemilih tanggal ambil dan kembali, ringkasan jumlah alat dan unit siap sewa, serta info buffer. Di bawahnya ada katalog dengan filter kategori, satu kartu unggulan, dan kartu alat berfoto lengkap dengan harga sewa, tarif denda, deposit, dan badge sisa unit.

Saat tanggal dipilih, angka sisa pada kartu mengikuti ketersediaan untuk rentang tersebut. Klik kartu alat untuk membuka kalender dan drawer pemesanan.

![Kalender dan drawer pemesanan](docs/screenshots/02-katalog-kalender.png)

Drawer pemesanan menampilkan kalender per bulan. Setiap tanggal menunjukkan angka Terpakai, Buffer, dan Sisa. Tanggal terpilih ditandai burnt orange, masa buffer memakai warna burnt muda, dan unit habis memakai penanda merah. Drawer juga menampilkan durasi sewa, jumlah unit, total sewa, DP, deposit, total bayar awal, simulasi denda berdasarkan jam terlambat, dan form nama serta nomor HP.

Catatan perilaku:

- Durasi sewa inklusif, hari ambil dan hari kembali dihitung.
- Maksimal unit mengikuti sisa pada seluruh tanggal sewa.
- Nomor HP dinormalisasi ke format `08xxxxxxxxxx`.
- Jika nomor terdaftar sebagai penyewa Bermasalah, deposit memakai tarif bermasalah dan pesanan menunggu persetujuan admin.
- Overbooking dicek ulang di server saat pesanan disimpan.

### 2. Detail Pesanan (`/pesanan/:kode`)

![Detail pesanan](docs/screenshots/03-detail-pesanan.png)

Halaman untuk melihat satu pesanan memakai kodenya. Menampilkan status, nama penyewa dengan nomor HP tersamarkan, jadwal, daftar alat, dan rincian tagihan: total sewa, DP, sisa sewa, denda keterlambatan, biaya kerusakan, deposit dibayar, dan selisih akhir.

Tombol pembayaran muncul sesuai status. Pesanan Menunggu Pembayaran menampilkan tombol Bayar DP dan deposit. Pesanan yang sudah dikembalikan dengan selisih positif menampilkan tombol Bayar Pelunasan. Pembayaran membuka Midtrans Snap.

Halaman ini memakai `noindex, nofollow` karena berisi data pesanan.

### 3. Cek Riwayat Sewa (`/riwayat`)

![Cek riwayat](docs/screenshots/04-riwayat.png)

Penyewa memasukkan nomor HP tanpa login. Sistem menampilkan nama, nomor HP yang disamarkan, status penyewa, lalu daftar pesanan beserta status, total denda, dan biaya kerusakan. Hasil hanya menampilkan pesanan milik nomor tersebut.

Endpoint riwayat memakai rate limit untuk mengurangi penebakan nomor HP. Nomor lengkap tidak ditampilkan di antarmuka dan tidak ditulis ke log aplikasi.

### 4. Login Staf (`/admin/login`)

![Login staf](docs/screenshots/05-login-admin.png)

Form email dan kata sandi untuk staf. Login yang berhasil membuat sesi JWT di cookie httpOnly, secure di production, dan sameSite strict. Setelah 5 kali gagal berturut-turut, akun dikunci sementara selama 15 menit.

Halaman ini juga menampilkan akun demo agar mudah dicoba di lingkungan pengembangan.

### 5. Daftar Pesanan (`/admin/pesanan`)

![Daftar pesanan](docs/screenshots/06-admin-pesanan.png)

Tabel seluruh pesanan dengan kode, nama penyewa, tanggal ambil, tanggal kembali, dan status. Pesanan yang melewati batas pengembalian ditampilkan sebagai Sedang Disewa (Telat) dengan badge merah. Tombol Pesanan baru membuka form pesanan admin.

Tidak ada filter tambahan di halaman ini. Data terbaru tampil paling atas. Di mobile, tabel berubah menjadi daftar kartu.

### 6. Pesanan Baru oleh Admin (`/admin/pesanan/baru`)

![Pesanan baru](docs/screenshots/07-admin-pesanan-baru.png)

Form pesanan yang diisi staf. Field-nya sama dengan pesanan pelanggan: nama, nomor HP, tanggal ambil, tanggal kembali, dan daftar alat. Staf bisa menambah beberapa baris alat, dan setiap baris menampilkan sisa unit untuk rentang tanggal yang dipilih.

Rincian biaya menghitung total sewa, DP, deposit sesuai status penyewa, dan total bayar awal. Pesanan yang dibuat admin langsung berstatus Menunggu Pembayaran tanpa tahap persetujuan, tetapi deposit tetap mengikuti status penyewa yang tercatat.

### 7. Detail dan Proses Pesanan (`/admin/pesanan/:id`)

![Detail proses pesanan](docs/screenshots/08-admin-detail-pesanan.png)

Pusat operasional untuk satu pesanan. Isinya ringkasan jadwal, alat, unit yang diambil, rincian tagihan, data penyewa, dan aksi sesuai status:

- Menunggu Persetujuan: Setujui atau Tolak untuk penyewa Bermasalah.
- Terkonfirmasi: panel serah terima untuk memilih kode unit yang benar-benar dibawa.
- Sedang Disewa: tombol Catat Pengembalian.
- Sudah dikembalikan dengan selisih positif: tombol Periksa Status Pembayaran.
- Selisih nol atau negatif: tombol Selesaikan Pesanan.

![Modal inspeksi pengembalian](docs/screenshots/09-admin-inspeksi.png)

Modal inspeksi menampilkan setiap unit yang dibawa. Staf memilih kondisi Baik, Perlu Perbaikan Ringan, Rusak, atau Hilang. Untuk kondisi selain Baik, staf memilih poin kerusakan dari acuan biaya dan wajib mengisi catatan maksimal 500 karakter. Sistem menghitung denda berdasarkan waktu kembali, grace period, dan tarif denda per item per hari. Unit yang tidak Baik langsung keluar dari stok siap sewa.

### 8. Inventaris (`/admin/inventaris`)

![Daftar inventaris](docs/screenshots/10-admin-inventaris.png)

Daftar semua SKU dengan kategori, harga sewa, dan jumlah unit per kondisi: Baik, Perlu Perbaikan Ringan, Rusak, dan Hilang. Hanya unit Baik yang dihitung sebagai stok siap sewa. Klik satu SKU untuk membuka detailnya.

### 9. Detail SKU (`/admin/inventaris/:skuId`)

![Detail SKU](docs/screenshots/11-admin-sku.png)

Halaman untuk mengatur satu SKU. Staf bisa mengubah harga sewa per hari, tarif denda harian, deposit normal, dan deposit bermasalah. Halaman ini juga menampilkan acuan biaya per kategori kerusakan serta daftar unit beserta kondisinya.

Tombol Tandai Baik mengembalikan unit yang sudah diperbaiki ke stok siap sewa. Unit berstatus Hilang tidak dapat ditandai Baik, dan unit yang masih tercatat pada pesanan Sedang Disewa juga tidak dapat diubah.

### 10. Daftar Penyewa (`/admin/penyewa`)

![Daftar penyewa](docs/screenshots/12-admin-penyewa.png)

Tabel penyewa dengan jumlah keterlambatan, jumlah kerusakan, dan status Normal atau Bermasalah. Penyewa otomatis dibuat saat nomor HP pertama kali dipakai memesan. Status Bermasalah muncul jika jumlah telat mencapai batas atau pernah ada unit Rusak atau Hilang saat inspeksi.

### 11. Tampilan Mobile

![Katalog di mobile](docs/screenshots/13-mobile-katalog.png)

Seluruh halaman responsif. Di layar kecil, katalog menjadi satu kolom, filter kategori bisa digeser horizontal, dialog pemesanan memenuhi layar, dan sidebar admin berubah menjadi menu yang bisa dibuka. Target sentuh memenuhi ukuran minimum, dan tidak ada overflow horizontal pada lebar 375px.

## Alur Bisnis

Status pesanan mengikuti urutan resmi:

1. Menunggu Persetujuan
2. Ditolak
3. Menunggu Pembayaran
4. Terkonfirmasi
5. Sedang Disewa
6. Selesai

Aturan penting:

- Hari sewa = tanggal kembali - tanggal ambil + 1.
- Unit terpakai pada rentang tanggal ambil sampai tanggal kembali ditambah `BUFFER_HARI`.
- Buffer mengurangi kuota pesanan berikutnya, tetapi tidak mengubah tanggal kembali yang dicatat.
- Pesanan Menunggu Persetujuan, Menunggu Pembayaran, Terkonfirmasi, dan Sedang Disewa mengunci kuota. Ditolak dan Selesai tidak mengunci kuota setelah tanggal kembali dan buffer lewat.
- DP = `ROUNDUP(total sewa x DP_PERSEN / 100)`.
- Deposit memakai `deposit_normal` atau `deposit_bermasalah` sesuai `status_penyewa_saat_pesan`.
- Denda: jika `terlambat_menit <= GRACE_JAM * 60`, denda 0. Jika lebih, `hari_denda = ceil(terlambat_menit / 1440)`, lalu dikali total tarif denda harian unit yang dikembalikan.
- Sisa sewa = total sewa - DP. Selisih akhir = sisa sewa + denda + biaya kerusakan - deposit.
- Jika selisih akhir positif, penyewa membayar pelunasan. Jika nol atau negatif, deposit mencukupi dan kelebihan dicatat sebagai kembalian.
- Pesanan menjadi Selesai setelah pelunasan lunas atau admin menyelesaikan pesanan saat selisih nol atau negatif.
- Inspeksi mengubah kondisi unit. Unit yang tidak Baik tidak masuk stok sampai ditandai Baik.
- Penyewa bertambah jumlah telat jika denda lebih dari 0, dan bertambah jumlah rusak jika ada unit Rusak atau Hilang.

## Pembayaran Midtrans

Alur pembayaran:

1. Frontend meminta token dengan `POST /api/pesanan/:kode/bayar` dan jenis `DP` atau `Pelunasan`.
2. Server membuat transaksi Snap memakai server key, menyimpan Snap Token di tabel `pembayaran`, lalu mengembalikan token.
3. Frontend memuat Snap.js dari `VITE_MIDTRANS_SNAP_JS_URL` dengan client key, lalu membuka jendela pembayaran.
4. Midtrans mengirim notifikasi ke `POST /api/midtrans/notifikasi`.
5. Server memverifikasi signature SHA512 dari `order_id + status_code + gross_amount + server key`, mencocokkan nominal, dan memproses idempoten.
6. Status `capture` atau `settlement` menjadi Berhasil. `deny`, `cancel`, `expire`, atau `failure` menjadi Gagal.
7. DP Berhasil membuat pesanan Terkonfirmasi. Pelunasan Berhasil membuat pesanan Selesai.

Frontend juga memanggil `POST /api/pesanan/:kode/sinkron-pembayaran` setelah jendela Snap ditutup. Endpoint ini menanyakan status ke Midtrans memakai server key, sehingga konfirmasi tetap berjalan di lokal tanpa webhook publik. Di produksi, daftarkan URL webhook `https://domain-anda/api/midtrans/notifikasi` di dashboard Midtrans.

Untuk pengujian lokal tanpa Snap, tersedia endpoint khusus development `POST /api/dev/pesanan/:id/bayar` dengan body `{ "jenis": "DP" }` atau `{ "jenis": "Pelunasan" }`. Endpoint ini tidak tersedia saat `NODE_ENV=production`.

## Keamanan dan SEO

- Validasi input dengan zod di seluruh endpoint.
- Query database memakai Drizzle ORM dengan parameter, bukan string SQL dari input.
- Kata sandi staf disimpan sebagai hash bcrypt.
- Sesi memakai JWT di cookie httpOnly, secure di production, sameSite strict, dan diperbarui saat ada aktivitas.
- Rate limit untuk login, cek riwayat, pembuatan pesanan, dan permintaan pembayaran.
- Signature Midtrans wajib valid. Server key tidak pernah dikirim ke frontend.
- Halaman `/pesanan/:kode`, `/riwayat`, dan seluruh `/admin/*` memakai `noindex, nofollow`.
- `/` memiliki title, meta description, dan Open Graph dasar.
- `robots.txt` dan `sitemap.xml` hanya memuat halaman publik utama.

## Skrip NPM

| Skrip | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan Vite. |
| `npm run dev:server` | Menjalankan API dengan tsx watch. |
| `npm run dev:all` | Menjalankan web dan API bersamaan. |
| `npm run build` | Typecheck dan build frontend ke `dist/`. |
| `npm run build:server` | Build backend TypeScript ke `server/dist/`. |
| `npm run build:all` | Build frontend dan backend. |
| `npm run start:server` | Menjalankan API hasil build. |
| `npm run db:generate` | Membuat migrasi Drizzle dari skema. |
| `npm run db:migrate` | Menerapkan migrasi ke MySQL. |
| `npm run db:seed` | Mengisi data admin, SKU, unit, acuan, penyewa, dan pesanan contoh. |
| `npm run typecheck` | Typecheck frontend. |
| `npm run typecheck:server` | Typecheck backend. |

## Pengujian yang Sudah Dilakukan

- Typecheck frontend dan backend lulus.
- Build frontend dan backend lulus.
- Uji API siklus pesanan: login, guard admin, overbooking 409 dengan daftar tanggal penuh, DP, Picked Up, pengembalian, denda, inspeksi, penguncian stok, Tandai Baik, persetujuan, pelunasan, dan CRUD acuan.
- Uji Midtrans: pembuatan Snap Token, pemakaian ulang token pending, signature salah ditolak, nominal tidak cocok ditolak, settlement DP menjadi Terkonfirmasi, settlement pelunasan menjadi Selesai, status deny menjadi Gagal, dan idempoten.
- Uji UI: katalog dari API, filter kategori, pemesanan, riwayat, login staf, Picked Up, inspeksi, penyelesaian, persetujuan, inventaris, detail SKU, dan penyewa.
- Semua 24 foto alat termuat tanpa 404.
- Tidak ada error console pada skenario uji.
- Tidak ada overflow horizontal pada lebar 375px di halaman publik dan admin utama.
- Server key Midtrans tidak ditemukan di bundle frontend.

## Aset dan Lisensi Foto

- Foto alat disimpan lokal di `public/images/gear/`. Sumbernya Unsplash, Wikimedia Commons public domain atau CC0, dan Openverse CC0 atau Public Domain Mark. Tidak ada atribusi wajib untuk foto yang dipakai.
- Foto Matras memakai close-up matras spons CC0.
- Logo asli ada di `src/img/logo/logo_track.jpg`. Turunannya dipakai di header, footer, halaman login, dan favicon:
  - `public/brand/logo-mark.png`
  - `public/brand/logo-full.jpg`
  - `public/favicon.png`
- Untuk mengganti foto dengan foto asli basecamp, letakkan file baru di `public/images/gear/`, lalu perbarui `fotoUrl` pada data SKU atau jalankan seed ulang setelah menyesuaikan peta foto di `server/src/db/seed.ts`.

## Catatan dan Batasan

- Lingkungan pengembangan memakai build MySQL Homebrew yang lebih baru dari 8. Skema tetap ditulis untuk MySQL 8.
- Contoh pesanan `TT-20261204-0001` menampilkan angka denda dan selisih sesuai data contoh. Mesin perhitungan untuk pengembalian baru tetap mengikuti rumus pada aturan bisnis.
- Inspeksi ulang setelah inspeksi pertama tersimpan ditolak dengan 409 untuk mencegah hitung ganda. Jika dibutuhkan, alur inspeksi ulang bisa ditambahkan dengan penyesuaian penghitung penyewa.
- Webhook Midtrans membutuhkan URL publik. Di lokal, konfirmasi pembayaran memakai endpoint sinkronisasi status ke Midtrans.
- Nama merchant yang tampil di jendela Snap berasal dari akun Midtrans, bukan dari aplikasi.
- Domain pada `sitemap.xml` dan `robots.txt` masih berupa contoh dan perlu diganti saat deploy.
- Foto katalog adalah foto stok dan public domain, bukan foto alat basecamp yang sebenarnya. Ganti dengan foto asli sebelum rilis resmi.
