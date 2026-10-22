<?php

namespace App\Services\Ai;

/**
 * Kontrak umum untuk penyedia AI (Claude, GPT, Gemini).
 *
 * Format konten internal (bukan format API salah satu penyedia):
 *   ['type' => 'text', 'text' => '...']
 *   ['type' => 'pdf',  'data' => '<base64>']
 * Setiap klien menerjemahkannya ke format API-nya sendiri.
 */
interface AiClientInterface
{
    /** Id penyedia: claude | openai | gemini. */
    public function id(): string;

    /** Nama yang tampil di antarmuka. */
    public function label(): string;

    /** Model yang sedang dipakai. */
    public function model(): string;

    /** True bila API penyedia bisa menerima berkas PDF secara native. */
    public function supportsNativePdf(): bool;

    /**
     * Minta keluaran terstruktur sesuai JSON Schema.
     *
     * @param  array<int,array<string,mixed>>  $content  blok konten (text/pdf)
     * @param  array<string,mixed>             $schema   JSON Schema objek
     * @return array{input:array<string,mixed>, tokens_in:int, tokens_out:int}
     */
    public function structured(string $system, array $content, array $schema, int $maxTokens = 4096): array;
}
