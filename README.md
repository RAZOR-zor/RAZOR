<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:020617,100:0F172A&height=200&section=header&text=RAZOR&fontSize=52&fontColor=F8FAFC&animation=fadeIn&desc=Kegiatan%20Mingguan%20Otomatis%20•%20SMK%20%20&descAlignY=62&descSize=14" />

<br/>

<a href="https://github.com/RAZOR-zor/RAZOR/releases"><img src="https://img.shields.io/github/v/release/RAZOR-zor/RAZOR?style=for-the-badge&label=Download&color=22C55E&logo=github" /></a>
<img src="https://img.shields.io/badge/Electron-31-47848F?style=for-the-badge&logo=electron&logoColor=white" />
<img src="https://img.shields.io/badge/Platform-Windows-0F172A?style=for-the-badge&logo=windows" />
<img src="https://img.shields.io/badge/License-Private-1A1E2F?style=for-the-badge" />

<br/><br/>

<a href="https://readme-typing-svg.demolab.com?font=Inter&weight=500&size=15&pause=1200&color=F8FAFC&center=true&vCenter=true&width=720&lines=Login+sekali%2C+jurnal+terisi+otomatis;Pembiasaan+harian+%26+mingguan+tanpa+copy-paste;Status+%2B+backup+enkripsi+aman"><img src="https://readme-typing-svg.demolab.com?font=Inter&weight=500&size=15&pause=1200&color=F8FAFC&center=true&vCenter=true&width=720&lines=Login+sekali%2C+jurnal+terisi+otomatis;Pembiasaan+harian+%26+mingguan+tanpa+copy-paste;Status+%2B+backup+enkripsi+aman" /></a>

<br/>

<img src="https://img.shields.io/github/languages/top/RAZOR-zor/RAZOR?style=flat-square&color=1E293B" />
<img src="https://img.shields.io/github/last-commit/RAZOR-zor/RAZOR?style=flat-square&color=1E293B" />
<img src="https://img.shields.io/badge/dark%20mode-OLED-020617?style=flat-square" />

</div>

<br/>

<div align="center" style="max-width:680px; margin:0 auto;">

**RAZOR** mengisi jurnal `KEJAR.ID` otomatis — dari login, tarik data mingguan, sampai simpan & export.
Dark OLED, Inter, 60fps, no lag.

</div>

<br/>

<div align="center">

| <img src="https://raw.githubusercontent.com/RAZOR-zor/RAZOR/main/.github/demo.gif" width="880" alt="demo" onerror="this.style.display='none'"/> |
|:--:|
| <sub>`F11` fullscreen → hover kiri `14px` → bar `56px` `#000` • `Ctrl+M` toggle • `Alt+S` Settings</sub> |

</div>

<br/>

## ✨ Cara Kerja

<p align="center">
  <img src="https://img.shields.io/badge/01-Login-020617?style=for-the-badge" /> → 
  <img src="https://img.shields.io/badge/02-Tarik%20Jurnal-1E293B?style=for-the-badge" /> → 
  <img src="https://img.shields.io/badge/03-Isi%20Otomatis-334155?style=for-the-badge" /> → 
  <img src="https://img.shields.io/badge/04-Simpan%20%26%20Export-22C55E?style=for-the-badge" />
</p>

<table>
<tr>
<td width="33%" valign="top">

**01 — Login Sekali**
- Simpan sesi aman di `userData`
- Auto-switch akun
- Validasi 4–12 digit PIN (opsional)

</td>
<td width="33%" valign="top">

**02 — Tarik Mingguan**
- Ambil data `Senin–Minggu` dari `KEJAR.ID`
- Deteksi `Pembiasaan Harian` & `Mingguan`
- Status `Hadir / Belum Diabsen`

</td>
<td width="33%" valign="top">

**03 — Isi & Simpan**
- Inject script langsung ke form
- `Tanda Tangan` 1-klik
- Export `.txt` + backup `catatan-backup-*.txt`

</td>
</tr>
</table>

<br/>

## 📦 Fitur Lengkap

| Kategori | Yang kamu dapat |
|---|---|
| **Jurnal Saya** | `M` — `Pembiasaan Harian` / `Mingguan` + `Tidak ada kegiatan non-rutin` → auto terisi, tinggal tanda tangan |
| **Jadwal Pelajaran** | `Hari ini (Senin)` + `Besok`, `Lengkapnya →` ke halaman penuh, `Lihat Pelajaran` per jam |
| **Akun Kejar** | Multi-akun `razor` / `Pengaturan` per akun, `+ Tambah akun` |
| **Catatan** | Editor `JetBrains Mono` + line numbers, `+ Tambah Format Akun`, `Export .txt`, `PIN 4-12` opsional (bisa dimatikan) |
| **Theme** | `Theme → Local → Warna` 24 pilihan + `Foto` galeri + `Upload` video/foto custom + `Hapus Background` |
| **Brand & Font** | `Brand`: teks `RAZOR` realtime, warna teks, tulisan & warna background Search (`GOOGLE`), logo `icon.png` <br> `Font`: `Tiny5` `Inter` `Montserrat` `Poppins` `Playfair Display` `Merriweather` `Lora` `Caveat` `Bebas Neue` + preview live |
| **Warna UI** | `Warna Jam` `#clock`, `Warna Chevron >` `#chevPath/#qlPath`, `Warna Tulisan Tengah` (search) |
| **Tabs Samping** | Bar vertikal `56px` `#000` icon-only `36px` `8px radius`, `hover` tooltip, `+` new tab bawah, `Ctrl+M`, ada di semua halaman via `content.js` |
| **Window** | `Splash` → `Login` → `Main`, `F11` fullscreen, `Alt+S` Settings, `Esc` tutup |

<br/>

## 🚀 Install & Update

```bash
# clone
git clone https://github.com/RAZOR-zor/RAZOR.git
cd RAZOR

# dev
npm install
npm start

# build installer
npm run dist
# → dist/RAZOR-1.x.x-Setup.exe + latest.yml

# rilis (auto-upload ke GitHub Releases)
node update/update.js
# input 1.1.0 → package.json → clean dist → npm run dist → POST api.github.com/repos/RAZOR-zor/RAZOR/releases
```

**User:** Download `RAZOR-Setup.exe` di [Releases](https://github.com/RAZOR-zor/RAZOR/releases) → install → auto-update via `electron-updater` baca `latest.yml`.

<br/>

## 🗂️ Struktur

```
D:\APK\                 ← Electron (kamu di sini)
  main.js               ← window, updater, catatan crypto
  index.html            ← dashboard + jurnal + jadwal
  catatan.html          ← editor + PIN
  preload*.js           ← bridge
  theme.js / vendor.js
  font/                 ← Tiny5
  update/               ← update.js + upload-release.ps1 + gh-token.txt
```

## 🛠️ Tech

`Electron 31` • `electron-builder 25` • `electron-updater 6` • `GSAP 3.12` • `JetBrains Mono` `Quicksand` `Inter` • `localStorage` `razorBrand/razorBg`

<br/>

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0F172A,100:020617&height=120&section=footer&text=Made%20with%20%E2%96%A0%20by%20RAZOR-zor&fontSize=14&fontColor=F8FAFC" />
</div>
