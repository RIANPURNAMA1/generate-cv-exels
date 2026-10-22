<?php

namespace App\Jobs;

use App\Models\AiRun;
use App\Services\Ai\AiTasks;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;

class ImportPdfJob implements ShouldQueue
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
        $disk = Storage::disk('local');
        try {
            $res = $ai->importPdf(
                $disk->get($run->file_path),
                $run->input['provider'] ?? null,
                $run->input['model'] ?? null,
            );
            $warnings = $res['warnings'];

            $photoRel = $this->extractPhoto($disk->path($run->file_path), $run->id);
            if (!$photoRel) {
                $warnings[] = 'Foto tidak ditemukan di PDF.';
            }
            $run->update([
                'status' => 'done', 'photo_path' => $photoRel,
                'result' => ['fields' => $res['fields'], 'warnings' => $warnings, 'hasPhoto' => (bool) $photoRel],
                'tokens_in' => $res['tokens_in'], 'tokens_out' => $res['tokens_out'],
            ]);
        } catch (Throwable $e) {
            Log::warning('ai_import_failed', ['run' => $run->id, 'class' => get_class($e), 'message' => $e->getMessage()]);
            // Pesan dari lapisan AI aman ditampilkan (tanpa kunci API); galat lain disamarkan.
            $error = $e instanceof RuntimeException && $e->getMessage() !== ''
                ? mb_substr($e->getMessage(), 0, 200)
                : 'Impor PDF gagal.';
            $run->update(['status' => 'failed', 'error' => $error]);
        } finally {
            $disk->delete($run->file_path); // PDF sumber tidak disimpan lebih lama dari perlu
        }
    }

    /** Ekstrak gambar terbesar dengan pdfimages (poppler), pilih yang rasio mendekati potret. */
    private function extractPhoto(string $pdfAbs, string $runId): ?string
    {
        $tmp = sys_get_temp_dir() . '/pdfimg_' . bin2hex(random_bytes(6));
        mkdir($tmp, 0700, true);
        try {
            $p = new Process(['pdfimages', '-png', '-l', '2', $pdfAbs, $tmp . '/img']);
            $p->setTimeout(30);
            $p->run();
            $best = null;
            $bestScore = 0;
            foreach (glob($tmp . '/img-*.png') ?: [] as $f) {
                $size = @getimagesize($f);
                if (!$size) {
                    continue;
                }
                [$w, $h] = $size;
                if ($w < 80 || $h < 80) {
                    continue;
                }
                $ratio = $w / $h;
                if ($ratio < 0.5 || $ratio > 1.0) { // foto 3:4 / 4:6, bukan banner/logo lebar
                    continue;
                }
                if ($w * $h > $bestScore) {
                    $best = $f;
                    $bestScore = $w * $h;
                }
            }
            if (!$best) {
                return null;
            }
            $rel = "photos/import_{$runId}.jpg";
            \App\Services\PhotoProcessor::process($best, Storage::disk('local')->path($rel));
            return $rel;
        } finally {
            foreach (glob($tmp . '/*') ?: [] as $f) {
                @unlink($f);
            }
            @rmdir($tmp);
        }
    }
}
