<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ai_runs', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('kind');                       // suggest | import
            $t->string('status')->default('queued');  // queued/processing/done/failed
            $t->json('input')->nullable();            // hanya id/jenis tugas, bukan data pribadi
            $t->longText('result')->nullable();       // terenkripsi: versi asli + versi AI
            $t->string('file_path')->nullable();      // PDF sumber (impor)
            $t->string('photo_path')->nullable();     // foto hasil ekstraksi
            $t->unsignedInteger('tokens_in')->default(0);
            $t->unsignedInteger('tokens_out')->default(0);
            $t->text('error')->nullable();
            $t->timestamp('expires_at')->index();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_runs');
    }
};
