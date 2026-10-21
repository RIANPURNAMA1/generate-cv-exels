<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dataset;
use App\Models\Participant;
use App\Support\UploadGuard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;

class DatasetController extends Controller
{
    public function store(Request $r)
    {
        $r->validate(['file' => 'required|file']);
        $file = $r->file('file');
        $ext = UploadGuard::csvOrXlsx($file);
        $hours = (int) config('cv.retention_hours', 24);

        $rel = 'datasets/' . bin2hex(random_bytes(16)) . '.' . $ext;
        Storage::disk('local')->putFileAs('datasets', $file, basename($rel));
        $abs = Storage::disk('local')->path($rel);

        $reader = IOFactory::createReader($ext === 'csv' ? 'Csv' : 'Xlsx');
        $reader->setReadDataOnly(true);
        $ss = $reader->load($abs);
        $rows = $ss->getActiveSheet()->toArray(null, false, false, false); // nilai mentah, tanpa menghitung formula
        $ss->disconnectWorksheets();

        $header = array_map(fn ($h) => trim((string) $h), array_shift($rows) ?? []);
        $columns = array_values(array_filter($header, fn ($h) => $h !== ''));
        $expires = now()->addHours($hours);

        $dataset = Dataset::create([
            'user_id' => app_user_id(), 'name' => $file->getClientOriginalName(), 'columns' => $columns,
            'row_count' => 0, 'file_path' => $rel, 'expires_at' => $expires,
        ]);

        $preview = [];
        $all = [];
        $count = 0;
        foreach ($rows as $row) {
            $assoc = [];
            foreach ($header as $i => $h) {
                if ($h !== '') {
                    $v = $row[$i] ?? null;
                    $assoc[$h] = is_string($v) ? trim($v) : $v;
                }
            }
            if (count(array_filter($assoc, fn ($v) => $v !== null && $v !== '')) === 0) {
                continue;
            }
            if ($count >= 500) {
                break; // batas 500 peserta per upload
            }
            $p = Participant::create([
                'dataset_id' => $dataset->id, 'user_id' => app_user_id(), 'data' => $assoc, 'expires_at' => $expires,
            ]);
            $all[] = ['participantId' => $p->id] + $assoc;
            if ($count < 20) {
                $preview[] = ['participantId' => $p->id] + $assoc;
            }
            $count++;
        }
        $dataset->update(['row_count' => $count]);

        return response()->json(['id' => $dataset->id, 'columns' => $columns, 'rows' => $preview, 'participants' => $all, 'rowCount' => $count], 201);
    }
}
