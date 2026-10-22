<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/** Klien Gemini (Google AI Studio). Keluaran terstruktur lewat responseSchema. */
class GeminiClient implements AiClientInterface
{
    public function __construct(
        public readonly string $key = '',
        public readonly string $model = 'gemini-2.0-flash',
        public readonly string $baseUrl = 'https://generativelanguage.googleapis.com',
        public readonly int $timeout = 90,
    ) {
    }

    public function id(): string
    {
        return 'gemini';
    }

    public function label(): string
    {
        return 'Gemini (Google)';
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
            throw new RuntimeException('Kunci API Gemini belum diatur.');
        }
        $parts = [];
        foreach ($content as $c) {
            if (($c['type'] ?? '') === 'pdf') {
                $parts[] = ['inline_data' => ['mime_type' => 'application/pdf', 'data' => (string) ($c['data'] ?? '')]];
            } else {
                $parts[] = ['text' => (string) ($c['text'] ?? '')];
            }
        }

        $url = rtrim($this->baseUrl, '/') . '/v1beta/models/' . rawurlencode($this->model) . ':generateContent';
        $resp = $this->post($url, $system, $parts, $schema, $maxTokens);
        $usedModel = $this->model;

        // Nama model tampilan (mis. "Gemini 3.1 Flash-Lite") ditolak API: coba versi id.
        if ($resp->failed() && $this->looksLikeModelNameError($resp->json())) {
            $normalized = self::normalizeModelId($this->model);
            if ($normalized !== $this->model) {
                Log::info('gemini_model_normalized', ['from' => $this->model, 'to' => $normalized]);
                $resp = $this->post($url, $system, $parts, $schema, $maxTokens, $normalized);
                $usedModel = $normalized;
            }
        }

        if ($resp->failed()) {
            Log::warning('gemini_request_failed', ['status' => $resp->status(), 'model' => $usedModel]);
            throw new RuntimeException(self::errorMessage($resp->json(), 'Permintaan ke layanan AI gagal.'));
        }
        $json = $resp->json();
        $tokensIn = (int) ($json['usageMetadata']['promptTokenCount'] ?? 0);
        $tokensOut = (int) ($json['usageMetadata']['candidatesTokenCount'] ?? 0);
        Log::info('gemini_usage', ['in' => $tokensIn, 'out' => $tokensOut]);

        $text = '';
        foreach ($json['candidates'][0]['content']['parts'] ?? [] as $part) {
            if (is_string($part['text'] ?? null)) {
                $text .= $part['text'];
            }
        }
        $decoded = OpenAiClient::decodeJson($text);
        if ($decoded === null) {
            throw new RuntimeException('Respons AI tidak berisi hasil terstruktur.');
        }
        return ['input' => $decoded, 'tokens_in' => $tokensIn, 'tokens_out' => $tokensOut];
    }

    /** @param array<int,array<string,mixed>> $parts */
    private function post(string $url, string $system, array $parts, array $schema, int $maxTokens, ?string $model = null)
    {
        $model = $model ?? $this->model;
        $endpoint = rtrim($this->baseUrl, '/') . '/v1beta/models/' . rawurlencode($model) . ':generateContent';
        return Http::timeout($this->timeout)
            ->retry(2, 1500, fn ($e) => $e instanceof ConnectionException
                || ($e instanceof RequestException && in_array($e->response->status(), [429, 500, 502, 503, 504], true)), throw: false)
            ->post($endpoint . '?key=' . urlencode($this->key), [
                'systemInstruction' => ['parts' => [['text' => $system]]],
                'contents' => [['role' => 'user', 'parts' => $parts]],
                'generationConfig' => [
                    'responseMimeType' => 'application/json',
                    'responseSchema' => self::sanitizeSchema($schema),
                    'maxOutputTokens' => $maxTokens,
                ],
            ]);
    }

    /** Nama model tampilan -> id API: "Gemini 3.1 Flash-Lite" => "gemini-3.1-flash-lite". */
    public static function normalizeModelId(string $model): string
    {
        $m = strtolower(trim($model));
        return preg_replace('/\s+/', '-', $m) ?? $m;
    }

    private function looksLikeModelNameError(?array $json): bool
    {
        $msg = strtolower((string) ($json['error']['message'] ?? ''));
        return str_contains($msg, 'model name') || str_contains($msg, 'unexpected model');
    }

    /** Pesan error penyedia (tanpa membocorkan kunci API). */
    public static function errorMessage(?array $json, string $fallback): string
    {
        $msg = trim((string) ($json['error']['message'] ?? ''));
        return $msg === '' ? $fallback : mb_substr($msg, 0, 300);
    }

    /**
     * Gemini hanya menerima subset JSON Schema. Buang kata kunci yang tidak didukung.
     */
    public static function sanitizeSchema(array $schema): array
    {
        $unsupported = ['additionalProperties', '$schema', '$id', '$defs', 'definitions', 'const', 'default', 'examples', 'patternProperties', 'additionalItems', 'allOf', 'anyOf', 'oneOf', 'not', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf'];
        $clean = function (array $node) use (&$clean, $unsupported): array {
            $out = [];
            foreach ($node as $k => $v) {
                if (in_array($k, $unsupported, true)) {
                    continue;
                }
                if (is_array($v)) {
                    $out[$k] = array_is_list($v) ? array_map(fn ($x) => is_array($x) ? $clean($x) : $x, $v) : $clean($v);
                } else {
                    $out[$k] = $v;
                }
            }
            return $out;
        };
        return $clean($schema);
    }
}
