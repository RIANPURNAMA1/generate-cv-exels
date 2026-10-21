<?php

namespace App\Services;

use App\Support\DropdownMatcher;
use App\Support\Formatters;
use Carbon\CarbonImmutable;

/**
 * Menyiapkan nilai akhir tiap placeholder dari satu baris data peserta.
 * Murni deterministik; hasil AI (katakana/terjemahan) sudah menjadi bagian data yang disetujui pengguna.
 */
class ValueFormatter
{
    /**
     * @param  array<string,mixed>  $data     data peserta (kunci = nama kolom)
     * @param  array<string,string> $mapping  placeholder => kolom (default: nama sama)
     * @param  array<string,?array> $dropdowns placeholder => daftar pilihan template
     * @param  array<string,bool>   $options  pdf, normalizePhone, autoAge, jpDate
     * @return array{values: array<string,string|int|float|null>, warnings: string[]}
     */
    public function prepare(array $placeholders, array $data, array $mapping, array $dropdowns, array $options = [], ?CarbonImmutable $today = null): array
    {
        $opt = $options + ['normalizePhone' => true, 'autoAge' => true, 'jpDate' => true];
        $warnings = [];
        $values = [];
        $catalog = config('cv_fields.fields', []);

        $get = function (string $ph) use ($data, $mapping) {
            $col = $mapping[$ph] ?? $ph;
            $v = $data[$col] ?? null;
            return is_string($v) ? trim($v) : $v;
        };

        // Tanggal lahir → usia dan format Jepang
        $birth = Formatters::parseDate($data[$mapping['tanggal_lahir'] ?? 'tanggal_lahir'] ?? null);
        $rawBirth = $data[$mapping['tanggal_lahir'] ?? 'tanggal_lahir'] ?? null;
        if ($rawBirth !== null && trim((string) $rawBirth) !== '' && !$birth) {
            $warnings[] = 'Tanggal lahir tidak dikenali (gunakan YYYY-MM-DD, DD/MM/YYYY, atau "20 April 1993").';
        }
        $age = $birth ? Formatters::age($birth, $today) : null;

        foreach ($placeholders as $ph) {
            $meta = $catalog[$ph] ?? null;
            $raw = $get($ph);
            $value = null;

            switch (true) {
                case $ph === 'foto':
                    break; // ditangani renderer

                case $ph === 'tanggal_lahir_jp':
                    if ($birth) {
                        $value = Formatters::jpDate($birth);
                    } elseif (!empty($raw)) {
                        $value = (string) $raw;
                    }
                    if (!$opt['jpDate'] && $birth) {
                        $value = $birth->format('d/m/Y');
                    }
                    break;

                case $ph === 'tanggal_lahir':
                    $value = $birth ? $birth->format('d/m/Y') : ($raw !== null ? (string) $raw : null);
                    break;

                case $ph === 'usia':
                    if ($opt['autoAge'] && $age !== null) {
                        $value = $age;
                        $given = $data[$mapping['usia'] ?? 'usia'] ?? null;
                        if ($given !== null && trim((string) $given) !== '' && (int) $given !== $age) {
                            $warnings[] = "Usia di data ({$given}) berbeda dari hasil hitung ({$age}); memakai hasil hitung.";
                        }
                    } elseif ($raw !== null && $raw !== '') {
                        $value = (int) preg_replace('/\D+/', '', (string) $raw);
                    }
                    break;

                case in_array($ph, ['no_hp', 'kontak_darurat_telp'], true):
                    if ($opt['normalizePhone']) {
                        [$value, $w] = Formatters::phone($raw);
                        if ($w) {
                            $warnings[] = "{$ph}: {$w}";
                        }
                    } else {
                        $value = $raw === null ? null : (string) $raw;
                    }
                    break;

                case $ph === 'nama_romaji':
                    $value = $raw === null || $raw === '' ? null : mb_strtoupper((string) $raw);
                    break;

                case (bool) preg_match('/^(pendidikan|kerja)_\d+_(mulai|selesai)$/', $ph):
                    if ($raw !== null && $raw !== '') {
                        [$value] = Formatters::period($raw);
                        if ($value === null) {
                            $warnings[] = "{$ph}: periode '{$raw}' tidak dikenali.";
                        }
                    }
                    break;

                case (bool) preg_match('/^(kerja)_\d+_gaji$/', $ph):
                    $value = Formatters::money($raw);
                    break;

                case (bool) preg_match('/^keluarga_\d+_gaji$/', $ph):
                    $value = Formatters::moneyFamily($raw);
                    break;

                case (bool) preg_match('/^(keluarga_\d+|kerabat)_usia$/', $ph):
                    $value = Formatters::familyAge($raw);
                    break;

                case in_array($ph, ['tinggi', 'berat', 'ukuran_sepatu', 'lingkar_pinggang'], true):
                    if ($raw !== null && $raw !== '') {
                        if (!preg_match('/^\s*[\d.,]+\s*(cm|kg|mm)?\s*$/i', (string) $raw)) {
                            $warnings[] = "{$ph}: nilai '{$raw}' mengandung karakter non-angka.";
                        }
                        $num = str_replace(',', '.', preg_replace('/[^\d,.]/', '', (string) $raw));
                        if (is_numeric($num)) {
                            $value = str_contains($num, '.') ? (float) $num : (int) $num;
                        } else {
                            $warnings[] = "{$ph}: nilai '{$raw}' bukan angka.";
                        }
                    }
                    break;

                case isset($dropdowns[$ph]) && $dropdowns[$ph] !== null:
                    if ($raw !== null && $raw !== '') {
                        $r = DropdownMatcher::match($ph, $raw, $dropdowns[$ph]);
                        $value = $r['value'];
                        if ($value === null) {
                            $hint = $r['suggestion'] ? " Usulan terdekat: {$r['suggestion']}." : '';
                            $warnings[] = "{$ph}: nilai '{$raw}' tidak cocok dengan pilihan dropdown.{$hint}";
                        }
                    }
                    break;

                default:
                    $value = $raw === null || $raw === '' ? null : (is_scalar($raw) ? (string) $raw : null);
                    if (($meta['format'] ?? null) === 'upper' && $value !== null) {
                        $value = mb_strtoupper($value);
                    }
            }

            // Konsistensi
            if (in_array($ph, ['riwayat_penyakit', 'sim_status'], true) && is_string($raw)
                && preg_match('/(tidak|belum|nihil|none)/iu', $raw) && str_contains($raw, '（有）')) {
                $warnings[] = "{$ph}: '{$raw}' bertentangan (（有） berarti ada).";
            }
            if (in_array($ph, ['merokok', 'alkohol'], true) && is_scalar($raw) && in_array(trim((string) $raw), ['1', '0', '2'], true)) {
                $warnings[] = "{$ph}: nilai '{$raw}' ambigu; periksa kembali.";
            }

            $values[$ph] = $value;
        }

        // Urutan periode terbalik
        foreach (['pendidikan' => 4, 'kerja' => 4] as $grp => $n) {
            for ($i = 1; $i <= $n; $i++) {
                $a = Formatters::period($data[$mapping["{$grp}_{$i}_mulai"] ?? "{$grp}_{$i}_mulai"] ?? null);
                $b = Formatters::period($data[$mapping["{$grp}_{$i}_selesai"] ?? "{$grp}_{$i}_selesai"] ?? null);
                if ($a[1] && $b[1] && ($a[1] * 100 + ($a[2] ?? 1)) > ($b[1] * 100 + ($b[2] ?? 12))) {
                    $warnings[] = "{$grp}_{$i}: periode mulai lebih akhir daripada selesai.";
                }
            }
        }

        return ['values' => $values, 'warnings' => array_values(array_unique($warnings))];
    }
}
