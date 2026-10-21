<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ImportPdfJob;
use App\Jobs\RunAiSuggestionsJob;
use App\Models\AiRun;
use App\Models\Participant;
use App\Services\Ai\ClaudeClient;
use App\Support\UploadGuard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AiController extends Controller
{
    /** Hanya status aktif/nonaktif. API key tidak pernah dikirim ke frontend. */
    public function status()
    {
        return ['enabled' => ClaudeClient::enabled()];
    }

    private function guard()
    {
        return ClaudeClient::enabled() ? null : response()->json(['message' => 'Langkah AI belum diaktifkan (ANTHROPIC_API_KEY kosong).'], 503);
    }

    public function suggest(Request $r)
    {
        if ($resp = $this->guard()) {
            return $resp;
        }
        $d = $r->validate([
            'participantIds' => 'required|array|min:1|max:200', 'participantIds.*' => 'uuid',
            'tasks' => 'required|array|min:1', 'tasks.*' => 'in:katakana,translate,equivalent',
        ]);
        $owned = Participant::where('user_id', app_user_id())->whereIn('id', $d['participantIds'])->pluck('id')->all();
        abort_if(count($owned) === 0, 422, 'Peserta tidak ditemukan.');

        $run = AiRun::create([
            'user_id' => app_user_id(), 'kind' => 'suggest', 'status' => 'queued',
            'input' => ['participantIds' => $owned, 'tasks' => array_values(array_unique($d['tasks']))],
            'expires_at' => now()->addHours((int) config('cv.retention_hours', 24)),
        ]);
        RunAiSuggestionsJob::dispatch($run->id);
        return response()->json(['jobId' => $run->id], 202);
    }

    /** Impor PDF CV lama. Berjalan lewat antrean; hasil diambil dari GET /ai/jobs/{id}. */
    public function importPdf(Request $r)
    {
        if ($resp = $this->guard()) {
            return $resp;
        }
        $r->validate(['file' => 'required|file']);
        $f = $r->file('file');
        UploadGuard::pdf($f);
        $rel = 'imports/' . bin2hex(random_bytes(16)) . '.pdf';
        Storage::disk('local')->putFileAs('imports', $f, basename($rel));
        $run = AiRun::create([
            'user_id' => app_user_id(), 'kind' => 'import', 'status' => 'queued', 'file_path' => $rel,
            'expires_at' => now()->addHours((int) config('cv.retention_hours', 24)),
        ]);
        ImportPdfJob::dispatch($run->id);
        return response()->json(['jobId' => $run->id], 202);
    }

    public function show(Request $r, string $id)
    {
        $run = AiRun::where('user_id', app_user_id())->findOrFail($id);
        return [
            'kind' => $run->kind, 'status' => $run->status, 'error' => $run->error,
            'result' => $run->status === 'done' ? $run->result : null,
        ];
    }

    public function photo(Request $r, string $id)
    {
        $run = AiRun::where('user_id', app_user_id())->findOrFail($id);
        abort_unless($run->photo_path && Storage::disk('local')->exists($run->photo_path), 404);
        return response()->file(Storage::disk('local')->path($run->photo_path), ['Content-Type' => 'image/jpeg', 'Cache-Control' => 'no-store']);
    }
}
