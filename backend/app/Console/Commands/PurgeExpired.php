<?php

namespace App\Console\Commands;

use App\Services\Purger;
use Illuminate\Console\Command;

class PurgeExpired extends Command
{
    protected $signature = 'cv:purge';
    protected $description = 'Hapus data peserta, foto, dataset, dan hasil yang melewati masa retensi';

    public function handle(Purger $p): int
    {
        $this->info('Dihapus: ' . $p->purgeExpired() . ' entri');
        return self::SUCCESS;
    }
}
