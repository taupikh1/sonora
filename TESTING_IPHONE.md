# Uji manual di iPhone (yang tidak bisa dites otomatis)

Tes otomatis (`tests/e2e.mjs`) berjalan di Chromium, jadi **tidak** membuktikan hal-hal di bawah ini. Cobalah di iPhone, lalu isi kolom hasil (PASS / FAIL / catatan) dan kirim ke saya.

**Persiapan:** buka `https://taupikh1.github.io/sonora/` di Safari, tutup tab lalu buka lagi sekali (supaya service worker versi baru aktif). Impor minimal 3 lagu: 1 MP3, 1 FLAC, 1 M4A/AAC. Lalu buka **Pengaturan → Diagnostik perangkat** dan screenshot hasilnya (isi: versi cache, dukungan format, Media Session, Web Audio).

| # | Uji | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|---|
| 1 | Background playback | Putar lagu, tekan tombol Home / pindah ke aplikasi lain, tunggu 1 menit | Musik terus berjalan | |
| 2 | Layar terkunci | Putar lagu, kunci layar (tombol samping), tunggu 1 menit | Musik tetap berjalan, tidak berhenti sendiri | |
| 3 | Kontrol lock screen | Dengan layar terkunci, nyalakan layar | Judul, artis, artwork tampil; tombol play/pause, next, prev berfungsi; bar posisi bisa digeser | |
| 4 | Kontrol Control Center / AirPods | Buka Control Center, tekan play/pause/next | Merespons | |
| 5 | Pindah lagu saat terkunci | Biarkan lagu pertama habis saat layar terkunci | Lagu berikutnya jalan otomatis | |
| 6 | Kecepatan saat terkunci | Setel 1.5x, kunci layar | Tetap 1.5x, nada tidak berubah aneh | |
| 7 | Instal ke Home Screen | Share → Add to Home Screen, buka dari ikon | Tampil layar penuh; area atas/bawah tidak tertutup notch/home bar | |
| 8 | Data bertahan | Tutup aplikasi dari app switcher, buka lagi | Library, playlist, favorit tetap ada; lagu terakhir dipulihkan | |
| 9 | Offline | Mode pesawat, buka aplikasi dari Home Screen | Aplikasi dan library tampil, lagu bisa diputar | |
| 10 | FLAC | Putar FLAC 16/44.1 lalu 24/96 | Terputar; Audio Information menampilkan sample rate & bit depth yang benar | |
| 11 | AIFF / WAV | Putar satu file AIFF dan satu WAV | Terputar, atau muncul pesan jelas jika tidak didukung | |
| 12 | Gapless | Pengaturan → Gapless ON; putar 2 lagu album live/DJ-mix yang bersambung | Dengarkan sambungan: ada jeda atau tidak? Cek angka "Transisi lagu terakhir" di Diagnostik | |
| 13 | Backup & restore | Ekspor backup, hapus 1 playlist, Pulihkan dari backup | Playlist dan favorit kembali (file `.json` tersimpan di Files / Downloads) | |
| 14 | Antrean | Tambah 3 lagu ke antrean, urutkan dengan ▲▼, hapus satu | Urutan putar mengikuti daftar | |

**Catatan:** Web Audio (EQ, ReplayGain, Visualizer) bisa ditangguhkan iOS saat layar terkunci. Karena itu aplikasi mematikannya otomatis (lihat pesan toast). Itu perilaku yang disengaja, bukan bug.
