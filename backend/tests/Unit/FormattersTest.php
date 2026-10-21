<?php

namespace Tests\Unit;

use App\Support\Formatters;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;

class FormattersTest extends TestCase
{
    public function test_parse_date_formats(): void
    {
        $this->assertSame('1993-04-20', Formatters::parseDate('20 April 1993')->toDateString());
        $this->assertSame('1999-10-20', Formatters::parseDate('20 Oktober 1999')->toDateString());
        $this->assertSame('1993-04-20', Formatters::parseDate('20/04/1993')->toDateString());
        $this->assertSame('1993-04-20', Formatters::parseDate('1993-04-20')->toDateString());
        $this->assertNull(Formatters::parseDate('31/02/1990'));
        $this->assertNull(Formatters::parseDate('bukan tanggal'));
    }

    public function test_jp_date(): void
    {
        $this->assertSame('年1993 月04 日20', Formatters::jpDate(Formatters::parseDate('20 April 1993')));
    }

    public function test_age_uses_given_today(): void
    {
        $b = CarbonImmutable::create(1993, 4, 20, 0, 0, 0, Formatters::TZ);
        $this->assertSame(32, Formatters::age($b, CarbonImmutable::create(2026, 4, 19, 0, 0, 0, Formatters::TZ)));
        $this->assertSame(33, Formatters::age($b, CarbonImmutable::create(2026, 4, 20, 0, 0, 0, Formatters::TZ)));
    }

    public function test_phone_normalization(): void
    {
        $this->assertSame('(+62)81234567890', Formatters::phone('+62 812-3456-7890')[0]);
        $this->assertSame('(+62)81234567890', Formatters::phone('081234567890')[0]);
        $this->assertSame('(+62)81234567890', Formatters::phone('6262 81234567890')[0]);
        $this->assertNull(Formatters::phone('abc123')[0]);
        $this->assertNotNull(Formatters::phone('12')[1]);
    }

    public function test_period_and_money_and_family_age(): void
    {
        $this->assertSame('2000年07月', Formatters::period('2000-07')[0]);
        $this->assertSame('2000年07月', Formatters::period('Juli 2000')[0]);
        $this->assertSame('2000年07月', Formatters::period('07/2000')[0]);
        $this->assertSame(' ¥2,500,000', Formatters::money('2500000'));
        $this->assertSame('なし', Formatters::moneyFamily('tidak ada'));
        $this->assertNull(Formatters::moneyFamily(''));
        $this->assertSame('67歳', Formatters::familyAge('67'));
    }

    public function test_sheet_name_and_slug(): void
    {
        $this->assertSame(31, mb_strlen(Formatters::sheetName(str_repeat('A', 50))));
        $this->assertSame('ABC', Formatters::sheetName('A/B:C'));
        $this->assertSame('Retno_Wulandari', Formatters::slug('Retno Wulandari'));
        $this->assertSame('peserta', Formatters::slug('../../'));
    }
}
