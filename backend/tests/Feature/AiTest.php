<?php

namespace Tests\Feature;

use App\Models\Participant;
use App\Models\User;
use App\Services\Ai\AiTasks;
use App\Services\Ai\ClaudeClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiTest extends TestCase
{
    use RefreshDatabase;

    private function fakeClaude(array $results): void
    {
        Http::fake(['api.anthropic.com/*' => Http::response([
            'content' => [['type' => 'tool_use', 'name' => 'submit_result', 'input' => ['results' => $results]]],
            'usage' => ['input_tokens' => 10, 'output_tokens' => 5],
        ])]);
    }

    public function test_ai_disabled_without_key(): void
    {
        config(['cv.anthropic.key' => null]);
        User::factory()->create();
        $this->getJson('/api/ai/status')->assertOk()->assertJson(['enabled' => false]);
        $this->postJson('/api/ai/suggest', ['participantIds' => [(string) \Str::uuid()], 'tasks' => ['katakana']])->assertStatus(503);
    }

    public function test_katakana_and_equivalent_are_validated_and_formatted(): void
    {
        config(['cv.anthropic.key' => 'test']);
        $tasks = new AiTasks(new ClaudeClient());
        $participants = ['p1' => ['nama_romaji' => 'Retno Wulandari', 'keluarga_1_nama' => 'Slamet', 'keluarga_1_pekerjaan' => 'Pensiun', 'kelebihan' => 'tidak ada']];

        $c = $tasks->collect($participants, ['katakana', 'equivalent', 'translate']);
        $this->assertSame('特にありません。', collect($c['local'])->firstWhere('field', 'kelebihan')['suggested']);

        $ids = collect($c['items'])->pluck('id', 'field');
        Http::fake(['api.anthropic.com/*' => Http::sequence()
            ->push(['content' => [['type' => 'tool_use', 'input' => ['results' => [
                ['id' => $ids['nama_katakana'], 'value' => 'レトノ ウランダリ'],
                ['id' => $ids['keluarga_1_nama'], 'value' => 'English text']]]]], 'usage' => ['input_tokens' => 1, 'output_tokens' => 1]])
            ->push(['content' => [['type' => 'tool_use', 'input' => ['results' => [
                ['id' => $ids['keluarga_1_pekerjaan'], 'value' => '年金生活']]]]], 'usage' => ['input_tokens' => 1, 'output_tokens' => 1]])]);

        $out = collect($tasks->run($c['items'])['suggestions']);
        $this->assertSame("レトノ\u{3000}ウランダリ", $out->firstWhere('field', 'nama_katakana')['suggested']);
        $this->assertNull($out->firstWhere('field', 'keluarga_1_nama')['suggested']);           // bukan katakana → ditolak
        $this->assertSame('PENSIUN 年金生活', $out->firstWhere('field', 'keluarga_1_pekerjaan')['suggested']);
    }

    public function test_suggest_job_stores_original_and_ai_version(): void
    {
        config(['cv.anthropic.key' => 'test', 'queue.default' => 'sync']);
        $u = User::factory()->create();
        $p = Participant::create(['user_id' => $u->id, 'data' => ['nama_romaji' => 'Retno'], 'expires_at' => now()->addHour()]);
        $this->fakeClaude([['id' => 'i0', 'value' => 'レトノ']]);

        $id = $this->postJson('/api/ai/suggest', ['participantIds' => [$p->id], 'tasks' => ['katakana']])->assertStatus(202)->json('jobId');
        $res = $this->getJson("/api/ai/jobs/{$id}")->assertOk()->json();
        $this->assertSame('done', $res['status']);
        $s = $res['result']['suggestions'][0];
        $this->assertSame('suggested', $s['status']);
        $this->assertSame('Retno', $s['original']);
        $this->assertSame("レトノ", $s['suggested']);
        $this->assertStringNotContainsString('sk-', json_encode($res));                           // tidak ada key di respons
    }
}
