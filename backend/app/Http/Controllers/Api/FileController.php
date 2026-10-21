<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GenerationItem;
use App\Models\GenerationJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FileController extends Controller
{
    /**
     * Rute ini memakai middleware 'signed' (tautan berumur 15 menit, tidak bisa diubah) tanpa header Bearer,
     * karena diklik langsung dari browser. Id pemilik ('u') ikut tertanda tangan dan harus sama dengan pemilik job.
     */
    public function download(Request $r, string $path)
    {
        $rel = base64_decode($path, true);
        abort_if($rel === false || str_contains($rel, '..') || !str_starts_with($rel, 'results/'), 404);
        $uid = (int) $r->query('u');

        $jobId = explode('/', $rel)[1] ?? '';
        $job = GenerationJob::where('id', $jobId)->where('user_id', $uid)->first();
        abort_unless($job, 403);

        $isZip = $job->zip_path === $rel;
        $isItem = GenerationItem::where('job_id', $job->id)->where(fn ($q) => $q->where('xlsx_path', $rel)->orWhere('pdf_path', $rel))->exists();
        abort_unless($isZip || $isItem, 404);
        abort_unless(Storage::disk('local')->exists($rel), 404);

        return Storage::disk('local')->download($rel, $this->friendly($rel, $job, $isZip));
    }

    private function friendly(string $rel, GenerationJob $job, bool $isZip): string
    {
        if ($isZip) {
            return 'CV_semua.zip';
        }
        $item = GenerationItem::where('job_id', $job->id)->where(fn ($q) => $q->where('xlsx_path', $rel)->orWhere('pdf_path', $rel))->first();
        $slug = \App\Support\Formatters::slug($item?->participant_name ?? 'peserta');
        return "CV_{$slug}." . pathinfo($rel, PATHINFO_EXTENSION);
    }
}
