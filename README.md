# Pengisi Template CV

Sistem web untuk mengisi template CV Excel (.xlsx) berisi placeholder `{nama}` dengan data peserta, menghasilkan
.xlsx per peserta (ZIP bila banyak) dan PDF bila diminta. Konteks: CV magang Jepang (実習生経歴書), label dua bahasa.
Warna, merge, lebar kolom, dropdown, komentar, dan susunan template tidak diubah; hanya isi sel.

Stack: Laravel 11 (PHP 8.3) · PhpSpreadsheet · Redis queue · MySQL 8 · LibreOffice headless · React + TypeScript + Vite + Tailwind.

## Menjalankan (Docker)

```bash
make init      # salin .env, isi APP_KEY, DB_PASSWORD, ADMIN_PASSWORD acak
make up        # build dan jalankan: app, nginx(frontend+proxy), queue, scheduler, redis, db
make seed      # buat pengguna admin dari ADMIN_EMAIL / ADMIN_PASSWORD di .env
```
Buka http://localhost:8080 dan masuk dengan akun admin. Migrasi berjalan otomatis saat container `app` start;
`make migrate` untuk menjalankan ulang. `make sample` membuat `storage/app/samples/template_cv_placeholder.xlsx`
(juga bisa diunduh dari halaman Template). `make test` menjalankan tes backend dan frontend.

Build pertama mengunduh Laravel 11 lewat Composer lalu menimpanya dengan folder `backend/` (overlay), jadi perlu internet.

Pengembangan frontend tanpa server: `cd frontend && npm install && VITE_USE_MOCK=true npm run dev`.

## Alur
1. **Template**: upload .xlsx, sistem mendeteksi placeholder (dikelompokkan Biasa/Foto/Berulang/Dropdown beserta sel asal).
2. **Data peserta**: upload Excel/CSV, form manual (baris dinamis + crop foto 3:4), atau impor PDF CV lama (AI).
3. **Pencocokan**: placeholder ↔ kolom (auto-match), validasi dengan edit di tempat, opsi pemrosesan, saran AI (Terima/Edit/Tolak).
4. **Hasil**: progres, peringatan per peserta, unduh .xlsx/.pdf dan ZIP.

## Placeholder
Sintaks `{huruf_kecil_angka_underscore}`, regex `/\{([a-z0-9_]+)\}/`. Satu sel boleh berisi teks tetap + placeholder
(`年{tahun_lahir} 月{bulan_lahir} 日{tgl_lahir}`). Rich text digabung dari semua run sebelum pencarian.
Katalog baku ada di `backend/config/cv_fields.php` (nama, label, tipe, format, bantuan AI). Aturan khusus:

- **Foto** `{foto}`: sel dikosongkan, gambar (rasio 3:4, JPEG 85, maks 800×1067) dipasang di tengah area merge.
- **Berulang** `{grup_N_field}`: pendidikan 1–4, kerja 1–4, keluarga 1–5.
- **Dropdown**: nilai harus persis salah satu pilihan data validation template (dibaca dari template, bukan dari kode).
  Input bebas dipetakan lewat `backend/config/cv_synonyms.php`; tidak cocok → sel kosong + peringatan + usulan terdekat.
- **Terhitung**: `{usia}` (terhadap hari ini, Asia/Jakarta; selisih dengan data diberi peringatan) dan `{tanggal_lahir_jp}` (`年1993 月04 日20`).
- Tanpa data: sel dikosongkan (tidak pernah menulis `{nama}` atau `null`), dilaporkan sebagai peringatan.

### Menambah placeholder baru
1. Tambahkan `$add('nama_baru', 'Label', 'text')` di `config/cv_fields.php` (isi `format`/`ai` bila perlu).
2. Dropdown: tambahkan sinonim di `config/cv_synonyms.php` (kunci = nama field tanpa nomor).
3. Format khusus: tambahkan `case` di `app/Services/ValueFormatter.php`; cerminkan di `frontend/src/lib/validator.ts` bila perlu.
4. Bagian form manual: `frontend/src/lib/catalog.ts`.

## Langkah AI (opsional, multi-penyedia)
AI memakai satu lapisan abstraksi (`app/Services/Ai/`) dengan tiga penyedia yang bisa dipilih **saat aplikasi berjalan**:
Claude (Anthropic), GPT (OpenAI), dan Gemini (Google).

Dua cara mengaktifkan:
1. **Environment** ( Recommended untuk server): isi `AI_PROVIDER=claude|openai|gemini` plus kunci providers di `.env`
   (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY`, opsional `*_MODEL` dan `*_BASE_URL`), lalu `docker compose up -d`.
2. **Antarmuka aplikasi**: tombol “AI” di app bar (atau “Kunci & model” di tab Impor PDF) → pilih penyedia, model, dan tempel
   kunci API. Kunci disimpan **terenkripsi** di tabel `ai_settings` (kolom `api_keys`, cast `encrypted:array`) dan tidak pernah
   dikirim ke browser; `GET /api/ai/status` hanya membocorkan `hasKey` per penyedia.

`PUT /api/ai/settings` mengubah `{provider, model, enabled, apiKey}`; pilihan penyedia/model di-cuplik ke `ai_runs.input`
saat job dibuat, sehingga pekerjaan yang sedang berjalan tidak berubah di tengah jalan. Bila penyedia aktif belum punya kunci,
`/api/ai/suggest` dan `/api/imports/pdf` membalas 503 beserta alasannya.

| Penyedia | Endpoint | Keluaran terstruktur | PDF native |
|---|---|---|---|
| Claude | `POST /v1/messages` + `tool_choice` | tool use `submit_result` | ya (blok `document`) |
| GPT | `POST /v1/chat/completions` | `response_format: json_schema` | tidak → teks diekstrak lokal (`pdftotext`) |
| Gemini | `POST /v1beta/models/{model}:generateContent` | `responseSchema` + `application/json` | ya (`inline_data`) |

Panggilan lewat queue job dengan timeout (default 90 detik), retry terbatas, keluaran dipaksa terstruktur lalu divalidasi
(katakana dicek karakter, kunci asing dibuang), dan pencatatan token tanpa isi data pribadi.
Nama model ditulis bebas (mis. “Gemini 3.1 Flash-Lite”); untuk Gemini nama tampilan otomatis dinormalkan menjadi id API
(`gemini-3.1-flash-lite`) lalu disimpan kembali. Galat penyedia (mis. model tidak dikenal) ditampilkan apa adanya di antarmuka,
tanpa membocorkan kunci API.

Tugas: katakana (nama, tempat lahir, nama keluarga), terjemahan Jepang (7 bidang informasi personal, tanpa menambah fakta;
sumber kosong → kalimat netral `特にありません。` + peringatan, tanpa memanggil AI), padanan Jepang (pekerjaan/jurusan/pekerjaan keluarga),
impor PDF (dokumen dikirim ke penyedia; foto diekstrak dengan `pdfimages`). Semua hasil berstatus “Disarankan AI”,
bisa diterima/diedit/ditolak sebelum pembuatan file; versi asli dan versi AI disimpan (terenkripsi) di tabel `ai_runs`.

## Keamanan dan privasi
- Berkas di disk privat dengan nama acak; unduhan hanya lewat signed URL 15 menit dan pemilik job dicocokkan.
- Data peserta dan hasil AI terenkripsi (`encrypted:array`). Log hanya berisi id/status, bukan isi data.
- Validasi upload: ekstensi + MIME + magic bytes; xlsx ≤10 MB, foto JPG/PNG ≤5 MB, PDF ≤15 MB; ditolak: makro, link eksternal,
  objek tertanam, formula berbahaya. Template dibaca tanpa menghitung formula. Nilai yang diawali `= + - @` selalu disimpan sebagai teks.
- Rate limiting per rute, header keamanan standar, CORS hanya untuk `FRONTEND_URL`, tanpa registrasi publik.
- **Retensi**: peserta, foto, dataset, hasil, dan data AI dihapus otomatis setelah `FILE_RETENTION_HOURS` (default 24) oleh
  scheduler `cv:purge` tiap jam. Tombol “Hapus data sesi” (`DELETE /api/session`) dan `DELETE /api/participants/{id}` menghapus manual.
  Template tidak ikut dihapus. Data peserta di browser hanya di `sessionStorage`, bukan `localStorage`.

## Batasan PhpSpreadsheet yang ditemukan
Diuji dengan PhpSpreadsheet 1.29 pada template contoh (ringkasan hasil uji):
- Dropdown (data validation), komentar sel, merge, dan lebar kolom **tetap ada** setelah render.
- Gambar/shape lain yang sudah ada di template, conditional formatting tertentu, dan data validation berbasis *named range*
  berisiko hilang atau tidak terbaca (named range dilaporkan sebagai “tanpa daftar pilihan”). Uji template asli Anda;
  bila ada yang hilang, solusinya injeksi langsung ke XML sheet (belum diimplementasikan).
- Penentuan area foto memakai perkiraan piksel dari lebar kolom/tinggi baris Excel; hasil bisa selisih beberapa piksel antar versi Excel/LibreOffice.
- Peringatan “teks meluber” memakai perkiraan lebar kolom, bukan pengukuran font.

## Asumsi dan keputusan
- Overlay Laravel: proyek dibuat saat build Docker (`composer create-project laravel/laravel:^11`), lalu `backend/` menimpanya.
- `/api/imports/pdf` dan `/api/ai/suggest` mengembalikan `{jobId}` (202); hasil diambil dari `GET /api/ai/jobs/{id}` (polling), karena panggilan AI wajib lewat queue.
- Tautan unduhan (`/api/files/...`) memakai signed URL tanpa header Bearer (diklik langsung dari browser); id pemilik ikut tertanda tangan.
- Service `nginx` menyajikan build statis frontend sekaligus meneruskan `/api` ke php-fpm (tidak ada container `frontend` terpisah saat runtime).
- Format uang `" ¥2,500,000"` (pemisah ribuan koma); `なし` hanya untuk gaji keluarga tanpa penghasilan.
- Hyperlink eksternal apa pun di template ditolak (kebijakan ketat).
- Batas 500 peserta per upload data. Sheet pertama diganti nama peserta; metadata dokumen dikosongkan.
- Redis tanpa persistensi (hanya antrean/cache); pekerjaan yang sedang antre hilang bila Redis restart.
- Dataset yang diunggah menambah (bukan mengganti) daftar peserta pada sesi.

## Status pengujian
Dijalankan dan lulus: frontend `tsc --noEmit` (strict), 22 tes Vitest termasuk alur end-to-end mode MOCK, `vite build`;
backend: renderer asli (PhpSpreadsheet) pada template contoh dengan 3 peserta contoh (nilai sel, dropdown, komentar, merge, foto dalam area merge),
parser, formatter, pencocokan dropdown, dan konversi PDF LibreOffice (tepat 1 halaman A4, kanji/kana tampil).
**Belum dijalankan**: tes Feature Laravel (signed URL, purge, enkripsi, AI dengan `Http::fake`) dan build Docker serta panggilan nyata ke Claude API;
jalankan `make test` setelah `make up`. Perhatikan: tes `AiTest` memakai `queue.default=sync`.
