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

## Phase 11 (enhancements)
- Playback speed (0.5x–2x) di Now Playing.
- Antrean lebih baik: lihat, lompat, hapus item, kosongkan.
- Keyboard shortcuts (Space, ←→, N/P, S, R, F, Q).
- Import progress toast.
- Mode multi-select dasar (aktifkan via kode / tombol nanti).
- Catatan: backup hanya metadata (file audio tetap di IndexedDB perangkat).
- **Audio Information** di Now Playing kini satu chip yang bisa diketuk (tidak lagi menimpa badge); layout diuji di 390x844, 390x664, 360x640, 320x568 tanpa tumpang tindih. Ikon kontrol memakai SVG (bukan emoji).
- **Equalizer 10-band** (31 Hz - 16 kHz, +/-12 dB): 23 preset, slider sentuh/keyboard, pre-amp, profil custom (simpan/hapus). Preset menurunkan pre-amp otomatis agar tidak clipping.
- **ReplayGain** Track/Album dari tag (FLAC/Vorbis comment, ID3 TXXX, MP4). Lagu tanpa tag tidak diubah. Tag tampil di Audio Information.
- **Gapless** (best-effort): mode 2 elemen (mulai ~60 ms sebelum akhir) atau muat-cepat (iOS / Web Audio aktif). Jeda terukur ditampilkan di Settings dan Audio Information; ini diukur dari event browser, BUKAN verifikasi akustik.
- **Metadata Editor**: judul, artis, album, genre, tahun, artwork; opsi terapkan ke seluruh album; "Tag asli" mengembalikan. Disimpan di library (IndexedDB) saja, file audio asli tidak diubah (diverifikasi dengan hash).
- **Visualizer** Spectrum/Waveform (ketuk untuk ganti). Hanya saat Web Audio aktif dan Bit-Perfect OFF; berhenti saat pause/layar tersembunyi, 30 fps.
- EQ, ReplayGain, dan Visualizer otomatis nonaktif saat Bit-Perfect ON (diuji: Web Audio tidak dibuat sama sekali).

## Batasan fitur lanjutan
EQ/ReplayGain/Visualizer membutuhkan Web Audio; di iOS Safari Web Audio bisa ditangguhkan saat layar terkunci, sehingga fitur dimatikan otomatis demi Background Playback. Gapless sample-accurate tidak mungkin dengan elemen audio browser tanpa memuat seluruh lagu ke RAM. Editor metadata tidak menulis balik ke file (browser tidak bisa menulis file asli); ekspor backup JSON menyertakan hasil edit.

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
