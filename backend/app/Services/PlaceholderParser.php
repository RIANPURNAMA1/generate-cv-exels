<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\RichText\RichText;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class PlaceholderParser
{
    public const REGEX = '/\{([a-z0-9_]+)\}/';

    /** Muat template tanpa mengeksekusi formula dan tanpa membaca data hasil hitung. */
    public static function load(string $path): Spreadsheet
    {
        $reader = IOFactory::createReader('Xlsx');
        $reader->setReadDataOnly(false);
        $reader->setReadEmptyCells(true);
        return $reader->load($path);
    }

    /** Teks sel; rich text digabung dari semua run. */
    public static function cellText(mixed $value): ?string
    {
        if ($value instanceof RichText) {
            return $value->getPlainText();
        }
        return is_scalar($value) ? (string) $value : null;
    }

    /** Peta sel → sel kiri-atas merge, untuk sel yang berada di dalam merge. */
    public static function mergeMap(Worksheet $sheet): array
    {
        $map = [];
        foreach ($sheet->getMergeCells() as $range) {
            [[$c1, $r1], [$c2, $r2]] = Coordinate::rangeBoundaries($range);
            $anchor = Coordinate::stringFromColumnIndex($c1) . $r1;
            $map[$anchor] = ['range' => $range, 'cols' => [$c1, $c2], 'rows' => [$r1, $r2]];
        }
        return $map;
    }

    /** Pilihan dropdown (list) pada sel; sel dalam merge memakai validasi sel kiri-atas. */
    public static function dropdownOptions(Worksheet $sheet, string $coord): ?array
    {
        if (!$sheet->dataValidationExists($coord)) {
            return null;
        }
        $dv = $sheet->getDataValidation($coord);
        if ($dv->getType() !== DataValidation::TYPE_LIST) {
            return null;
        }
        $f = trim((string) $dv->getFormula1());
        if ($f === '') {
            return null;
        }
        // Daftar literal: "A,B,C"
        if (str_starts_with($f, '"') && str_ends_with($f, '"')) {
            $items = array_map('trim', explode(',', substr($f, 1, -1)));
            return array_values(array_filter($items, fn ($i) => $i !== ''));
        }
        // Rentang sel: =Sheet2!$A$1:$A$5 atau $A$1:$A$5
        $ref = ltrim($f, '=');
        $ws = $sheet;
        if (str_contains($ref, '!')) {
            [$name, $ref] = explode('!', $ref, 2);
            $ws = $sheet->getParent()?->getSheetByName(trim($name, "'")) ?? null;
            if (!$ws) {
                return null;
            }
        }
        $ref = str_replace('$', '', $ref);
        if (!preg_match('/^[A-Z]+\d+(:[A-Z]+\d+)?$/', $ref)) {
            return null; // named range tidak didukung → dilaporkan sebagai tanpa daftar
        }
        $out = [];
        foreach ($ws->rangeToArray($ref, null, false, false) as $row) {
            foreach ($row as $v) {
                $t = self::cellText($v);
                if ($t !== null && trim($t) !== '') {
                    $out[] = trim($t);
                }
            }
        }
        return $out;
    }

    /**
     * Deteksi semua placeholder pada semua sheet.
     * @return array<int, array{name:string,type:string,cells:string[],sheet:string,options:?array,known:bool}>
     */
    public static function detect(Spreadsheet $ss): array
    {
        $catalog = config('cv_fields.fields', []);
        $found = [];

        foreach ($ss->getAllSheets() as $sheet) {
            $merges = self::mergeMap($sheet);
            foreach ($sheet->getCoordinates() as $coord) {
                $text = self::cellText($sheet->getCell($coord)->getValue());
                if ($text === null || !preg_match_all(self::REGEX, $text, $m)) {
                    continue;
                }
                foreach (array_unique($m[1]) as $name) {
                    $known = isset($catalog[$name]);
                    $type = $catalog[$name]['type'] ?? 'text';
                    $options = self::dropdownOptions($sheet, $coord);
                    if ($options !== null && $type === 'text') {
                        $type = 'dropdown';
                    }
                    $found[$name] ??= [
                        'name' => $name,
                        'type' => $type,
                        'cells' => [],
                        'sheet' => $sheet->getTitle(),
                        'options' => null,
                        'known' => $known,
                    ];
                    $found[$name]['cells'][] = $coord . (isset($merges[$coord]) ? ' (' . $merges[$coord]['range'] . ')' : '');
                    if ($options !== null) {
                        $found[$name]['options'] = $options;
                    }
                }
            }
        }
        return array_values($found);
    }
}
