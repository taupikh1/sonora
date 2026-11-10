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
| 15 | Interupsi: aplikasi lain | Putar lagu di SONORA (dari Home Screen). Buka Instagram/TikTok, putar video yang bersuara, lalu keluar dari aplikasi itu (kembali ke SONORA) | Lagu SONORA lanjut sendiri dalam beberapa detik | |
| 16 | Interupsi: tidak kembali ke SONORA | Sama seperti 15, tapi setelah sosmed ditutup tetap di Home Screen (jangan buka SONORA), tunggu 30 detik | Lagu lanjut sendiri (best effort; jika tidak, catat) | |
| 17 | Interupsi: panggilan / alarm / Siri | Putar lagu, minta Siri atau telepon masuk lalu selesai | Lagu lanjut sendiri setelah selesai | |
| 18 | Pause manual tidak lanjut sendiri | Pause dengan tombol, buka aplikasi lain, kembali. Ulangi dengan mencabut/melepas AirPods | Tetap pause | |
| 19 | Play dari Control Center setelah interupsi | Setelah interupsi (butir 15) bila lagu tidak lanjut sendiri: buka Control Center lalu tekan play | Lagu jalan. Jika Control Center menampilkan "Tidak Diputar" dan play tidak bereaksi: buka SONORA, Pengaturan, Diagnostik, screenshot bagian **LOG AUDIO** dan kirim | |
| 20 | Detik lagu | Buka Now Playing, sentuh slider lalu geser jari keluar layar / tarik pusat notifikasi saat menyentuh. Ulangi beberapa kali | Angka detik dan slider tetap berjalan sesuai lagu | |
| 21 | Tombol lock screen | Kunci layar saat lagu main, nyalakan layar | Ada tombol sebelumnya/berikutnya (bukan +/-10 dtk) | |
| 22 | Posisi setelah ditutup | Putar lagu sampai menit 2, kunci layar, tunggu, lalu tutup tab dari app switcher dan buka lagi | Angka detik langsung menunjukkan ±menit 2; tekan play, lanjut dari sana | |
| 23 | Posisi saat dibuka lalu ditinggal | Buka SONORA (lagu dipulihkan, pause), langsung pindah ke app lain tanpa play, buka lagi | Posisi tetap sama, tidak jadi 0:00 | |
| 24 | Sosmed lalu kembali ke SONORA | Putar lagu, buka sosmed dan putar video, tutup sosmed, buka SONORA | Lagu lanjut sendiri dalam beberapa detik. Bila tidak: Diagnostik, screenshot LOG AUDIO | |
| 25 | Pause oleh earphone | Putar lagu, lepas AirPods saat layar terkunci, nyalakan layar | Tetap pause (pause saat layar tampil tidak dilanjutkan). Catat jika malah lanjut lewat speaker | |
| 26 | Seek setelah dipulihkan | Ulangi butir 22, lalu setelah lagu jalan geser slider ke menit 1 dan menit 2 | Lagu langsung pindah ke posisi itu, angka detik jalan | |
| 27 | Pemulihan macet | Bila lagu tetap mulai dari awal atau seek tidak bereaksi: tunggu 10 detik, lalu Diagnostik, screenshot LOG AUDIO dan baris Posisi tersimpan | Lagu akhirnya sampai di posisi tersimpan, atau muncul pesan dan angka detik tetap jalan | |

**Catatan:** Web Audio (EQ, ReplayGain, Visualizer) bisa ditangguhkan iOS saat layar terkunci. Karena itu aplikasi mematikannya otomatis (lihat pesan toast). Itu perilaku yang disengaja, bukan bug.
