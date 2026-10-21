<?php

namespace App\Support;

class DropdownMatcher
{
    /** Kunci field tanpa nomor: keluarga_2_hubungan → keluarga_hubungan */
    public static function fieldKey(string $placeholder): string
    {
        return preg_replace('/_\d+_/', '_', $placeholder);
    }

    /**
     * @param  string[]  $options  pilihan persis dari data validation template
     * @return array{value:?string, suggestion:?string, exact:bool}
     */
    public static function match(string $placeholder, mixed $input, array $options, ?array $synonyms = null): array
    {
        $raw = trim((string) $input);
        if ($raw === '' || $options === []) {
            return ['value' => null, 'suggestion' => null, 'exact' => false];
        }

        // 1. Sama persis dengan salah satu pilihan.
        foreach ($options as $opt) {
            if ($opt === $raw) {
                return ['value' => $opt, 'suggestion' => null, 'exact' => true];
            }
        }

        $synonyms ??= config('cv_synonyms', []);
        $table = $synonyms[self::fieldKey($placeholder)] ?? [];
        $norm = self::normalize($raw);

        // 2. Sama dengan bagian Indonesia pilihan, atau sinonimnya.
        foreach ($options as $opt) {
            $base = Formatters::dropdownBase($opt);
            if ($norm === $base) {
                return ['value' => $opt, 'suggestion' => null, 'exact' => false];
            }
            foreach ($table[$base] ?? [] as $syn) {
                if ($norm === self::normalize($syn)) {
                    return ['value' => $opt, 'suggestion' => null, 'exact' => false];
                }
            }
        }

        // 3. Tidak cocok: usulkan pilihan terdekat, tetapi jangan dipakai otomatis.
        $best = null;
        $bestPct = 0.0;
        foreach ($options as $opt) {
            similar_text($norm, Formatters::dropdownBase($opt), $pct);
            if ($pct > $bestPct) {
                $bestPct = $pct;
                $best = $opt;
            }
        }
        return ['value' => null, 'suggestion' => $bestPct >= 50 ? $best : null, 'exact' => false];
    }

    public static function normalize(string $s): string
    {
        $s = preg_replace('/[（(].*?[）)]/u', '', $s);
        return mb_strtolower(trim(preg_replace('/\s+/u', ' ', $s)));
    }
}
