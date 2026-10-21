<?php

namespace App\Services;

use App\Models\AiRun;
use App\Models\Dataset;
use App\Models\GenerationItem;
use App\Models\GenerationJob;
use App\Models\Participant;
use Illuminate\Support\Facades\Storage;

/** Menghapus data peserta, foto, dataset, dan hasil. Template tidak ikut dihapus. */
class Purger
{
    public function purgeExpired(): int
    {
        $n = 0;
        $n += $this->participants(Participant::where('expires_at', '<', now()));
        foreach (Dataset::where('expires_at', '<', now())->get() as $d) {
            Storage::disk('local')->delete($d->file_path);
            $d->delete();
            $n++;
        }
        foreach (GenerationJob::where('expires_at', '<', now())->get() as $j) {
            $this->job($j);
            $n++;
        }
        foreach (AiRun::where('expires_at', '<', now())->get() as $a) {
            $this->aiRun($a);
            $n++;
        }
        return $n;
    }

    public function purgeUser(int $userId): void
    {
        $this->participants(Participant::where('user_id', $userId));
        foreach (Dataset::where('user_id', $userId)->get() as $d) {
            Storage::disk('local')->delete($d->file_path);
            $d->delete();
        }
        foreach (GenerationJob::where('user_id', $userId)->get() as $j) {
            $this->job($j);
        }
        foreach (AiRun::where('user_id', $userId)->get() as $a) {
            $this->aiRun($a);
        }
    }

    private function aiRun(AiRun $a): void
    {
        foreach ([$a->file_path, $a->photo_path] as $f) {
            if ($f) {
                Storage::disk('local')->delete($f);
            }
        }
        $a->delete();
    }

    private function participants($query): int
    {
        $n = 0;
        foreach ($query->get() as $p) {
            if ($p->photo_path) {
                Storage::disk('local')->delete($p->photo_path);
            }
            $p->delete();
            $n++;
        }
        return $n;
    }

    private function job(GenerationJob $j): void
    {
        Storage::disk('local')->deleteDirectory("results/{$j->id}");
        GenerationItem::where('job_id', $j->id)->delete();
        $j->delete();
    }
}
