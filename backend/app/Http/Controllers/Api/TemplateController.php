<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Template;
use App\Services\PlaceholderParser;
use App\Support\UploadGuard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TemplateController extends Controller
{
    public function index(Request $r)
    {
        return Template::where('user_id', app_user_id())->latest()->get(['id', 'name', 'placeholders', 'created_at']);
    }

    public function store(Request $r)
    {
        $r->validate(['file' => 'required|file', 'name' => 'nullable|string|max:120']);
        $file = $r->file('file');
        UploadGuard::xlsx($file);

        $rel = 'templates/' . bin2hex(random_bytes(16)) . '.xlsx';
        Storage::disk('local')->putFileAs('templates', $file, basename($rel));
        $abs = Storage::disk('local')->path($rel);

        try {
            $ss = PlaceholderParser::load($abs);
            $placeholders = PlaceholderParser::detect($ss);
            $ss->disconnectWorksheets();
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($rel);
            return response()->json(['message' => 'Template tidak dapat dibaca.'], 422);
        }

        $t = Template::create([
            'user_id' => app_user_id(),
            'name' => $r->input('name') ?: pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
            'file_path' => $rel,
            'placeholders' => $placeholders,
            'sha256' => hash_file('sha256', $abs),
        ]);

        return response()->json(['id' => $t->id, 'name' => $t->name, 'placeholders' => $placeholders], 201);
    }

    public function update(Request $r, string $id)
    {
        $t = Template::where('user_id', app_user_id())->findOrFail($id);
        $t->update($r->validate(['name' => 'required|string|max:120']));
        return $t->only('id', 'name');
    }

    public function destroy(Request $r, string $id)
    {
        $t = Template::where('user_id', app_user_id())->findOrFail($id);
        Storage::disk('local')->delete($t->file_path);
        $t->delete();
        return response()->noContent();
    }

    /** Template contoh (dibuat otomatis bila belum ada). */
    public function sampleTemplate()
    {
        $path = storage_path('app/samples/template_cv_placeholder.xlsx');
        if (!is_file($path)) {
            \Illuminate\Support\Facades\Artisan::call('template:generate-sample');
        }
        return response()->download($path, 'template_cv_placeholder.xlsx');
    }

    /** CSV contoh: satu baris header dari placeholder template (tanpa yang terhitung otomatis). */
    public function sampleData(Request $r, string $id)
    {
        $t = Template::where('user_id', app_user_id())->findOrFail($id);
        $catalog = config('cv_fields.fields');
        $cols = collect($t->placeholders)->pluck('name')
            ->reject(fn ($n) => $n === 'foto' || ($catalog[$n]['computed'] ?? false))
            ->when(collect($t->placeholders)->pluck('name')->contains('tanggal_lahir_jp'), fn ($c) => $c->prepend('tanggal_lahir'))
            ->unique()->values();

        return response()->streamDownload(function () use ($cols) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $cols->all());
            fclose($out);
        }, 'contoh_data_peserta.csv', ['Content-Type' => 'text/csv']);
    }
}
