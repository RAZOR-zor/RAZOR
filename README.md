# 🍪 RAZOR — Kegiatan Mingguan Otomatis

<p align="center">
  <img src="icon.png" width="96" height="96" alt="RAZOR"/>
  <br/>
  <b>Newtab chevron • QuickLook Search • Kartu custom • Tabs samping • Brand & Font</b>
</p>

<p align="center">
  <a href="https://github.com/RAZOR-zor/RAZOR/releases"><img src="https://img.shields.io/github/v/release/RAZOR-zor/RAZOR?style=flat-square&label=version" alt="release"/></a>
  <img src="https://img.shields.io/badge/electron-31-47848F?style=flat-square" alt="electron"/>
  <img src="https://img.shields.io/badge/platform-Windows-0078D6?style=flat-square" alt="windows"/>
  <img src="https://img.shields.io/badge/license-private-lightgrey?style=flat-square" alt="license"/>
</p>

---

## ✨ Fitur

| Kategori | Detail |
|---|---|
| **Newtab** | Chevron `>` morph + `RAZOR` Tiny5, kartu 4×2 fluid, `Alt+S` Settings |
| **Search** | Ketik huruf → QuickLook kiri + 4-layer suggest (Google → DuckDuckGo → history → builtin), `Enter` cari, `Backspace` hapus, `Esc` tutup |
| **Kartu** | `Setting → Edit` → `+ Tambah` (preset / upload / Iconify `api.iconify.design`), `Background` + `Warna Icon` (solid), `Hapus` multi-select, **drag `Urutkan`** |
| **Brand** | `Setting → Brand` → ganti **teks** (realtime), **warna teks**, **tulisan & warna background Search**, **logo** (`icon.png` → `Ganti Foto` pas `Simpan`) |
| **Font** | `Setting → Font` → 9 pilihan `Tiny5` `Inter` `Montserrat` `Poppins` `Playfair Display` `Merriweather` `Lora` `Caveat` `Bebas Neue` + preview live |
| **Theme** | `Setting → Theme` → warna / upload foto/video + `Hapus Background` |
| **Tabs Samping** | Hover tepi kiri (14px) atau `Ctrl+M` → bar vertikal 56px hitam `#000` icon-only (`#202124` → `#000`), `+` new tab, klik pindah, `×` tutup — ada di **semua halaman** (`content.js` + `background.js` `tabs` perm, `F11` fullscreen tetap bisa pindah tab) |
| **Extension** | `D:\app\` → `manifest v3` `chrome_url_overrides.newtab`, `lib/gsap.min.js` lokal (bukan CDN), `chrome.tabs` di semua halaman via content script |

## 📦 Install (Electron)

```bash
npm install
npm start          # dev
npm run dist       # build → dist/RAZOR-1.0.x-Setup.exe + latest.yml
node update/update.js  # bump version → build → upload GitHub Release
```

## 🧩 Install (Extension Newtab)

**Dev:**
`brave://extensions` → Developer ON → Load unpacked → pilih `D:\app`

**Zip share:**
`D:\RAZOR-1.0.0.zip` (sudah ada, 617KB) → kirim → Load unpacked

**Store (berbayar $5) / Edge Add-ons (gratis):** upload zip yang sama

## 🔄 Update & Release

Repo publish sudah pindah ke **`RAZOR-zor/RAZOR`** (`package.json:45`, `update/upload-release.ps1:4`):

```bash
# token sekali simpan di D:\APK\update\gh-token.txt
node update/update.js
# input 1.1.0 → auto: package.json → clean dist → npm run dist → upload RAZOR-1.1.0-Setup.exe + latest.yml → https://github.com/RAZOR-zor/RAZOR/releases
```

`electron-updater` ngambil `latest.yml` dari release itu buat auto-update.

## 📁 Struktur

```
D:\APK\          ← Electron (main.js, index.html, update/, font/, icon.png)
D:\app\          ← Extension newtab (index.html, app.js, style.css, manifest.json, content.js/css, background.js, lib/gsap.min.js)
```

## 🔧 Tech

Electron 31 • electron-builder 25 • GSAP 3.12 • Iconify `api.iconify.design` • Simple Icons CDN fallback • `localStorage` `razorCards` / `razorBg` / `razorBrand`

---

<p align="center">Made with 🖤 by RAZOR-zor</p>
