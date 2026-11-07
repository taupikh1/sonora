# SONORA — Your Personal Music Space
Pemutar musik lokal (HTML + vanilla JS, IndexedDB, PWA). Tanpa backend, tanpa akun, tanpa telemetri.

## Deploy ke GitHub Pages
1. Buat repository baru di GitHub (mis. `sonora`).
2. Unggah **isi** folder ini (index.html di root repo).
3. Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)` → Save.
4. Buka `https://USERNAME.github.io/sonora/` (semua path relatif, aman di subpath).

## Pemakaian
- **iPhone**: buka di Safari, ketuk ＋ lalu pilih file musik (Files). Opsional: Share → Add to Home Screen. Uji di Safari biasa dulu sebelum mode Home Screen.
- **Android**: buka di Chrome, ketuk ＋. Menu ⋮ → Install app (opsional).
- Jika penyimpanan penuh: Pengaturan → hapus lagu/library, atau minta penyimpanan persisten.

## Format
MP3, AAC, M4A, WAV, FLAC, OGG, OPUS, AIFF dicek dengan `canPlayType` saat import; file yang tidak didukung dilaporkan dengan namanya dan tidak dikonversi.

## Phase 8 (UI/UX) - ringkas
Bottom nav (Home/Library/Search/Playlists/Settings), mini player di atas nav, Now Playing baru (artwork persegi, badge kualitas), tema Dark/Light/AMOLED/System + 5 aksen + warna kustom (localStorage), halaman Settings 6 kategori yang semuanya berfungsi, dialog konfirmasi/input kustom, skeleton, empty state, toast. File berubah: index.html, css/main.css, js/app.js, service-worker.js (cache v5).

## Release Gate (Phase 9) - diuji di Chromium headless 390x844, bukan perangkat nyata
| Kategori | Status | Bukti |
|---|---|---|
| Core Playback (MP3, AAC, FLAC x3, WAV, OGG, OPUS; play/pause/next/prev/seek/shuffle/repeat) | PASS (Chromium) | E2E, waktu putar maju di semua format |
| Music Library (import banyak file, duplikat, search, sort, favorit, playlist, Albums/Artists, hapus) | PASS | E2E |
| Metadata (codec, sample rate, bit depth, channel, durasi, ukuran, tag) | PASS | dibanding ffprobe, 10 file |
| Audio Information | PASS | bitrate AAC/FLAC kini tanpa cover/tag |
| Bit-Perfect Status Accuracy | PASS | tidak pernah menampilkan VERIFIED; AudioContext=0 saat BP ON |
| UI/UX, Theme System (4 tema x 5 aksen + kustom, persist) | PASS | E2E + kontras >= 4.5:1 |
| PWA (manifest, SW, offline, update, cache versioning) | PASS | server dimatikan, shell+library tetap tampil |
| IndexedDB Persistence | PASS | reload, 170 lagu |
| Security (metadata HTML/JS tidak dieksekusi) | PASS | file uji dengan payload di tag |
| Performance | PASS | 150 file diimpor 1,8 dtk; daftar tampil 433 ms; heap 10 MB |
| Background Playback | NOT TESTED | butuh iPhone/Android nyata |
| Lock Screen Controls | NOT TESTED | Media Session metadata/state terverifikasi di kode saja |
| Instal PWA (Add to Home Screen), safe area fisik | NOT TESTED | |
| Gapless, Crossfade, EQ, ReplayGain (kualitas audio) | NOT TESTED | EQ hanya diuji jalur Web Audio terbentuk |
| AIFF, FLAC di Safari | NOT TESTED | Chromium tidak memutar AIFF (ditolak dengan pesan jelas) |
| Folders, Queue penuh, reorder, impor backup | Belum ada | |

## Batasan
Browser tidak bisa memverifikasi output hardware, jadi status tertinggi adalah DIRECT PLAYBACK. iOS memproses audio lewat mixer sistem. Penyimpanan situs di Safari bisa dibersihkan iOS jika tidak dipakai lama; pasang ke Home Screen dan gunakan "Penyimpanan persisten".
