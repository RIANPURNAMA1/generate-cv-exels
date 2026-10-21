<?php

namespace Tests\Feature;

use App\Models\GenerationItem;
use App\Models\GenerationJob;
use App\Models\Participant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class FileAndPurgeTest extends TestCase
{
    use RefreshDatabase;

    private function makeJob(User $owner): array
    {
        Storage::fake('local');
        $job = GenerationJob::create(['user_id' => $owner->id, 'template_id' => (string) \Str::uuid(), 'options' => [], 'mapping' => [], 'status' => 'done', 'expires_at' => now()->addHour()]);
        $rel = "results/{$job->id}/CV_A.xlsx";
        Storage::disk('local')->put($rel, 'x');
        GenerationItem::create(['job_id' => $job->id, 'status' => 'done', 'participant_name' => 'A', 'xlsx_path' => $rel]);
        return [$job, $rel];
    }

    private function url(string $rel, int $uid, $ttl = null): string
    {
        return URL::temporarySignedRoute('files.download', $ttl ?? now()->addMinutes(15), ['path' => base64_encode($rel), 'u' => $uid]);
    }

    public function test_owner_can_download_via_signed_url(): void
    {
        $a = User::factory()->create();
        [, $rel] = $this->makeJob($a);
        $this->get($this->url($rel, $a->id))->assertOk();
    }

    public function test_other_user_is_rejected(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        [, $rel] = $this->makeJob($a);
        $this->get($this->url($rel, $b->id))->assertForbidden();   // URL valid tetapi bukan pemilik job
    }

    public function test_tampered_or_expired_signature_is_rejected(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        [, $rel] = $this->makeJob($a);
        $this->get(str_replace("u={$a->id}", "u={$b->id}", $this->url($rel, $a->id)))->assertForbidden();
        $this->get($this->url($rel, $a->id, now()->subMinute()))->assertForbidden();
    }

    public function test_purge_removes_expired_data_but_keeps_fresh(): void
    {
        Storage::fake('local');
        $u = User::factory()->create();
        Storage::disk('local')->put('photos/old.jpg', 'x');
        $old = Participant::create(['user_id' => $u->id, 'data' => ['nama_romaji' => 'Lama'], 'photo_path' => 'photos/old.jpg', 'expires_at' => now()->subMinute()]);
        $new = Participant::create(['user_id' => $u->id, 'data' => ['nama_romaji' => 'Baru'], 'expires_at' => now()->addHours(2)]);
        [$job] = $this->makeJob($u);
        $job->update(['expires_at' => now()->subMinute()]);

        $this->artisan('cv:purge')->assertExitCode(0);

        $this->assertNull(Participant::find($old->id));
        $this->assertNotNull(Participant::find($new->id));
        Storage::disk('local')->assertMissing('photos/old.jpg');
        $this->assertNull(GenerationJob::find($job->id));
        $this->assertDatabaseCount('generation_items', 0);
    }

    public function test_participant_data_is_encrypted_at_rest(): void
    {
        $u = User::factory()->create();
        $p = Participant::create(['user_id' => $u->id, 'data' => ['nama_romaji' => 'RAHASIA'], 'expires_at' => now()->addHour()]);
        $raw = \DB::table('participants')->where('id', $p->id)->value('data');
        $this->assertStringNotContainsString('RAHASIA', $raw);
    }

    public function test_pdf_is_single_page_when_soffice_available(): void
    {
        if (!shell_exec('command -v soffice') || !shell_exec('command -v pdfinfo')) {
            $this->markTestSkipped('soffice/pdfinfo tidak tersedia.');
        }
        $dir = sys_get_temp_dir() . '/cvpdf_' . bin2hex(random_bytes(4));
        mkdir($dir);
        $tpl = "$dir/t.xlsx";
        $this->artisan('template:generate-sample', ['--path' => $tpl]);
        $fx = require base_path('tests/fixtures/participants.php');
        (new \App\Services\TemplateRenderer())->render($tpl, $fx['lengkap'], [], [], null, "$dir/o.xlsx");
        $pdf = (new \App\Services\PdfConverter())->convert("$dir/o.xlsx", $dir);
        $this->assertMatchesRegularExpression('/Pages:\s+1\b/', shell_exec('pdfinfo ' . escapeshellarg($pdf)));
    }
}
