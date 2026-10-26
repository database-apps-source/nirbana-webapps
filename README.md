# NIRBANA COLLECTION — Multi-Category E-Commerce & POS Web App

Platform aplikasi web Full-Stack modern untuk **NIRBANA COLLECTION** (Fashion, Services, Digital Goods, FnB, Electronics) dengan arsitektur **Frontend Statis Terpisah (GitHub Pages)** dan **Google Apps Script (GAS) sebagai REST API Backend** murni bebas CORS, didukung **Google Sheets** sebagai database terpusat dan **Google Drive** sebagai media storage.

---

## 🌟 Fitur Utama

1. **Etalase Belanja Publik (Open Access)**:
   - Pelanggan dapat berbelanja tanpa perlu login/registrasi akun.
   - Filter kategori dinamis (*Fashion, Services, Digital Goods, FnB, Electronics*).
   - Keranjang belanja interaktif (*slide-over bag*).
   - Checkout fleksibel: Otomatis via **Payment Gateway** atau **Transfer Bank Manual** + upload bukti transfer.
   - Pelacakan pesanan mandiri (*Order Tracking*) cukup menggunakan nomor WhatsApp atau Email.

2. **Terminal Kasir POS (Modern Neo-Brutalist Soft Layout)**:
   - Desain tata letak terinspirasi dari POS tablet modern (kartu putih ber-radius tinggi di atas kanvas gradien *Lime & Lavender*).
   - Antrean pesanan (*Order Line*) horizontal dengan indikator status:
     - 🔵 *Ready to Serve / Ship* (Cyan)
     - 🟢 *In Progress* (Lime)
     - 🔴 *Canceled* (Coral Red)
     - ⚪ *Completed* (Neutral Slate)
   - Panel kanan *Order Details* interaktif: *Dine-In, Take Away, Delivery*, pemilihan meja/catatan, kuantitas item, kode voucher, dan tombol *Place Order*.

3. **Modul Struk & Printer Thermal (`gas-struk-resi-printer`)**:
   - Mendukung ukuran kertas **58 mm** (32 kolom) dan **80 mm** (48 kolom).
   - **3 Metode Cetak**:
     1. **Web Bluetooth ESC/POS**: Cetak langsung dari browser Chrome/Edge tanpa driver.
     2. **RawBT Android Intent**: Untuk printer Bluetooth SPP di HP Android.
     3. **Dialog Cetak Browser**: Untuk printer kasir desktop USB / LAN.
   - Template struk berbasis teks direktif (`[C]`, `[LR]`, `[B]`, `[BOX]`, `[QR]`) yang dapat disunting langsung oleh Owner.
   - Dilengkapi **QR Code Verifikasi Keaslian Struk ber-HMAC SHA-256**.

4. **Notifikasi Otomatis & CRM Kontak (`gas-notifikasi-wa-crm`)**:
   - **WhatsApp Gateway (Fonnte API)** & Email otomatis saat pesanan dibuat, pembayaran terverifikasi, atau pesanan dikirim.
   - **Antrean Non-Blocking**: Transaksi selesai instan tanpa menunggu proses kirim pesan; antrean diproses via trigger latar belakang.
   - **CRM Otomatis**: Menghitung *Customer Lifetime Value*, segmentasi *VIP Spender*, riwayat transaksi, dan modul broadcast *WhatsApp Blast* ber-batch.

5. **Keamanan & Performa Tinggi (`gas-rahasia-script-properties` & `gas-scale-turbo`)**:
   - **Nol Literal Rahasia**: Token Fonnte, salt sandi darurat, dan folder ID tersimpan aman di **Script Properties**.
   - **Sesi Stateless HMAC-SHA256**: Token aman 12 jam dengan kemampuan pencabutan instan (*revocation*).
   - **CacheX (Partisi > 50KB)**: Mengatasi batas 100KB cache GAS dan mencegah bottleneck limit kuota Sheets API.
   - **Deduplikasi Request In-Flight**: Frontend mencegah request ganda ke server.

6. **Alat Migrasi Database (`gas-migrasi-database`)**:
   - Fitur migrasi batch idempoten antar-spreadsheet tanpa menyentuh spreadsheet lama.
   - Mode simulasi *Dry-Run* sebelum melakukan impor data sungguhan.

---

## 📁 Struktur Berkas Proyek

```text
d:\Apps\1. Aplikasi Gravity\1. e-Toko\
├── index.html                  # Frontend Single Page Application (GitHub Pages root)
├── css/
│   └── style.css               # Desain UI/UX Neo-Brutalist Soft & styling struk thermal
├── js/
│   ├── config.js               # URL backend Google Apps Script & opsi konfigurasi
│   ├── api.js                  # Client API wrapper (Anti-CORS text/plain & cache deduplication)
│   ├── struk-engine.js         # Parser direktif teks struk 58mm/80mm & ESC/POS builder
│   ├── struk-printer.js        # Driver printer Web Bluetooth, RawBT, & Browser print
│   └── app.js                  # State management, POS kasir, etalase, checkout, & admin panel
├── backend/
│   ├── Config.gs               # Konfigurasi server, nama sheet, registry kejadian notifikasi
│   ├── Kode.gs                 # REST API router (doGet/doPost), auth HMAC, CacheX, auto-setup
│   ├── Notifikasi.gs           # Integrasi WhatsApp Fonnte, MailApp, & antrean non-blocking
│   ├── CRM.gs                  # Sinkronisasi CRM pelanggan, histori interaksi & WA blast
│   ├── Struk.gs                # Template struk server, kamus data & verifikasi QR
│   └── Migrasi.gs              # Utilitas migrasi spreadsheet idempoten
├── .gitignore                  # Berkas yang diabaikan Git
└── README.md                   # Dokumentasi instalasi & panduan deployment
```

---

## 🚀 Panduan Instalasi & Deployment

### Langkah 1: Setup Backend Google Apps Script (GAS)

1. Buka [Google Apps Script](https://script.google.com) dan buat proyek baru dengan nama **`NIRBANA COLLECTION BACKEND`**.
2. Buat 6 berkas script (`.gs`) di dalam editor GAS sesuai nama di folder `backend/`:
   - `Config.gs`
   - `Kode.gs`
   - `Notifikasi.gs`
   - `CRM.gs`
   - `Struk.gs`
   - `Migrasi.gs`
3. Salin seluruh isi kode dari berkas lokal di folder `backend/` ke masing-masing berkas di editor Google Apps Script.
4. **Jalankan Fungsi Inisialisasi**:
   - Pada dropdown fungsi di editor GAS, pilih fungsi **`setupAppEnvironment`**, lalu klik **Run (Jalankan)**.
   - Berikan izin otorisasi akses Google Workspace (Drive, Sheets, Gmail).
   - Periksa tab **Execution Log**:
     - Sistem otomatis membuat folder Google Drive `📁 NIRBANA COLLECTION` beserta subfolder `Foto Produk`, `Bukti Pembayaran`, dan `Invoices`.
     - Sistem membuat database Google Sheets `🗃️ Database — NIRBANA COLLECTION` lengkap dengan sample produk awal.
     - Sistem mencatat **Kredensial Akses Darurat (Root)**: Username `darurat` dan password acak aman.
     - Sistem otomatis memasang trigger waktu pemrosesan notifikasi tiap 1 menit.

### Langkah 2: Deploy Web App Google Apps Script

1. Di editor GAS, klik tombol **Deploy** (kanan atas) → **New deployment**.
2. Klik ikon gerigi (Select type) → pilih **Web app**.
3. Atur konfigurasi berikut:
   - **Description**: `Nirbana Production REST API`
   - **Execute as**: `Me (email-anda@gmail.com)`
   - **Who has access**: `Anyone` *(Wajib "Anyone" agar frontend di GitHub Pages dapat mengakses API tanpa login akun Google)*.
4. Klik **Deploy**.
5. Salin tautan **Web App URL** yang dihasilkan (format: `https://script.google.com/macros/s/AKfycb.../exec`).

### Langkah 3: Konfigurasi Frontend Lokal

1. Buka berkas `js/config.js` di proyek lokal Anda.
2. Tempelkan Web App URL dari Langkah 2 ke properti `GAS_URL`:
   ```javascript
   const CONFIG = {
     GAS_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
     APP_NAME: 'NIRBANA COLLECTION',
     ...
   };
   ```
3. Simpan berkas `js/config.js`.

---

### Langkah 4: Deploy Frontend ke GitHub Pages (Panduan Terminal)

Berdasarkan panduan `/github-pages-deploy-guide`, lakukan langkah deployment berikut melalui Terminal (PowerShell / Git Bash) di direktori proyek:

1. **Inisialisasi Git Lokal**:
   ```bash
   git init
   ```
2. **Tambahkan Seluruh Berkas**:
   ```bash
   git add .
   ```
3. **Buat Commit Perdana**:
   ```bash
   git commit -m "Initial release: Nirbana Collection E-Commerce & POS"
   ```
4. **Ubah Branch Utama ke `main`**:
   ```bash
   git branch -M main
   ```
5. **Hubungkan ke Repositori GitHub**:
   - Buat repositori publik baru di GitHub (misal: `nirbana-collection`).
   - Hubungkan remote origin:
   ```bash
   git remote add origin https://github.com/USERNAME/nirbana-collection.git
   ```
6. **Push ke GitHub**:
   ```bash
   git push -u origin main
   ```
   *(Bila diminta autentikasi password, gunakan **GitHub Personal Access Token (PAT)**).*
7. **Aktifkan GitHub Pages**:
   - Buka repositori GitHub Anda di browser → menu **Settings** → **Pages**.
   - Pada bagian **Build and deployment** → Source: `Deploy from a branch`, Branch: `main`, Folder: `/ (root)`.
   - Klik **Save** dan centang **Enforce HTTPS**.
   - Dalam 1-2 menit, situs Anda sudah live di: `https://USERNAME.github.io/nirbana-collection/`

---

## 🔑 Akun Bawaan & Akses Admin

Setelah fungsi `setupAppEnvironment()` dijalankan, akun bawaan yang tersedia adalah:

- **Owner / Superadmin**:
  - Email: `owner@nirbana.id`
  - Password: `Nirbana2026!`
  - Hak Akses: Penuh (`*`)
- **Staff Kasir**:
  - Email: `kasir@nirbana.id`
  - Password: `Kasir2026!`
  - Hak Akses: `POS, Orders`
- **Akses Darurat**:
  - Username: `darurat`
  - Password: *(Dihasilkan otomatis secara kriptografis dan tercatat di Log Eksekusi saat setup awal)*.

---

## 📄 Lisensi
Hak Cipta © 2026 **NIRBANA COLLECTION**. Dikembangkan dengan arsitektur Google Apps Script Modern + GitHub Pages.
