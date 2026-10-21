<?php

namespace App\Services;

use App\Support\Formatters;
use Carbon\CarbonImmutable;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\RichText\RichText;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use RuntimeException;

class TemplateRenderer
{
    /** @var string[] berkas sementara (foto hasil proses) yang dihapus setelah penyimpanan */
    private array $tmpFiles = [];

    public function __construct(private ValueFormatter $formatter = new ValueFormatter())
    {
    }

    /**
     * @param  array<string,mixed>  $data      satu baris data peserta
     * @param  array<string,string> $mapping   placeholder => kolom
     * @param  array<string,bool>   $options   normalizePhone, autoAge, jpDate
     * @return array{warnings:string[], missing:string[], participantName:string}
     */
    public function render(
        string $templatePath,
        array $data,
        array $mapping,
        array $options,
        ?string $photoPath,
        string $outPath,
        ?CarbonImmutable $today = null,
    ): array {
        $ss = PlaceholderParser::load($templatePath);

        // 1. Kumpulkan sel ber-placeholder dari semua sheet (sebelum ada yang diubah).
        $targets = [];       // [sheetIndex, coord, text, names[]]
        $dropdowns = [];     // placeholder => options|null
        $allNames = [];
        foreach ($ss->getAllSheets() as $si => $sheet) {
            foreach ($sheet->getCoordinates() as $coord) {
                $cellVal = $sheet->getCell($coord)->getValue();
                $text = PlaceholderParser::cellText($cellVal);
                if ($text === null || !preg_match_all(PlaceholderParser::REGEX, $text, $m)) {
                    continue;
                }
                $names = array_values(array_unique($m[1]));
                $targets[] = [$si, $coord, $text, $names, $cellVal instanceof RichText ? $cellVal : null];
                $opts = PlaceholderParser::dropdownOptions($sheet, $coord);
                foreach ($names as $n) {
                    $allNames[$n] = true;
                    if ($opts !== null) {
                        $dropdowns[$n] = $opts;
                    }
                }
            }
        }

        // 2. Nilai akhir tiap placeholder.
        $prepared = $this->formatter->prepare(array_keys($allNames), $data, $mapping, $dropdowns, $options, $today);
        $values = $prepared['values'];
        $warnings = $prepared['warnings'];
        $missing = [];

        $cfg = config('cv_fields');
        $merges = [];
        foreach ($ss->getAllSheets() as $si => $sheet) {
            $merges[$si] = PlaceholderParser::mergeMap($sheet);
        }

        // 3. Tulis ke sel.
        foreach ($targets as [$si, $coord, $text, $names, $rich]) {
            $sheet = $ss->getSheet($si);
            $cell = $sheet->getCell($coord);

            if ($names === ['foto'] && trim($text) === '{foto}') {
                $cell->setValueExplicit('', DataType::TYPE_STRING);
                if ($photoPath && is_file($photoPath)) {
                    $this->placePhoto($sheet, $coord, $photoPath, $merges[$si][$coord] ?? null);
                } else {
                    $warnings[] = 'Foto belum ada.';
                }
                continue;
            }

            $single = count($names) === 1 && trim($text) === '{' . $names[0] . '}';
            $out = $text;
            foreach ($names as $n) {
                $v = $values[$n] ?? null;
                if ($n === 'foto') {
                    $out = str_replace('{foto}', '', $out);
                    continue;
                }
                if ($v === null || $v === '') {
                    $missing[$n] = true;
                    $out = str_replace('{' . $n . '}', '', $out);
                } else {
                    $out = str_replace('{' . $n . '}', (string) $v, $out);
                }
            }

            if ($single && is_int($values[$names[0]] ?? null) || $single && is_float($values[$names[0]] ?? null)) {
                $cell->setValueExplicit($values[$names[0]], DataType::TYPE_NUMERIC);
            } elseif (trim($out) === '') {
                $cell->setValueExplicit('', DataType::TYPE_STRING);
                $sheet->getCell($coord)->setValue(null);
            } else {
                // Selalu string eksplisit: mencegah = + - @ ditafsirkan sebagai formula (CSV/Excel injection).
                $cell->setValueExplicit($out, DataType::TYPE_STRING);
            }

            if ($rich) {
                $this->applyFirstRunFont($sheet, $coord, $rich);
            }
            $this->applyFit($sheet, $coord, $names[0], $out, $merges[$si][$coord] ?? null, $warnings);
        }

        if ($missing) {
            $names = array_keys($missing);
            $shown = implode(', ', array_map(fn ($n) => '{' . $n . '}', array_slice($names, 0, 6)));
            $more = count($names) > 6 ? ' dan ' . (count($names) - 6) . ' lainnya' : '';
            $warnings[] = count($names) . " placeholder tanpa data, sel dikosongkan: {$shown}{$more}.";
        }

        // 4. Nama sheet dan metadata.
        $name = (string) ($data[$mapping['nama_romaji'] ?? 'nama_romaji'] ?? '');
        $name = $name !== '' ? mb_strtoupper($name) : 'CV';
        $ss->getActiveSheet()->setTitle(Formatters::sheetName($name));
        $p = $ss->getProperties();
        $p->setCreator('')->setLastModifiedBy('')->setTitle('')->setSubject('')
            ->setDescription('')->setKeywords('')->setCategory('')->setCompany('')->setManager('');

        $writer = IOFactory::createWriter($ss, 'Xlsx');
        $writer->setPreCalculateFormulas(false);
        $writer->save($outPath);
        $ss->disconnectWorksheets();
        unset($ss);
        foreach ($this->tmpFiles as $f) {
            @unlink($f);
        }
        $this->tmpFiles = [];

        return [
            'warnings' => array_values(array_unique($warnings)),
            'missing' => array_keys($missing),
            'participantName' => $name,
        ];
    }

    private function applyFit(Worksheet $sheet, string $coord, string $firstName, string $out, ?array $merge, array &$warnings): void
    {
        $cfg = config('cv_fields');
        $align = $sheet->getStyle($coord)->getAlignment();

        foreach ($cfg['wrap_patterns'] as $re) {
            if (preg_match($re, $firstName)) {
                $align->setWrapText(true)->setShrinkToFit(false);
                return;
            }
        }
        foreach ($cfg['shrink_patterns'] as $re) {
            if (preg_match($re, $firstName)) {
                $align->setShrinkToFit(true)->setWrapText(false);
                $capacity = $this->widthChars($sheet, $coord, $merge);
                if ($capacity > 0 && mb_strwidth($out) > $capacity * 2.0) {
                    $warnings[] = "Teks di {$coord} ('" . mb_substr($out, 0, 20) . "…') diperkirakan meluber walau sudah dikecilkan.";
                }
                return;
            }
        }
    }

    private function widthChars(Worksheet $sheet, string $coord, ?array $merge): float
    {
        $own = Coordinate::columnIndexFromString(preg_replace('/\d+/', '', $coord));
        [$c1, $c2] = $merge['cols'] ?? [$own, $own];
        $sum = 0.0;
        for ($c = $c1; $c <= $c2; $c++) {
            $w = $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($c))->getWidth();
            $sum += $w > 0 ? $w : 8.43;
        }
        return $sum;
    }

    private function applyFirstRunFont(Worksheet $sheet, string $coord, RichText $rich): void
    {
        foreach ($rich->getRichTextElements() as $el) {
            $f = method_exists($el, 'getFont') ? $el->getFont() : null;
            if ($f) {
                $style = $sheet->getStyle($coord)->getFont();
                if ($f->getName()) {
                    $style->setName($f->getName());
                }
                if ($f->getSize()) {
                    $style->setSize($f->getSize());
                }
                $style->setBold((bool) $f->getBold())->setItalic((bool) $f->getItalic());
            }
            break;
        }
    }

    // ---- Foto ----

    private function colPx(Worksheet $sheet, int $col): int
    {
        $w = $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($col))->getWidth();
        if ($w <= 0) {
            $d = $sheet->getDefaultColumnDimension()->getWidth();
            $w = $d > 0 ? $d : 8.43;
        }
        return (int) floor($w * 7 + 5);
    }

    private function rowPx(Worksheet $sheet, int $row): int
    {
        $h = $sheet->getRowDimension($row)->getRowHeight();
        if ($h <= 0) {
            $d = $sheet->getDefaultRowDimension()->getRowHeight();
            $h = $d > 0 ? $d : 15.0;
        }
        return (int) round($h * 96 / 72);
    }

    /** Pasang foto rasio 3:4 di tengah area merge, tanpa melewati batas area. */
    private function placePhoto(Worksheet $sheet, string $coord, string $photoPath, ?array $merge): void
    {
        [$c0, $r0] = Coordinate::indexesFromString($coord);
        [$c1, $c2] = $merge['cols'] ?? [$c0, $c0];
        [$r1, $r2] = $merge['rows'] ?? [$r0, $r0];

        $aw = 0;
        for ($c = $c1; $c <= $c2; $c++) {
            $aw += $this->colPx($sheet, $c);
        }
        $ah = 0;
        for ($r = $r1; $r <= $r2; $r++) {
            $ah += $this->rowPx($sheet, $r);
        }

        $pad = 3; // jarak dari garis tepi
        $availW = max(10, $aw - 2 * $pad);
        $availH = max(10, $ah - 2 * $pad);
        $w = (int) floor(min($availW, $availH * 3 / 4));
        $h = (int) floor($w * 4 / 3);

        $dx = $pad + (int) floor(($availW - $w) / 2);
        $dy = $pad + (int) floor(($availH - $h) / 2);

        // Offset harus jatuh di dalam sel jangkar; geser jangkar bila offset melewati lebar/tinggi sel.
        $col = $c1;
        while ($col < $c2 && $dx >= ($cw = $this->colPx($sheet, $col))) {
            $dx -= $cw;
            $col++;
        }
        $row = $r1;
        while ($row < $r2 && $dy >= ($rh = $this->rowPx($sheet, $row))) {
            $dy -= $rh;
            $row++;
        }

        $tmp = tempnam(sys_get_temp_dir(), 'cvphoto') . '.jpg';
        PhotoProcessor::process($photoPath, $tmp);
        $keep = storage_path('app/tmp');
        if (!is_dir($keep)) {
            @mkdir($keep, 0700, true);
        }
        $final = $keep . '/' . bin2hex(random_bytes(8)) . '.jpg';
        rename($tmp, $final);
        $this->tmpFiles[] = $final;

        $d = new Drawing();
        $d->setName('Foto');
        $d->setPath($final);
        $d->setResizeProportional(false);
        $d->setWidth($w);
        $d->setHeight($h);
        $d->setCoordinates(Coordinate::stringFromColumnIndex($col) . $row);
        $d->setOffsetX($dx);
        $d->setOffsetY($dy);
        $d->setWorksheet($sheet);
    }
}
