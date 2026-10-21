<?php

namespace App\Jobs;

use App\Models\GenerationItem;
use App\Models\GenerationJob;
use App\Models\Participant;
use App\Models\Template;
use App\Services\PdfConverter;
use App\Services\TemplateRenderer;
use App\Support\Formatters;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;
use ZipArchive;

class ProcessGenerationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 600;

    public function __construct(public string $jobId)
    {
    }

    public function handle(TemplateRenderer $renderer, PdfConverter $pdf): void
    {
        $job = GenerationJob::findOrFail($this->jobId);
        $job->update(['status' => 'processing']);
        $template = Template::findOrFail($job->template_id);
        $disk = Storage::disk('local'); // disk privat
        $templatePath = $disk->path($template->file_path);
        $dir = "results/{$job->id}";
        $disk->makeDirectory($dir);

        $options = $job->options ?? [];
        $zipFiles = [];

        foreach ($job->items()->get() as $item) {
            $item->update(['status' => 'processing']);
            try {
                $participant = Participant::findOrFail($item->participant_id);
                $data = $participant->data ?? [];
                $name = (string) ($data[$job->mapping['nama_romaji'] ?? 'nama_romaji'] ?? 'peserta');
                $slug = Formatters::slug($name);
                $xlsxRel = "{$dir}/CV_{$slug}_" . substr($item->id, 0, 6) . '.xlsx';

                $photo = $participant->photo_path ? $disk->path($participant->photo_path) : null;
                $res = $renderer->render($templatePath, $data, $job->mapping ?? [], $options, $photo, $disk->path($xlsxRel));

                $pdfRel = null;
                if (!empty($options['pdf'])) {
                    $pdfAbs = $pdf->convert($disk->path($xlsxRel), $disk->path($dir));
                    $pdfRel = "{$dir}/" . basename($pdfAbs);
                }

                $item->update([
                    'status' => 'done',
                    'participant_name' => $res['participantName'],
                    'warnings' => $res['warnings'],
                    'xlsx_path' => $xlsxRel,
                    'pdf_path' => $pdfRel,
                ]);
                $base = "CV_{$slug}";
                for ($n = 2; isset($zipFiles["{$base}.xlsx"]); $n++) {
                    $base = "CV_{$slug}_{$n}";
                }
                $zipFiles["{$base}.xlsx"] = $xlsxRel;
                if ($pdfRel) {
                    $zipFiles["{$base}.pdf"] = $pdfRel;
                }
            } catch (Throwable $e) {
                // Log hanya ID dan status, tanpa isi data peserta.
                Log::warning('generation_item_failed', ['item' => $item->id, 'class' => get_class($e)]);
                $item->update(['status' => 'failed', 'error' => 'Gagal membuat CV untuk peserta ini.']);
            }
        }

        if (count($zipFiles) > 1) {
            $zipRel = "{$dir}/CV_semua.zip";
            $zip = new ZipArchive();
            $zip->open($disk->path($zipRel), ZipArchive::CREATE | ZipArchive::OVERWRITE);
            foreach ($zipFiles as $entry => $rel) {
                $zip->addFile($disk->path($rel), $entry);
            }
            $zip->close();
            $job->zip_path = $zipRel;
        }

        $job->status = $job->items()->where('status', 'done')->exists() ? 'done' : 'failed';
        $job->save();
    }
}
