<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/** Klien GPT (OpenAI). Keluaran terstruktur lewat response_format json_schema. */
class OpenAiClient implements AiClientInterface
{
    public function __construct(
        public readonly string $key = '',
        public readonly string $model = 'gpt-4o-mini',
        public readonly string $baseUrl = 'https://api.openai.com',
        public readonly int $timeout = 90,
    ) {
    }

    public function id(): string
    {
        return 'openai';
    }

    public function label(): string
    {
        return 'GPT (OpenAI)';
    }

    public function model(): string
    {
        return $this->model;
    }

    public function supportsNativePdf(): bool
    {
        return false; // chat completions tidak menerima PDF; teks diekstrak di server.
    }

    /**
     * @param  array<int,array<string,mixed>>  $content
     * @param  array<string,mixed>             $schema
     * @return array{input:array<string,mixed>, tokens_in:int, tokens_out:int}
     */
    public function structured(string $system, array $content, array $schema, int $maxTokens = 4096): array
    {
        if ($this->key === '') {
            throw new RuntimeException('Kunci API OpenAI belum diatur.');
        }
        $parts = [];
        foreach ($content as $c) {
            if (($c['type'] ?? '') === 'pdf') {
                // Teks PDF sudah diekstrak lebih dulu (lihat PdfTextExtractor).
                continue;
            }
            $parts[] = ['type' => 'text', 'text' => (string) ($c['text'] ?? '')];
        }

        $resp = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->key,
        ])->timeout($this->timeout)
            ->retry(2, 1500, fn ($e) => $e instanceof ConnectionException
                || ($e instanceof RequestException && in_array($e->response->status(), [429, 500, 502, 503, 504], true)), throw: false)
            ->post(rtrim($this->baseUrl, '/') . '/v1/chat/completions', [
                'model' => $this->model,
                'max_tokens' => $maxTokens,
                'messages' => [
                    ['role' => 'system', 'content' => $system],
                    ['role' => 'user', 'content' => $parts],
                ],
                'response_format' => [
                    'type' => 'json_schema',
                    'json_schema' => ['name' => 'submit_result', 'strict' => false, 'schema' => $schema],
                ],
            ]);

        if ($resp->failed()) {
            Log::warning('openai_request_failed', ['status' => $resp->status(), 'model' => $this->model]);
            throw new RuntimeException(GeminiClient::errorMessage($resp->json(), 'Permintaan ke layanan AI gagal.'));
        }
        $json = $resp->json();
        $tokensIn = (int) ($json['usage']['prompt_tokens'] ?? 0);
        $tokensOut = (int) ($json['usage']['completion_tokens'] ?? 0);
        Log::info('openai_usage', ['in' => $tokensIn, 'out' => $tokensOut]);

        $message = $json['choices'][0]['message'] ?? [];
        if (($message['refusal'] ?? null) !== null) {
            throw new RuntimeException('Layanan AI menolak permintaan ini.');
        }
        $raw = is_string($message['content'] ?? null) ? $message['content'] : '';
        $decoded = self::decodeJson($raw);
        if ($decoded === null) {
            throw new RuntimeException('Respons AI tidak berisi hasil terstruktur.');
        }
        return ['input' => $decoded, 'tokens_in' => $tokensIn, 'tokens_out' => $tokensOut];
    }

    /** Ambil objek JSON dari teks; buang pagar markdown bila ada. */
    public static function decodeJson(string $raw): ?array
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }
        if (str_starts_with($raw, '```')) {
            $raw = preg_replace('/^```[a-zA-Z]*\s*/', '', $raw) ?? $raw;
            $raw = preg_replace('/\s*```$/', '', $raw) ?? $raw;
        }
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $decoded;
        }
        // Coba ambil objek pertama bila ada teks tambahan.
        if (preg_match('/\{.*\}/s', $raw, $m)) {
            $decoded = json_decode($m[0], true);
            return is_array($decoded) ? $decoded : null;
        }
        return null;
    }
}
