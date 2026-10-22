<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ai_settings', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('provider')->default('claude');   // claude | openai | gemini
            $t->string('model')->nullable();               // null = model bawaan penyedia
            $t->longText('api_keys')->nullable();          // terenkripsi: {claude:..., openai:..., gemini:...}
            $t->boolean('enabled')->default(true);
            $t->timestamps();
            $t->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_settings');
    }
};
