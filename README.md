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

## Status QA (jujur)
| Area | Status |
|---|---|
| Semua fitur di perangkat nyata (iPhone/Android) | NOT TESTED |
| Background playback, lock screen, pindah track saat layar terkunci | NOT TESTED (bergantung browser/OS, tidak dijamin) |
| Offline shell, GitHub Pages subpath | NOT TESTED |

## Belum ada di versi ini
Pembacaan tag ID3/cover tertanam (judul/artis dari nama file `Artis - Judul.mp3`), edit metadata manual, reorder antrean/playlist, impor backup JSON, sort/filter lanjutan, kecepatan putar.
