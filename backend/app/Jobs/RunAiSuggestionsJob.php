<?php

namespace App\Jobs;

use App\Models\AiRun;
use App\Models\Participant;
use App\Services\Ai\AiTasks;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class RunAiSuggestionsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 1;
    public int $timeout = 300;

    public function __construct(public string $runId)
    {
    }

    public function handle(AiTasks $ai): void
    {
        $run = AiRun::findOrFail($this->runId);
        $run->update(['status' => 'processing']);
        try {
            $ids = $run->input['participantIds'] ?? [];
            $tasks = $run->input['tasks'] ?? [];
            $participants = Participant::where('user_id', $run->user_id)->whereIn('id', $ids)->get()->mapWithKeys(fn ($p) => [$p->id => $p->data ?? []])->all();

            $c = $ai->collect($participants, $tasks);
            $provider = $run->input['provider'] ?? null;
            $model = $run->input['model'] ?? null;
            $r = $c['items'] ? $ai->run($c['items'], $provider, $model) : ['suggestions' => [], 'tokens_in' => 0, 'tokens_out' => 0];
            $all = array_merge($c['local'], $r['suggestions']);

            // Simpan versi asli dan versi AI. Setiap saran berstatus "Disarankan AI" sampai pengguna memutuskan.
            $run->update([
                'status' => 'done',
                'result' => ['suggestions' => array_map(fn ($s) => $s + ['status' => 'suggested'], $all)],
                'tokens_in' => $r['tokens_in'], 'tokens_out' => $r['tokens_out'],
            ]);
        } catch (Throwable $e) {
            Log::warning('ai_run_failed', ['run' => $run->id, 'class' => get_class($e), 'message' => $e->getMessage()]);
            $error = $e instanceof RuntimeException && $e->getMessage() !== ''
                ? mb_substr($e->getMessage(), 0, 200)
                : 'Saran AI gagal dibuat. Coba lagi nanti.';
            $run->update(['status' => 'failed', 'error' => $error]);
        }
    }
}
