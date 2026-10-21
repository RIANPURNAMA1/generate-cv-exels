<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use ZipArchive;

/** Validasi upload: ekstensi + MIME + magic bytes + isi xlsx berbahaya. */
class UploadGuard
{
    public static function xlsx(UploadedFile $file): void
    {
        self::fail($file->getClientOriginalExtension() !== '' && strtolower($file->getClientOriginalExtension()) === 'xlsx', 'Berkas harus berekstensi .xlsx (.xlsm ditolak).');
        self::fail($file->getSize() <= 10 * 1024 * 1024, 'Ukuran xlsx maksimal 10 MB.');
        $path = $file->getRealPath();
        self::fail(self::magic($path) === "PK\x03\x04", 'Isi berkas bukan xlsx yang valid.');

        $zip = new ZipArchive();
        self::fail($zip->open($path) === true, 'Berkas xlsx rusak.');
        $names = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $names[] = $zip->getNameIndex($i);
        }
        self::fail(in_array('xl/workbook.xml', $names, true), 'Struktur xlsx tidak valid.');
        foreach ($names as $n) {
            self::fail(!str_contains($n, 'vbaProject'), 'Template berisi makro dan ditolak.');
            self::fail(!str_starts_with($n, 'xl/externalLinks/'), 'Template berisi link ke workbook eksternal dan ditolak.');
            self::fail(!str_starts_with($n, 'xl/embeddings/'), 'Template berisi objek tertanam dan ditolak.');
        }
        // Rels ini menandakan tautan ke workbook/objek eksternal (TargetMode="External").
        // Hyperlink biasa pada sel aman dan dibiarkan.
        foreach ($names as $n) {
            if (in_array($n, ['xl/_rels/workbook.xml.rels', 'xl/worksheets/_rels/sheet1.xml.rels'], true)
                || preg_match('#^xl/worksheets/_rels/sheet\d+\.xml\.rels$#', $n)) {
                continue;
            }
            if (str_ends_with($n, '.rels') && str_contains((string) $zip->getFromName($n), 'TargetMode="External"')) {
                self::fail(false, 'Template berisi referensi eksternal dan ditolak.');
            }
        }
        // Formula berbahaya (DDE / fungsi eksternal)
        foreach ($names as $n) {
            if (preg_match('#^xl/worksheets/sheet\d+\.xml$#', $n)) {
                $xml = (string) $zip->getFromName($n);
                self::fail(!preg_match('/<f[^>]*>[^<]*(cmd\||DDE|WEBSERVICE|HYPERLINK\(|\bEXEC\()/i', $xml), 'Template berisi formula berbahaya dan ditolak.');
            }
        }
        $zip->close();
    }

    public static function photo(UploadedFile $file): void
    {
        self::fail($file->getSize() <= 5 * 1024 * 1024, 'Foto maksimal 5 MB.');
        $magic = self::magic($file->getRealPath(), 8);
        $jpg = str_starts_with($magic, "\xFF\xD8\xFF");
        $png = str_starts_with($magic, "\x89PNG\r\n\x1A\n");
        self::fail(($jpg || $png) && in_array(strtolower($file->getClientOriginalExtension()), ['jpg', 'jpeg', 'png'], true), 'Foto harus JPG atau PNG.');
        self::fail(in_array($file->getMimeType(), ['image/jpeg', 'image/png'], true), 'Tipe MIME foto tidak valid.');
    }

    public static function pdf(UploadedFile $file): void
    {
        self::fail($file->getSize() <= 15 * 1024 * 1024, 'PDF maksimal 15 MB.');
        self::fail(self::magic($file->getRealPath(), 5) === '%PDF-' && $file->getMimeType() === 'application/pdf', 'Berkas bukan PDF yang valid.');
    }

    public static function csvOrXlsx(UploadedFile $file): string
    {
        $ext = strtolower($file->getClientOriginalExtension());
        self::fail(in_array($ext, ['csv', 'xlsx'], true), 'Data peserta harus .xlsx atau .csv.');
        self::fail($file->getSize() <= 10 * 1024 * 1024, 'Ukuran berkas data maksimal 10 MB.');
        if ($ext === 'xlsx') {
            self::xlsx($file);
        }
        return $ext;
    }

    private static function magic(string $path, int $n = 4): string
    {
        $h = fopen($path, 'rb');
        $b = $h ? fread($h, $n) : '';
        if ($h) {
            fclose($h);
        }
        return (string) $b;
    }

    private static function fail(bool $ok, string $msg): void
    {
        if (!$ok) {
            throw ValidationException::withMessages(['file' => [$msg]]);
        }
    }
}
