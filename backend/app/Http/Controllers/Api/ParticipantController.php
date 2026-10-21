<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiRun;
use App\Models\Participant;
use App\Support\UploadGuard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ParticipantController extends Controller
{
    public function store(Request $r)
    {
        $r->validate(['data' => 'required|array', 'foto' => 'nullable|file', 'importId' => 'nullable|uuid']);
        $p = new Participant(['user_id' => app_user_id(), 'data' => $this->clean($r->input('data')), 'expires_at' => now()->addHours((int) config('cv.retention_hours', 24))]);
        $this->savePhoto($r, $p);
        $this->attachImportPhoto($r, $p);
        $p->save();
        return response()->json(['id' => $p->id], 201);
    }

    public function update(Request $r, string $id)
    {
        $p = Participant::where('user_id', app_user_id())->findOrFail($id);
        $r->validate(['data' => 'nullable|array', 'foto' => 'nullable|file', 'importId' => 'nullable|uuid']);
        if ($r->has('data')) {
            $p->data = $this->clean($r->input('data'));
        }
        $this->savePhoto($r, $p);
        $this->attachImportPhoto($r, $p);
        $p->save();
        return response()->json(['id' => $p->id]);
    }

    public function destroy(Request $r, string $id)
    {
        $p = Participant::where('user_id', app_user_id())->findOrFail($id);
        if ($p->photo_path) {
            Storage::disk('local')->delete($p->photo_path);
        }
        $p->delete();
        return response()->noContent();
    }

    /** Hapus semua data sesi pengguna sekarang. */
    public function purgeMine(Request $r)
    {
        app(\App\Services\Purger::class)->purgeUser(app_user_id());
        return response()->noContent();
    }

    private function clean(array $data): array
    {
        $out = [];
        foreach ($data as $k => $v) {
            if (is_string($k) && preg_match('/^[a-z0-9_]+$/', $k) && (is_scalar($v) || $v === null)) {
                $out[$k] = is_string($v) ? trim($v) : $v;
            }
        }
        return $out;
    }

    /** Pasangkan foto hasil ekstraksi PDF (impor AI) milik pengguna ini. */
    private function attachImportPhoto(Request $r, Participant $p): void
    {
        if (!$r->filled('importId') || $r->file('foto')) {
            return;
        }
        $run = AiRun::where('user_id', app_user_id())->where('id', $r->input('importId'))->first();
        if ($run && $run->photo_path && Storage::disk('local')->exists($run->photo_path)) {
            $dest = 'photos/' . bin2hex(random_bytes(16)) . '.jpg';
            Storage::disk('local')->copy($run->photo_path, $dest);
            $p->photo_path = $dest;
        }
    }

    private function savePhoto(Request $r, Participant $p): void
    {
        if ($f = $r->file('foto')) {
            UploadGuard::photo($f);
            if ($p->photo_path) {
                Storage::disk('local')->delete($p->photo_path);
            }
            $p->photo_path = 'photos/' . bin2hex(random_bytes(16)) . '.' . strtolower($f->getClientOriginalExtension());
            Storage::disk('local')->putFileAs('photos', $f, basename($p->photo_path));
        }
    }
}
