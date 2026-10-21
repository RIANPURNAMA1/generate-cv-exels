<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessGenerationJob;
use App\Models\GenerationItem;
use App\Models\GenerationJob;
use App\Models\Participant;
use App\Models\Template;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class GenerateController extends Controller
{
    public function store(Request $r)
    {
        $d = $r->validate([
            'templateId' => 'required|uuid',
            'datasetId' => 'nullable|uuid',
            'participantIds' => 'nullable|array|max:500',
            'participantIds.*' => 'uuid',
            'mapping' => 'nullable|array',
            'mapping.*' => 'string|max:100',
            'options' => 'nullable|array',
            'options.pdf' => 'boolean', 'options.normalizePhone' => 'boolean',
            'options.autoAge' => 'boolean', 'options.jpDate' => 'boolean',
        ]);
        $uid = app_user_id();
        Template::where('user_id', $uid)->findOrFail($d['templateId']);

        $q = Participant::where('user_id', $uid);
        if (!empty($d['participantIds'])) {
            $q->whereIn('id', $d['participantIds']);
        } elseif (!empty($d['datasetId'])) {
            $q->where('dataset_id', $d['datasetId']);
        } else {
            return response()->json(['message' => 'Pilih dataset atau peserta.'], 422);
        }
        $ids = $q->pluck('id');
        if ($ids->isEmpty()) {
            return response()->json(['message' => 'Peserta tidak ditemukan.'], 422);
        }

        $job = GenerationJob::create([
            'user_id' => $uid, 'template_id' => $d['templateId'],
            'options' => $d['options'] ?? [], 'mapping' => $d['mapping'] ?? [],
            'status' => 'queued', 'expires_at' => now()->addHours((int) config('cv.retention_hours', 24)),
        ]);
        foreach ($ids as $pid) {
            GenerationItem::create(['job_id' => $job->id, 'participant_id' => $pid, 'status' => 'queued']);
        }
        ProcessGenerationJob::dispatch($job->id);

        return response()->json(['jobId' => $job->id], 202);
    }

    public function show(Request $r, string $id)
    {
        $job = GenerationJob::where('user_id', app_user_id())->with('items')->findOrFail($id);
        $sign = fn (?string $path) => $path ? URL::temporarySignedRoute('files.download', now()->addMinutes(15), ['path' => base64_encode($path), 'u' => app_user_id()]) : null;

        return [
            'status' => $job->status,
            'items' => $job->items->map(fn ($i) => [
                'participantName' => $i->participant_name ?? '—',
                'status' => $i->status,
                'warnings' => $i->warnings ?? [],
                'error' => $i->error,
                'xlsxUrl' => $sign($i->xlsx_path),
                'pdfUrl' => $sign($i->pdf_path),
            ]),
            'zipUrl' => $sign($job->zip_path),
        ];
    }
}
