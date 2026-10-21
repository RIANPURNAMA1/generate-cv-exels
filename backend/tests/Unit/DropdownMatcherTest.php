<?php

namespace Tests\Unit;

use App\Support\DropdownMatcher;
use Tests\TestCase;

class DropdownMatcherTest extends TestCase
{
    private array $nikah = ['Belum Menikah（未婚）', 'Menikah（既婚）'];

    public function test_maps_free_text_to_exact_option(): void
    {
        $this->assertSame('Belum Menikah（未婚）', DropdownMatcher::match('status_nikah', 'belum menikah', $this->nikah)['value']);
        $this->assertSame('Belum Menikah（未婚）', DropdownMatcher::match('status_nikah', 'lajang', $this->nikah)['value']);
        $this->assertSame('Menikah（既婚）', DropdownMatcher::match('status_nikah', 'Kawin', $this->nikah)['value']);
    }

    public function test_numbered_field_uses_base_synonyms(): void
    {
        $opts = ['Ayah（父）', 'Ibu（母）'];
        $this->assertSame('Ayah（父）', DropdownMatcher::match('keluarga_3_hubungan', 'Bapak', $opts)['value']);
    }

    public function test_no_match_returns_null_and_suggestion(): void
    {
        $r = DropdownMatcher::match('status_nikah', 'Menikahh', $this->nikah);
        $this->assertNull($r['value']);
        $this->assertSame('Menikah（既婚）', $r['suggestion']);
        $this->assertNull(DropdownMatcher::match('status_nikah', 'zzzz', $this->nikah)['value']);
    }
}
