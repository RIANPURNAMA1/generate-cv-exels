<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/** Klien Claude API (Anthropic). Memaksa keluaran terstruktur lewat tool_choice. */
class ClaudeClient implements AiClientInterface
{
    public function __construct(
        public readonly string $key = '',
        public readonly string $model = 'claude-sonnet-5-5',
        public readonly string $baseUrl = 'https://api.anthropic.com',
        public readonly int $timeout = 90,
    ) {
    }

    public function id(): string
    {
        return 'claude';
    }

    public function label(): string
    {
        return 'Claude (Anthropic)';
    }

    public function model(): string
    {
        return $this->model;
    }

    public function supportsNativePdf(): bool
    {
        return true;
    }

    /**
     * @param  array<int,array<string,mixed>>  $content
     * @param  array<string,mixed>             $schema
     * @return array{input:array<string,mixed>, tokens_in:int, tokens_out:int}
     */
    public function structured(string $system, array $content, array $schema, int $maxTokens = 4096): array
    {
        if ($this->key === '') {
            throw new RuntimeException('Kunci API Claude belum diatur.');
        }
        $blocks = [];
        foreach ($content as $c) {
            if (($c['type'] ?? '') === 'pdf') {
                $blocks[] = ['type' => 'document', 'source' => ['type' => 'base64', 'media_type' => 'application/pdf', 'data' => (string) ($c['data'] ?? '')]];
            } else {
                $blocks[] = ['type' => 'text', 'text' => (string) ($c['text'] ?? '')];
            }
        }

        $resp = Http::withHeaders([
            'x-api-key' => $this->key,
            'anthropic-version' => '2023-06-01',
        ])->timeout($this->timeout)
            ->retry(2, 1500, fn ($e) => $e instanceof ConnectionException
                || ($e instanceof RequestException && in_array($e->response->status(), [429, 500, 502, 503, 529], true)), throw: false)
            ->post(rtrim($this->baseUrl, '/') . '/v1/messages', [
                'model' => $this->model,
                'max_tokens' => $maxTokens,
                'system' => $system,
                'tools' => [['name' => 'submit_result', 'description' => 'Kirim hasil akhir sesuai skema.', 'input_schema' => $schema]],
                'tool_choice' => ['type' => 'tool', 'name' => 'submit_result'],
                'messages' => [['role' => 'user', 'content' => $blocks]],
            ]);

        if ($resp->failed()) {
            // Jangan mencatat isi permintaan/respons: hanya status dan pesan penyedia.
            Log::warning('claude_request_failed', ['status' => $resp->status(), 'model' => $this->model]);
            throw new RuntimeException(GeminiClient::errorMessage($resp->json(), 'Permintaan ke layanan AI gagal.'));
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
