# RAZOR — Kegiatan Mingguan Otomatis

Aplikasi desktop untuk mengelola kegiatan mingguan siswa SMK Wikrama Bogor.

## Cara Kerja

1. **Login** — Masuk dengan akun yang terdaftar.
2. **Dashboard** — Menampilkan jurnal harian dan mingguan (`Pembiasaan Harian` / `Pembiasaan Mingguan`).
3. **Catatan** — Tambah, edit, dan export catatan kegiatan.
4. **Jadwal** — Menampilkan jadwal pelajaran hari ini dan besok.
5. **Update Otomatis** — Aplikasi cek `latest.yml` di GitHub Releases, download dan install otomatis.

## Install

```bash
git clone https://github.com/RAZOR-zor/RAZOR.git
cd RAZOR
npm install
npm start        # jalankan dev
npm run dist     # build installer → dist/RAZOR-1.x.x-Setup.exe
```

Atau download installer dari [Releases](https://github.com/RAZOR-zor/RAZOR/releases) → jalankan `RAZOR-Setup.exe`.

## Update

```bash
node update/update.js
# masukkan versi baru (contoh 1.1.0) → otomatis build dan upload ke GitHub Releases
```

## Tech

Electron 31 • electron-builder • electron-updater

