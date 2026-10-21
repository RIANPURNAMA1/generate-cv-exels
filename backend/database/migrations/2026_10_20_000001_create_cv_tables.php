<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('templates', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('name');
            $t->string('file_path');
            $t->json('placeholders');
            $t->char('sha256', 64);
            $t->timestamps();
        });

        Schema::create('datasets', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('name');
            $t->json('columns');
            $t->unsignedInteger('row_count')->default(0);
            $t->string('file_path');
            $t->timestamp('expires_at')->index();
            $t->timestamps();
        });

        Schema::create('participants', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->uuid('dataset_id')->nullable()->index();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->longText('data');                // terenkripsi (cast encrypted:array)
            $t->string('photo_path')->nullable();
            $t->string('status')->default('ready');
            $t->timestamp('expires_at')->index();
            $t->timestamps();
        });

        Schema::create('generation_jobs', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->uuid('template_id');
            $t->json('options');
            $t->json('mapping');
            $t->string('status')->default('queued'); // queued/processing/done/failed/expired
            $t->string('zip_path')->nullable();
            $t->timestamp('expires_at')->index();
            $t->timestamps();
        });

        Schema::create('generation_items', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->uuid('job_id')->index();
            $t->uuid('participant_id')->nullable();
            $t->string('participant_name')->nullable();
            $t->string('status')->default('queued');
            $t->text('error')->nullable();
            $t->json('warnings')->nullable();
            $t->string('xlsx_path')->nullable();
            $t->string('pdf_path')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['generation_items', 'generation_jobs', 'participants', 'datasets', 'templates'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
