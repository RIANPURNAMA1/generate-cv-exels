<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * Pemformat deterministik (tanpa AI). Semua metode murni dan mudah diuji.
 */
class Formatters
{
    public const TZ = 'Asia/Jakarta';

    private const MONTHS = [
        'januari' => 1, 'jan' => 1, 'februari' => 2, 'feb' => 2, 'pebruari' => 2,
        'maret' => 3, 'mar' => 3, 'april' => 4, 'apr' => 4, 'mei' => 5,
        'juni' => 6, 'jun' => 6, 'juli' => 7, 'jul' => 7, 'agustus' => 8, 'agu' => 8, 'agt' => 8, 'ags' => 8,
        'september' => 9, 'sep' => 9, 'sept' => 9, 'oktober' => 10, 'okt' => 10,
        'november' => 11, 'nov' => 11, 'nopember' => 11, 'desember' => 12, 'des' => 12,
    ];

    public static function today(): CarbonImmutable
    {
        return CarbonImmutable::now(self::TZ)->startOfDay();
    }

    /** Terima YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, "20 April 1993". Null jika tidak dikenali. */
    public static function parseDate(mixed $value): ?CarbonImmutable
    {
        if ($value instanceof \DateTimeInterface) {
            return CarbonImmutable::instance($value)->setTimezone(self::TZ)->startOfDay();
        }
        if (is_int($value) || is_float($value) || (is_string($value) && preg_match('/^\d{5}(\.\d+)?$/', trim($value)))) {
            // Serial tanggal Excel
            $serial = (float) $value;
            if ($serial > 20000 && $serial < 80000) {
                $ts = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToTimestamp($serial);
                return CarbonImmutable::createFromTimestamp($ts, self::TZ)->startOfDay();
            }
        }
        $s = trim((string) $value);
        if ($s === '') {
            return null;
        }
        if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})/', $s, $m)) {
            return self::make((int) $m[1], (int) $m[2], (int) $m[3]);
        }
        if (preg_match('/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/', $s, $m)) {
            return self::make((int) $m[3], (int) $m[2], (int) $m[1]);
        }
        if (preg_match('/^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$/u', $s, $m)) {
            $mon = self::MONTHS[mb_strtolower($m[2])] ?? null;
            return $mon ? self::make((int) $m[3], $mon, (int) $m[1]) : null;
        }
        return null;
    }

    private static function make(int $y, int $m, int $d): ?CarbonImmutable
    {
        if (!checkdate($m, $d, $y)) {
            return null;
        }
        return CarbonImmutable::create($y, $m, $d, 0, 0, 0, self::TZ);
    }

    /** Hasil: "年1993 月04 日20" */
    public static function jpDate(CarbonImmutable $d): string
    {
        return sprintf('年%d 月%02d 日%02d', $d->year, $d->month, $d->day);
    }

    public static function age(CarbonImmutable $birth, ?CarbonImmutable $today = null): int
    {
        return $birth->diffInYears($today ?? self::today());
    }

    /**
     * Periode pendidikan/kerja → "2000年07月". Terima 2000-07, 07/2000, "Juli 2000", Y-m-d, d/m/Y, "2000".
     * @return array{0:?string,1:?int,2:?int} [teks, tahun, bulan]
     */
    public static function period(mixed $value): array
    {
        $s = trim((string) $value);
        if ($s === '') {
            return [null, null, null];
        }
        if (preg_match('/^(\d{4})年\s*(\d{1,2})月$/u', $s, $m)) {
            return [sprintf('%d年%02d月', $m[1], $m[2]), (int) $m[1], (int) $m[2]];
        }
        if (preg_match('/^(\d{4})[\/\-.](\d{1,2})$/', $s, $m) && (int) $m[2] >= 1 && (int) $m[2] <= 12) {
            return [sprintf('%d年%02d月', $m[1], $m[2]), (int) $m[1], (int) $m[2]];
        }
        if (preg_match('/^(\d{1,2})[\/\-.](\d{4})$/', $s, $m) && (int) $m[1] >= 1 && (int) $m[1] <= 12) {
            return [sprintf('%d年%02d月', $m[2], $m[1]), (int) $m[2], (int) $m[1]];
        }
        if (preg_match('/^([A-Za-z]+)\.?\s+(\d{4})$/u', $s, $m) && isset(self::MONTHS[mb_strtolower($m[1])])) {
            $mon = self::MONTHS[mb_strtolower($m[1])];
            return [sprintf('%d年%02d月', $m[2], $mon), (int) $m[2], $mon];
        }
        if (preg_match('/^(\d{4})$/', $s, $m)) {
            return [$m[1] . '年', (int) $m[1], null];
        }
        $d = self::parseDate($value);
        if ($d) {
            return [sprintf('%d年%02d月', $d->year, $d->month), $d->year, $d->month];
        }
        return [null, null, null];
    }

    /**
     * Normalisasi HP ke "(+62)8xxxxxxxxxx".
     * @return array{0:?string,1:?string} [nilai, peringatan]
     */
    public static function phone(mixed $value): array
    {
        $raw = trim((string) $value);
        if ($raw === '') {
            return [null, null];
        }
        if (preg_match('/[A-Za-z]/', $raw)) {
            return [null, 'No. HP mengandung huruf dan dikosongkan.'];
        }
        $digits = preg_replace('/\D+/', '', $raw);
        // buang awalan 62 yang ganda, lalu awalan 0
        while (str_starts_with($digits, '62') && strlen($digits) > 11) {
            $digits = substr($digits, 2);
        }
        if (str_starts_with($digits, '62')) {
            $digits = substr($digits, 2);
        }
        $digits = ltrim($digits, '0');
        if (strlen($digits) < 8 || strlen($digits) > 13) {
            return [null, 'Panjang No. HP tidak wajar dan dikosongkan.'];
        }
        return ['(+62)' . $digits, null];
    }

    /** Uang: angka dengan awalan " ¥". Kosong jika tidak ada data. */
    public static function money(mixed $value): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $value);
        if ($digits === '' || $digits === null) {
            return null;
        }
        return ' ¥' . number_format((int) $digits, 0, '.', ',');
    }

    /** Gaji keluarga: "なし" untuk tidak berpenghasilan. */
    public static function moneyFamily(mixed $value): ?string
    {
        $s = mb_strtolower(trim((string) $value));
        if ($s === '') {
            return null;
        }
        if (in_array($s, ['0', '-', 'tidak ada', 'tidak', 'nihil', 'tidak ada penghasilan', 'tdk ada', 'なし'], true)) {
            return 'なし';
        }
        return self::money($value);
    }

    /** Usia keluarga: angka + "歳". */
    public static function familyAge(mixed $value): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $value);
        return ($digits === '' || $digits === null) ? null : ((int) $digits) . '歳';
    }

    /** Hapus bagian （…） atau (…) dan rapikan, untuk pencocokan dropdown. */
    public static function dropdownBase(string $option): string
    {
        $s = preg_replace('/[（(].*?[）)]/u', '', $option);
        return mb_strtolower(trim(preg_replace('/\s+/u', ' ', $s)));
    }

    /** Slug nama berkas aman. */
    public static function slug(string $name): string
    {
        $s = preg_replace('/[^A-Za-z0-9]+/', '_', \Illuminate\Support\Str::ascii($name));
        $s = trim($s, '_');
        return $s !== '' ? $s : 'peserta';
    }

    /** Nama sheet Excel: maks 31 karakter, tanpa karakter terlarang. */
    public static function sheetName(string $name): string
    {
        $s = trim(preg_replace('/[\\\\\/\?\*\[\]:]/u', '', $name), " '");
        $s = mb_substr($s, 0, 31);
        return $s !== '' ? $s : 'CV';
    }
}
