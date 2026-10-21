<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/** Klien Claude API (hanya backend). Memaksa keluaran terstruktur lewat tool_choice. */
class ClaudeClient
{
    public static function enabled(): bool
    {
        return (string) config('cv.anthropic.key') !== '';
    }

    /**
     * @param  array<int,array<string,mixed>>  $content  blok konten user (text/document)
     * @param  array<string,mixed>             $schema   JSON Schema objek untuk input tool
     * @return array{input:array<string,mixed>, tokens_in:int, tokens_out:int}
     */
    public function structured(string $system, array $content, array $schema, int $maxTokens = 4096): array
    {
        if (!self::enabled()) {
            throw new RuntimeException('Langkah AI tidak aktif.');
        }
        $resp = Http::withHeaders([
            'x-api-key' => config('cv.anthropic.key'),
            'anthropic-version' => '2023-06-01',
        ])->timeout((int) config('cv.anthropic.timeout', 60))
            ->retry(2, 1500, fn ($e) => $e instanceof ConnectionException
                || ($e instanceof RequestException && in_array($e->response->status(), [429, 500, 502, 503, 529], true)), throw: false)
            ->post('https://api.anthropic.com/v1/messages', [
                'model' => config('cv.anthropic.model'),
                'max_tokens' => $maxTokens,
                'system' => $system,
                'tools' => [['name' => 'submit_result', 'description' => 'Kirim hasil akhir sesuai skema.', 'input_schema' => $schema]],
                'tool_choice' => ['type' => 'tool', 'name' => 'submit_result'],
                'messages' => [['role' => 'user', 'content' => $content]],
            ]);

        if ($resp->failed()) {
            // Jangan mencatat isi permintaan/respons: hanya status.
            Log::warning('claude_request_failed', ['status' => $resp->status()]);
            throw new RuntimeException('Permintaan ke layanan AI gagal.');
        }
        $json = $resp->json();
        $tokensIn = (int) ($json['usage']['input_tokens'] ?? 0);
        $tokensOut = (int) ($json['usage']['output_tokens'] ?? 0);
        Log::info('claude_usage', ['in' => $tokensIn, 'out' => $tokensOut]);

        foreach ($json['content'] ?? [] as $block) {
            if (($block['type'] ?? '') === 'tool_use' && is_array($block['input'] ?? null)) {
                return ['input' => $block['input'], 'tokens_in' => $tokensIn, 'tokens_out' => $tokensOut];
            }
        }
        throw new RuntimeException('Respons AI tidak berisi hasil terstruktur.');
    }
}
