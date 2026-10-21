<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use Symfony\Component\Process\Process;
use RuntimeException;

class PdfConverter
{
    /** Konversi xlsx → pdf (A4 portrait, 1x1 halaman). Mengembalikan path PDF. */
    public function convert(string $xlsxPath, string $outDir): string
    {
        @mkdir($outDir, 0700, true);
        $prepared = $outDir . '/' . bin2hex(random_bytes(6)) . '.xlsx';
        $this->prepare($xlsxPath, $prepared);

        $profile = sys_get_temp_dir() . '/lo_' . bin2hex(random_bytes(6));
        $p = new Process([
            'soffice', "-env:UserInstallation=file://{$profile}", '--headless',
            '--convert-to', 'pdf', '--outdir', $outDir, $prepared,
        ], null, ['HOME' => $profile]);
        $p->setTimeout(60);
        try {
            $p->run();
        } finally {
            @unlink($prepared);
            $this->rmdir($profile);
        }
        $pdf = $outDir . '/' . pathinfo($prepared, PATHINFO_FILENAME) . '.pdf';
        if (!$p->isSuccessful() || !is_file($pdf)) {
            throw new RuntimeException('Konversi PDF gagal.');
        }
        return $pdf;
    }

    private function prepare(string $in, string $out): void
    {
        $ss = PlaceholderParser::load($in);
        foreach ($ss->getAllSheets() as $sheet) {
            $ps = $sheet->getPageSetup();
            $ps->setPaperSize(PageSetup::PAPERSIZE_A4)->setOrientation(PageSetup::ORIENTATION_PORTRAIT)
                ->setFitToWidth(1)->setFitToHeight(1)->setFitToPage(true);
            $sheet->getPageMargins()->setTop(0.4)->setBottom(0.4)->setLeft(0.4)->setRight(0.4);
            $sheet->getPageSetup()->setHorizontalCentered(true);
            $sheet->getPageSetup()->setPrintArea($sheet->calculateWorksheetDimension());
        }
        IOFactory::createWriter($ss, 'Xlsx')->save($out);
        $ss->disconnectWorksheets();
    }

    private function rmdir(string $d): void
    {
        if (!is_dir($d)) {
            return;
        }
        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($d, \FilesystemIterator::SKIP_DOTS), \RecursiveIteratorIterator::CHILD_FIRST) as $f) {
            $f->isDir() ? @rmdir($f->getPathname()) : @unlink($f->getPathname());
        }
        @rmdir($d);
    }
}
