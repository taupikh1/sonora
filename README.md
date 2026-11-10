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

## Phase 19 (log diagnostik untuk bug sosmed, statechange tanpa state)
Diuji di Chromium headless: `tests/phase19.py` 14/14 PASS (audioSession TIRUAN dengan `state` undefined), `tests/phase18.py` 6/6, `tests/phase17.py` 16/16, `tests/qa_phase16.py` lolos. iPhone asli **NOT TESTED** (lihat `TESTING_IPHONE.md` butir 28-30).
- **Temuan dari log iPhone:** `audioSession -> undefined` = API ada tetapi `state` kosong, jadi deteksi interupsi "kuat" (menunggu `interrupted`) tidak pernah aktif. Sebelumnya `statechange` tanpa state hanya dicatat.
- **Perubahan:** `statechange` tanpa `state` kini dianggap SINYAL interupsi (awal atau akhir tidak dibedakan). Pause sistem dalam 3 dtk setelah sinyal dihitung interupsi; bila sinyal datang saat halaman tampil dan pause sudah terjadi, lanjut otomatis dicoba; bila saat tersembunyi, menunggu halaman tampil.
- **Log lebih lengkap (150 baris, bertahan walau halaman di-kill):** setiap `play`, `pause` (dengan `want` dan `ended`), `seek`, `lagu habis`, `halaman tersembunyi/tampil` (dengan `want`, `paused`, `intr`, posisi), dan `statechange`; semuanya memuat `hidden` dan posisi.
- **Tombol \"Salin log\"** di Diagnostik: menyalin versi, cache, audioSession, posisi tersimpan, dan seluruh log dengan milidetik. Tampilan Diagnostik menunjukkan 30 baris terakhir.
- **Belum:** jika iOS mematikan halaman (boot ulang beberapa detik setelah tersembunyi), pemutaran tidak bisa dilanjutkan dari dalam web; log hanya membuktikan hal itu. Tidak ada klaim bahwa bug sosmed sudah terselesaikan sebelum ada log iPhone.
- Cache `sonora-v20`, versi 1.11.

## Phase 18 (pemulihan posisi yang tidak bisa macet)
Diuji di Chromium headless: `tests/phase18.py` 6/6 PASS, `tests/phase17.py` 16/16, `tests/qa_phase16.py` lolos. Elemen audio iOS yang macet **disimulasikan** (metadata baru dimuat saat play, seek diabaikan, fragmen `#t=` diabaikan); iPhone asli **NOT TESTED** (lihat `TESTING_IPHONE.md` butir 22-27).
- **Bug dari laporan:** ditutup di detik 13, dibuka lagi lalu play: lagu mulai dari awal, angka detik tidak jalan, geser seek tidak berpengaruh sampai ganti lagu. Dugaan penyebab (dari kode, belum terbukti di iPhone): Phase 17 mencoba seek dua kali berturut-turut (`loadedmetadata` dan `canplay`) sehingga elemen iOS bisa macet; angka detik terkunci karena status pending hanya dibersihkan oleh event `seeked`.
- **Perbaikan:** (1) posisi awal diberikan lewat fragmen `#t=` pada URL lagu (tanpa seek); (2) bila belum tercapai, SATU kali seek langsung; (3) bila masih macet, elemen dimuat ulang di posisi itu lalu seek langsung sekali lagi; (4) bila tetap gagal, menyerah dengan pesan, dan angka detik kembali mengikuti audio asli (tidak lagi terkunci).
- **Seek biasa (slider, lirik, dll) ikut dijaga:** bila 2,5 dtk setelah seek elemen masih "seeking" atau posisinya jauh dari target, elemen dimuat ulang di posisi target. Seek normal tidak memicu muat ulang (diuji).
- Log audio mencatat setiap langkah pemulihan (Diagnostik > LOG AUDIO). Cache `sonora-v19`, versi 1.10.
- **Belum:** pemulihan ini bekerja pada halaman yang masih hidup; bila iOS mematikan halaman, batas lama tetap berlaku (lihat Phase 13/17). Daftar lagu belum divirtualisasi, `app.js` belum dipecah.

## Phase 17 (perbaikan bug posisi lagu dan lanjut otomatis, hasil review Phase 16)
Diuji di Chromium headless: `tests/phase17.py` 16/16 PASS (mensimulasikan iOS: metadata baru dimuat saat play, audioSession tiruan) dan `tests/qa_phase16.py` tetap lolos. iPhone asli **NOT TESTED** (lihat `TESTING_IPHONE.md` butir 22-25).
- **Bug: lagu mulai dari awal setelah web ditutup lalu dibuka lagi.** Penyebab yang direproduksi: bila metadata belum dimuat (perilaku iOS), membuka app lalu ke background tanpa menekan play menimpa posisi tersimpan dengan 0. Sekarang posisi yang menunggu seek (`pend`) tetap dipakai untuk simpan dan tampilan, seek dicoba lagi di `loadedmetadata` dan `canplay`, posisi disimpan ganda (localStorage sinkron tiap 2 dtk, saat pause, background, `pagehide`, `freeze`; IndexedDB tiap 5 dtk), dan angka detik tersimpan langsung tampil saat dibuka. Diagnostik menampilkan "Posisi tersimpan".
- **Bug: tidak lanjut sendiri setelah sosmed ditutup.** Penyebab dari kode: lanjut otomatis hanya jalan bila iOS melapor audioSession `interrupted` dalam 3 dtk. Kini pause oleh sistem saat halaman tersembunyi juga dianggap interupsi ("lemah") dan dilanjutkan saat halaman tampil lagi, maksimal 15 menit. Pause saat layar tampil (mis. earphone dicabut) dan pause manual tetap tidak dilanjutkan. **Batas web yang tidak bisa diatasi:** bila iOS sudah mematikan atau melepas SONORA dari Now Playing (Control Center menampilkan app lain), tombol play di sana tidak sampai ke SONORA.
- **Pembersihan:** timer tidur memeriksa jam dinding (tidak hanya `setTimeout`); mematikan Shuffle mengembalikan urutan asli; Shuffle dan Repeat bertahan setelah app dibuka lagi; hapus lagu yang sedang diputar kini lanjut ke lagu berikutnya (antrean dan lock screen konsisten); restore backup hanya menerima kunci metadata yang dikenal (title, artist, album, genre, year) dan membatasi panjang teks; gambar cover `loading=lazy`; file nyasar `q_np320.png` dihapus.
- **Belum:** daftar lagu belum divirtualisasi (pustaka ribuan lagu masih berat), `app.js` belum dipecah, `tests/e2e.mjs` dan `tests/phase13.mjs` belum disesuaikan dengan teks Phase 14.
- Cache `sonora-v18`, versi 1.9.

## Phase 16 (modularisasi tahap 1, QA, perbaikan bug)
iPhone asli **NOT TESTED**. QA otomatis: `tests/qa_phase16.py` (Chromium, 20 pemeriksaan, 20/20 PASS): boot kosong, 5 halaman, duplikat impor, album beda artis, XSS lewat metadata, next/prev cepat, lirik txt/hapus, backup, hapus lagu saat diputar, layout 320x568 dan 390x844 (gelap/terang) tanpa overflow, offline.
- **Bug ditemukan dan diperbaiki:** (1) blur latar Now Playing (Phase 14) melebarkan halaman 10 px sehingga bisa bergeser ke samping; blur kini di dalam kotak ber-clip. (2) Baris tombol kontrol Now Playing meluber 10 px di 390 px dan lebih di 320 px (bug lama); lebar tombol kini menyesuaikan layar.
- **Modul:** `js/lrc.js` (parser lirik), `js/lib.js` (hitungan/pengelompokan library), `js/eq-data.js` (preset EQ), semuanya tanpa DOM dan masuk cache service worker.
- Cache `sonora-v17`, versi 1.8. Belum dipecah: render/daftar, Now Playing, Pengaturan, UI EQ (saling terkait lewat state bersama; butuh refactor tahap 2 dengan modul state terpisah).

## Struktur file
`index.html` (kerangka), `css/main.css`, `js/app.js` (UI dan state), `js/audio-engine.js` (pemutaran, antrean, interupsi), `js/dsp.js` (Web Audio: EQ/ReplayGain), `js/metadata.js` + `js/tags.js` (baca tag), `js/storage.js` (IndexedDB), `js/utils.js`, `js/lrc.js`, `js/lib.js`, `js/eq-data.js`, `service-worker.js`, `tests/`.

## Phase 15 (lirik dan pintasan)
Diuji di Chromium headless; iPhone asli **NOT TESTED**.
- **Lirik:** tombol Lirik di Now Playing (dan Lirik di menu ⋯). Sumber: file `.lrc` berwaktu atau `.txt` yang diimpor per lagu (disimpan di library, ikut backup), atau lirik tersemat di tag (ID3 USLT untuk MP3, LYRICS/UNSYNCEDLYRICS untuk FLAC/OGG/Opus). Lirik berwaktu menyorot baris berjalan dan baris bisa diketuk untuk seek. **Belum:** lirik tersemat MP4/M4A (©lyr), SYLT, dan pencarian lirik online (sengaja tidak, demi privasi).
- **Pintasan Now Playing:** EQ dan Timer tidur langsung dari Now Playing.
- Library dibaca ulang tagnya satu kali setelah update (skema info v4) agar lirik tersemat terdeteksi.
- Cache `sonora-v15`, versi 1.6. Belum ada: Folders, fade in/out, pemecahan `app.js`.

## Phase 14 (tampilan padat info ala HiBy, perbaikan data, bahasa)
Diuji di Chromium headless (smoke test); sentuhan/swipe dan iPhone asli **NOT TESTED**.
- **Beranda padat info:** 8 angka ringkas (lagu, artis, album, playlist, durasi, ukuran, Hi-Res, lossless/lossy), hitungan per format, rak horizontal bergambar (Baru ditambahkan, Sering diputar, Terakhir diputar, Favorit). *Sering diputar* memakai penghitung putar baru (`plays`).
- **Albums/Artists:** grid cover (artis berbentuk lingkaran), diurut A-Z. Album dikelompokkan dari *artis album + nama album* (dua "Greatest Hits" beda artis tidak lagi menyatu). Halaman detail punya header cover dengan total durasi, ukuran, format, jumlah Hi-Res/lossless/lossy; lagu diurut menurut disc dan nomor track. Playlist juga memakai header yang sama.
- **Daftar lagu:** dua baris info (artis - album; durasi - kualitas - favorit), ringkasan jumlah/durasi/ukuran, dan huruf A-Z lengket saat urutan Judul/Artis.
- **Now Playing:** latar blur dari cover (gradien warna jika tanpa cover), kisi info 8 sel (format, sample, bit, bitrate, kanal, ukuran, gain, tahun; disembunyikan di layar pendek), seek bar custom. Swipe ke bawah pada artwork atau header menutupnya; swipe kiri/kanan pada artwork = berikutnya/sebelumnya.
- **Mini player:** progress bar tipis; swipe kiri/kanan = berikutnya/sebelumnya, swipe ke atas = buka Now Playing.
- **Playlist:** Impor m3u/m3u8 (dicocokkan lewat nama file; lagu yang tidak ada di pustaka dilewati).
- **Bahasa:** menu, tab, Pengaturan, dan sheet ⋯ kini berbahasa Indonesia. Istilah teknis audio (Sample rate, Bit depth, Codec, ReplayGain, Bit-Perfect) sengaja tetap.
- Belum ada: lirik, Folders, fade in/out, pemecahan `app.js` menjadi modul. Fade tidak mungkin di iOS tanpa Web Audio (lihat batasan di bawah).
- Cache `sonora-v14`, versi 1.5. `tests/` belum disesuaikan dengan teks baru.

## Phase 13 (interupsi, tombol play, detik lagu)
Status: **READY WITH KNOWN LIMITATIONS** - diuji di Chromium headless (e2e 43/43 + `tests/phase13.mjs` 17/17). Perilaku iPhone asli **NOT TESTED** (lihat `TESTING_IPHONE.md` butir 15-21).
- **Lanjut otomatis setelah interupsi** (aplikasi lain memakai audio, panggilan, dll). Aplikasi kini membedakan *pause oleh pengguna* (tombol, lock screen, sleep timer, akhir antrean) dari *pause oleh sistem*. Pause sistem dianggap interupsi bila Audio Session API (iOS 16.4+) berstatus `interrupted`, atau (tanpa API itu) halaman sedang tersembunyi. Lanjut dicoba saat audioSession selesai, saat halaman tampil lagi, `pageshow`, dan `focus`, dengan 4x percobaan ulang (0,5 / 1,2 / 2,5 / 5 dtk). Pause yang BUKAN interupsi (mis. earphone dicabut) sengaja tidak dilanjutkan. Batas: interupsi > 30 menit tidak dilanjutkan (`MAXGAP` di `audio-engine.js`). Bisa dimatikan: Pengaturan > Playback > "Lanjut otomatis setelah interupsi".
- **Tombol play** (di aplikasi dan Control Center/lock screen) kini tidak jadi *pause* saat status masih interupsi, dan kegagalan `play()` ditampilkan sebagai toast yang benar (sebelumnya pesan "file rusak" untuk penolakan izin).
- **Detik lagu nyangkut:** `seeking` hanya direset oleh event `change`; sentuhan slider yang dibatalkan membuat angka detik dan slider berhenti padahal lagu jalan. Sekarang direset juga oleh `pointercancel`/`touchcancel`/`blur`/timeout, ditambah penyegar cadangan 500 ms saat Now Playing terbuka.
- **Crossfade:** menekan Next/Prev di tengah crossfade membuat volume lagu baru macet di nilai antara (mis. 30%). Diperbaiki.
- **Restore sesi:** satu lagu yang sudah dihapus membatalkan pemulihan seluruh sesi terakhir. Sekarang id yang hilang dibuang saja.
- **Hapus library** saat lagu main: metadata lock screen/antrean kini ikut dibersihkan (`clearAll`).
- **Repeat:** mengganti mode Repeat membatalkan lagu berikutnya yang sudah disiapkan (sebelumnya, All -> Off di lagu terakhir bisa tetap loop ke lagu pertama pada mode Gapless).
- **Pergantian lagu otomatis** kini selalu memakai lagu berikutnya yang sudah disiapkan (blob URL), bukan membaca IndexedDB di saat lagu habis. Tujuannya agar iOS tidak sempat menangguhkan halaman saat layar terkunci. NOT TESTED di iPhone.
- **Lock screen iOS:** handler seek +/-10 dtk tidak dipasang di iOS supaya tombol sebelumnya/berikutnya yang tampil (dugaan, belum diverifikasi). Kecepatan yang diubah saat lagu berikutnya sudah disiapkan kini ikut diterapkan.
- **Diagnostik:** ditambah status audioSession dan "LOG AUDIO" (40 peristiwa terakhir, bertahan walau halaman di-kill iOS) untuk melacak interupsi di perangkat. Log tidak ikut backup.
- Cache service worker `sonora-v13`; versi aplikasi 1.4.
- **Batasan yang tidak bisa diatasi dari web:** jika iOS mematikan halaman di background, Control Center menampilkan "Tidak Diputar" dan tombol play di sana tidak bisa menghidupkan SONORA; lagu terakhir dipulihkan (dalam keadaan pause) saat aplikasi dibuka lagi.

## Phase 12 (stabilisasi)
- **Hotfix crash:** tombol Repeat (`#rp`) dan `cycleRepeat` hilang di Phase 11 sehingga seluruh aplikasi mati. Dikembalikan; error JS sekarang tampil sebagai toast.
- **Tes otomatis:** `tests/e2e.mjs` (43 pemeriksaan: boot, navigasi, impor, play/pause/next/prev/repeat/shuffle, kecepatan, favorit, search, playlist, antrean, gapless, backup/restore, diagnostik, tema, PWA offline, layout 320-390px). Jalankan: `npm i --no-save puppeteer && node tests/e2e.mjs`. Hasil terakhir: 43/43 PASS (Chromium headless).
- **Antrean penuh:** ketuk untuk memutar, urut ulang dengan ▲▼, hapus per lagu, kosongkan yang akan datang, atau hentikan dan kosongkan semua. Antrean yang diubah ikut membatalkan lagu berikutnya yang sudah disiapkan (sebelumnya, pada mode Gapless, judul di layar bisa tidak sama dengan audio yang diputar).
- **Backup & restore:** ekspor berisi daftar lagu, favorit, edit metadata, playlist, dan pengaturan. File audio **tidak** ikut (terlalu besar untuk JSON). Pulihkan: impor dulu file audionya, lalu pilih backup; lagu dicocokkan lewat nama file + ukuran. Artwork hasil edit tidak ikut backup.
- **Kecepatan putar:** ada di Pengaturan > Playback dan di Audio Information; bertahan antar lagu; dikunci 1x saat Bit-Perfect ON (karena mengubah kecepatan berarti memproses audio).
- **Diagnostik perangkat:** Pengaturan > Storage; menampilkan dukungan format, Media Session, Web Audio, service worker, cache, penyimpanan persisten.
- **Uji iPhone:** lihat `TESTING_IPHONE.md` (14 butir yang tidak bisa diuji otomatis; status di bawah tetap NOT TESTED sampai diisi).
- Cache service worker `sonora-v12`; ikon favicon ditambahkan; kontrol Now Playing muat di layar 320px.
- Dihapus: kode multi-select yang tidak punya tombol, handler impor/antrean ganda.

## Phase 11 (enhancements, sebagian disempurnakan di Phase 12)
- Playback speed (0.5x–2x) di Now Playing.
- Keyboard shortcuts (Space, ←→, N/P, S, R, F, Q).
- Import progress toast.
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
| Folders | Belum ada | |
| Queue penuh, reorder, impor backup | PASS (Chromium, Phase 12) | tests/e2e.mjs |

## Batasan
Browser tidak bisa memverifikasi output hardware, jadi status tertinggi adalah DIRECT PLAYBACK. iOS memproses audio lewat mixer sistem. Penyimpanan situs di Safari bisa dibersihkan iOS jika tidak dipakai lama; pasang ke Home Screen dan gunakan "Penyimpanan persisten".
