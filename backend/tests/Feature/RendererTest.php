<?php

namespace Tests\Feature;

use App\Services\PlaceholderParser;
use App\Services\TemplateRenderer;
use Carbon\CarbonImmutable;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\RichText\RichText;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Tests\TestCase;

class RendererTest extends TestCase
{
    private string $dir;
    private string $template;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dir = sys_get_temp_dir() . '/cvtest_' . bin2hex(random_bytes(4));
        mkdir($this->dir, 0775, true);
        $this->template = $this->dir . '/template.xlsx';
        $this->artisan('template:generate-sample', ['--path' => $this->template])->assertExitCode(0);
    }

    private function photo(string $name = 'p.png'): string
    {
        $img = imagecreatetruecolor(300, 300);
        imagefill($img, 0, 0, imagecolorallocate($img, 10, 80, 160));
        $p = $this->dir . '/' . $name;
        imagepng($img, $p);
        return $p;
    }

    public function test_sample_template_detects_all_catalog_placeholders(): void
    {
        $ss = PlaceholderParser::load($this->template);
        $names = array_column(PlaceholderParser::detect($ss), 'name');
        foreach (['nama_romaji', 'foto', 'pendidikan_4_jurusan', 'keluarga_5_gaji', 'kerabat_alamat', 'catatan_tambahan'] as $n) {
            $this->assertContains($n, $names, "placeholder {$n} harus terdeteksi");
        }
        $dd = collect(PlaceholderParser::detect($ss))->firstWhere('name', 'status_nikah');
        $this->assertSame('dropdown', $dd['type']);
        $this->assertContains('Menikah（既婚）', $dd['options']);
    }

    public function test_render_three_participants(): void
    {
        $fx = require base_path('tests/fixtures/participants.php');
        $today = CarbonImmutable::create(2026, 10, 20, 0, 0, 0, 'Asia/Jakarta');
        $r = new TemplateRenderer();

        // 1. Lengkap + foto
        $out = $this->dir . '/lengkap.xlsx';
        $res = $r->render($this->template, $fx['lengkap'], [], ['pdf' => false], $this->photo(), $out, $today);
        $ss = IOFactory::load($out);
        $s = $ss->getActiveSheet();
        $this->assertSame('RETNO WULANDARI', $s->getTitle());
        $this->assertSame('RETNO WULANDARI', $s->getCell('E9')->getValue());
        $this->assertSame('年1993 月04 日20', $s->getCell('E11')->getValue());
        $this->assertSame(33, $s->getCell('G14')->getValue());                 // usia dihitung, bukan "25"
        $this->assertSame('(+62)81234567890', $s->getCell('G16')->getValue());
        $this->assertSame('Perempuan（女）', $s->getCell('G15')->getValue());
        $this->assertSame(158, $s->getCell('L5')->getValue());                 // numerik
        $this->assertSame('2005年07月', $s->getCell('A25')->getValue());
        $this->assertSame(' ¥2,500,000', $s->getCell('N31')->getValue());
        $this->assertSame('なし', $s->getCell('N37')->getValue());
        $this->assertSame('67歳', $s->getCell('I37')->getValue());
        $this->assertSame('Ayah（父）', $s->getCell('A37')->getValue());
        $this->assertSame('Perawatan Lansia（介護）', $s->getCell('L52')->getValue());
        $this->assertSame('', (string) $s->getCell('E26')->getValue());        // placeholder tanpa data → kosong
        $this->assertStringNotContainsString('{', $this->allText($s));
        $this->assertStringNotContainsString('null', $this->allText($s));
        $this->assertTrue($s->getStyle('E9')->getAlignment()->getShrinkToFit());
        $this->assertTrue($s->getStyle('E43')->getAlignment()->getWrapText());
        $this->assertSame(1, $s->getDrawingCollection()->count());
        $this->assertSame('', (string) $s->getCell('A5')->getValue());
        $this->assertNotEmpty($res['missing']);

        // Dropdown dan komentar template tetap ada
        $this->assertTrue($s->dataValidationExists('L11'));
        $this->assertSame('Belum Menikah（未婚）,Menikah（既婚）', trim($s->getDataValidation('L11')->getFormula1(), '"'));
        $this->assertArrayHasKey('E9', $s->getComments());
        $this->assertContains('A5:D18', array_values($s->getMergeCells()));

        // 2. Data janggal → peringatan, tidak gagal
        $res2 = $r->render($this->template, $fx['janggal'], [], [], null, $this->dir . '/janggal.xlsx', $today);
        $w = implode("\n", $res2['warnings']);
        $this->assertStringContainsString('riwayat_penyakit', $w);
        $this->assertStringContainsString('bertentangan', $w);
        $this->assertStringContainsString('merokok', $w);
        $this->assertStringContainsString('Foto belum ada', $w);
        $this->assertStringContainsString('pendidikan_1', $w);
        $this->assertStringContainsString('Tanggal lahir tidak dikenali', $w);
        $this->assertStringContainsString('no_hp', $w);

        // 3. Tanpa foto
        $res3 = $r->render($this->template, $fx['tanpa_foto'], [], [], null, $this->dir . '/nofoto.xlsx', $today);
        $this->assertContains('Foto belum ada.', $res3['warnings']);
        $this->assertSame(0, IOFactory::load($this->dir . '/nofoto.xlsx')->getActiveSheet()->getDrawingCollection()->count());
    }

    public function test_photo_stays_inside_merge_area(): void
    {
        $out = $this->dir . '/foto.xlsx';
        (new TemplateRenderer())->render($this->template, ['nama_romaji' => 'X'], [], [], $this->photo(), $out);
        $d = IOFactory::load($out)->getActiveSheet()->getDrawingCollection()[0];
        // area A5:D18 ≈ 4 kolom × 75px, 14 baris × 26.7px
        $this->assertEqualsWithDelta(3 / 4, $d->getWidth() / $d->getHeight(), 0.02);
        $this->assertLessThanOrEqual(305, $d->getWidth());
        $this->assertLessThanOrEqual(374, $d->getHeight());
    }

    public function test_mixed_text_and_rich_text_placeholders(): void
    {
        $ss = new Spreadsheet();
        $s = $ss->getActiveSheet();
        $s->setCellValue('A1', '年{tahun_lahir} 月{bulan_lahir} 日{tgl_lahir}');
        $rt = new RichText();
        $rt->createTextRun('{nama_');
        $rt->createTextRun('romaji}')->getFont()->setBold(true);
        $s->setCellValue('B2', $rt);
        $s->setCellValueExplicit('C3', '=1+1', DataType::TYPE_STRING);
        $tpl = $this->dir . '/mixed.xlsx';
        IOFactory::createWriter($ss, 'Xlsx')->save($tpl);

        $names = array_column(PlaceholderParser::detect(PlaceholderParser::load($tpl)), 'name');
        $this->assertEqualsCanonicalizing(['tahun_lahir', 'bulan_lahir', 'tgl_lahir', 'nama_romaji'], $names);

        $out = $this->dir . '/mixed_out.xlsx';
        (new TemplateRenderer())->render($tpl, ['tahun_lahir' => '1993', 'bulan_lahir' => '04', 'tgl_lahir' => '20', 'nama_romaji' => 'Retno'], [], [], null, $out);
        $o = IOFactory::load($out)->getActiveSheet();
        $this->assertSame('年1993 月04 日20', $o->getCell('A1')->getValue());
        $this->assertSame('RETNO', $o->getCell('B2')->getValue());
    }

    public function test_injection_values_are_stored_as_text(): void
    {
        $out = $this->dir . '/inj.xlsx';
        (new TemplateRenderer())->render($this->template, ['nama_romaji' => 'Z', 'alamat' => '=HYPERLINK("http://x","y")'], [], [], null, $out);
        $c = IOFactory::load($out)->getActiveSheet()->getCell('A21');
        $this->assertSame(DataType::TYPE_STRING, $c->getDataType());
    }

    private function allText($sheet): string
    {
        $t = '';
        foreach ($sheet->toArray(null, false, false, false) as $row) {
            $t .= implode('|', array_map('strval', $row)) . "\n";
        }
        return $t;
    }
}
