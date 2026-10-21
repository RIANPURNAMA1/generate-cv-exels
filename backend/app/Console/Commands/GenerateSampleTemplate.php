<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class GenerateSampleTemplate extends Command
{
    protected $signature = 'template:generate-sample {--path= : Lokasi keluaran (default storage/app/samples/template_cv_placeholder.xlsx)}';
    protected $description = 'Membuat template CV contoh berisi semua placeholder baku (dropdown, komentar, merge)';

    public function handle(): int
    {
        $cfg = config('cv_fields');
        $dropdowns = config('cv_dropdowns');

        $ss = new Spreadsheet();
        $sheet = $ss->getActiveSheet();
        $sheet->setTitle('CV');

        // Lebar kolom A..O dan tinggi baris 1..60
        foreach (range('A', 'O') as $col) {
            $sheet->getColumnDimension($col)->setWidth(in_array($col, ['A', 'B', 'C', 'D'], true) ? 10 : 12);
        }
        for ($r = 1; $r <= 60; $r++) {
            $sheet->getRowDimension($r)->setRowHeight(in_array($r, [43, 44, 45, 47, 48, 49, 50], true) ? 30 : 20);
        }

        // Judul dan label dua bahasa
        $sheet->setCellValue('A1', '実習生経歴書 / Riwayat Hidup Peserta Magang');
        $sheet->mergeCells('A1:O2');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);

        $labels = [
            'D8' => '氏名(カナ) / Nama katakana', 'D9' => '氏名 / Nama romaji', 'D11' => '生年月日 / Tgl lahir',
            'D13' => '出生地 / Tempat lahir', 'F14' => '年齢 / Usia', 'F15' => '性別 / Jenis kelamin', 'F16' => '電話 / No. HP',
            'A20' => '住所 / Alamat', 'F22' => '緊急連絡先 / Kontak darurat',
            'K5' => '身長', 'K6' => '体重', 'K7' => '靴', 'K8' => 'ウエスト', 'K9' => '血液型', 'K10' => '視力',
            'K11' => '婚姻', 'K12' => '宗教', 'K13' => '渡日歴', 'K14' => 'パスポート', 'K15' => '利き手',
            'K16' => '病歴', 'K17' => '喫煙', 'K18' => '飲酒',
            'A24' => '学歴 / Pendidikan', 'A30' => '職歴 / Pekerjaan', 'A36' => '家族 / Keluarga',
            'A43' => '自己PR', 'A44' => '日本へ行く目的', 'A45' => '帰国後の目標', 'A47' => '長所', 'A48' => '短所',
            'A49' => '特技', 'A50' => '趣味', 'A52' => 'JLPT / SIM / SSW', 'A55' => '日本の親戚 / Kerabat di Jepang',
        ];
        foreach ($labels as $c => $t) {
            $sheet->setCellValue($c, $t);
            $sheet->getStyle($c)->getFont()->setSize(9);
            $sheet->getStyle($c)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('F3F4F6');
        }

        // Merge
        foreach ($cfg['sample_merges'] as $range) {
            $sheet->mergeCells($range);
        }

        // Placeholder sel tunggal
        $cellFor = [];
        foreach ($cfg['sample_cells'] as $coord => $name) {
            $cellFor[$coord] = $name;
        }
        // Placeholder campuran teks + placeholder, contoh 年{tahun_lahir} dicontohkan lewat sel tanggal Jepang
        // (tanggal_lahir_jp sudah berformat penuh; sel campuran diuji lewat tes parser).

        // Placeholder berulang
        foreach ($cfg['sample_rows'] as $grp => [$start, $count, $cols]) {
            for ($i = 1; $i <= $count; $i++) {
                foreach ($cols as $col => $sub) {
                    $cellFor[$col . ($start + $i - 1)] = "{$grp}_{$i}_{$sub}";
                }
            }
        }

        foreach ($cellFor as $coord => $name) {
            $sheet->setCellValueExplicit($coord, '{' . $name . '}', DataType::TYPE_STRING);
            $sheet->getStyle($coord)->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
            $sheet->getStyle($coord)->getBorders()->getBottom()->setBorderStyle(Border::BORDER_HAIR);

            // Dropdown dari daftar contoh
            $key = preg_replace('/_\d+_/', '_', $name);
            if (isset($dropdowns[$key])) {
                $dv = $sheet->getCell($coord)->getDataValidation();
                $dv->setType(DataValidation::TYPE_LIST)
                    ->setErrorStyle(DataValidation::STYLE_STOP)
                    ->setAllowBlank(true)
                    ->setShowDropDown(false) // false = tampilkan panah dropdown
                    ->setShowErrorMessage(true)
                    ->setErrorTitle('Nilai tidak valid')
                    ->setError('Pilih salah satu nilai dari daftar.')
                    ->setFormula1('"' . implode(',', $dropdowns[$key]) . '"');
            }
        }

        // Komentar sel (harus tetap ada di hasil)
        $sheet->getComment('E9')->getText()->createTextRun('Tulis nama sesuai paspor, huruf kapital.');
        $sheet->getComment('L5')->getText()->createTextRun('Isi dalam cm, angka saja.');
        $sheet->getComment('E52')->getText()->createTextRun('Contoh: N4, N5.');

        // Area foto dan kerangka garis
        $sheet->getStyle('A5:D18')->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN);

        $path = $this->option('path') ?: storage_path('app/samples/template_cv_placeholder.xlsx');
        @mkdir(dirname($path), 0775, true);
        IOFactory::createWriter($ss, 'Xlsx')->save($path);

        $this->info('Template contoh dibuat: ' . $path);
        return self::SUCCESS;
    }
}
