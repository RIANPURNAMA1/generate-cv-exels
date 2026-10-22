<?php

namespace App\Services\Ai;

use App\Models\AiSetting;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Pusat pengaturan AI: memilih penyedia (Claude / GPT / Gemini), model, dan kunci API.
 *
 * Kunci API dibaca dari pengaturan aplikasi (tabel ai_settings, terenkripsi) lalu
 * dari environment sebagai cadangan. Kunci tidak pernah dikirim ke frontend;
 * frontend hanya menerima status "ada kunci / belum ada".
 */
class AiProviderManager
{
    public const PROVIDERS = ['claude', 'openai', 'gemini'];

    /** Konfigurasi satu penyedia (tanpa kunci). */
    public function config(string $provider): array
    {
        $providers = config('cv.ai.providers', []);
        return is_array($providers[$provider] ?? null) ? $providers[$provider] : [];
    }

    public function label(string $provider): string
    {
        return (string) ($this->config($provider)['label'] ?? ucfirst($provider));
    }

    public function models(string $provider): array
    {
        $models = $this->config($provider)['models'] ?? [];
        return is_array($models) ? array_values($models) : [];
    }

    /** Baris pengaturan milik pengguna saat ini (dibuat bila belum ada). */
    public function setting(): AiSetting
    {
        $uid = app_user_id();
        $setting = AiSetting::firstOrNew(['user_id' => $uid]);
        if (! $setting->exists) {
            $setting->provider = (string) config('cv.ai.provider', 'claude');
            $setting->enabled = true;
            $setting->save();
        }
        return $setting;
    }

    /** Penyedia aktif: pilihan pengguna,/default environment, atau claude. */
    public function activeProvider(): string
    {
        $provider = (string) ($this->setting()->provider ?: config('cv.ai.provider', 'claude'));
        return in_array($provider, self::PROVIDERS, true) ? $provider : 'claude';
    }

    /** Model aktif untuk penyedia tertentu. */
    public function activeModel(?string $provider = null): string
    {
        $provider = $provider ?: $this->activeProvider();
        $model = trim((string) ($this->setting()->model ?? ''));
        if ($model !== '' && $provider === $this->activeProvider()) {
            return $model;
        }
        return (string) ($this->config($provider)['model'] ?? '');
    }

    /** Kunci API untuk penyedia: pengaturan aplikasi lebih dulu, lalu environment. */
    public function keyFor(string $provider): string
    {
        $keys = $this->setting()->api_keys ?? [];
        $fromDb = is_array($keys) ? trim((string) ($keys[$provider] ?? '')) : '';
        if ($fromDb !== '') {
            return $fromDb;
        }
        return trim((string) ($this->config($provider)['key'] ?? ''));
    }

    public function hasKey(string $provider): bool
    {
        return $this->keyFor($provider) !== '';
    }

    /** True bila AI aktif: pengaturan tidak dimatikan dan penyedia aktif punya kunci. */
    public function enabled(?string $provider = null): bool
    {
        if (! $this->setting()->enabled) {
            return false;
        }
        return $this->hasKey($provider ?: $this->activeProvider());
    }

    /** Buat klien untuk penyedia/model tertentu. */
    public function client(?string $provider = null, ?string $model = null): AiClientInterface
    {
        $provider = $provider ?: $this->activeProvider();
        if (! in_array($provider, self::PROVIDERS, true)) {
            throw new RuntimeException('Penyedia AI tidak dikenal.');
        }
        $key = $this->keyFor($provider);
        if ($key === '') {
            throw new RuntimeException('Kunci API untuk ' . $this->label($provider) . ' belum diatur.');
        }
        $model = $model && trim($model) !== '' ? trim($model) : $this->activeModel($provider);
        if ($provider === 'gemini') {
            // Gemini hanya menerima id model formal (huruf kecil, tanpa spasi).
            $normalized = GeminiClient::normalizeModelId($model);
            if ($normalized !== $model) {
                $model = $normalized;
                $this->persistModel($provider, $normalized);
            }
        }
        $timeout = (int) config('cv.ai.timeout', 90);
        $base = (string) ($this->config($provider)['base_url'] ?? '');

        return match ($provider) {
            'openai' => new OpenAiClient($key, $model, $base ?: 'https://api.openai.com', $timeout),
            'gemini' => new GeminiClient($key, $model, $base ?: 'https://generativelanguage.googleapis.com', $timeout),
            default => new ClaudeClient($key, $model, $base ?: 'https://api.anthropic.com', $timeout),
        };
    }

    /** Simpan ulang model hasil normalisasi (hanya bila nilai lama masih sama). */
    private function persistModel(string $provider, string $model): void
    {
        $setting = $this->setting();
        if ($setting->provider !== $provider) {
            return;
        }
        $setting->model = $model;
        $setting->save();
    }

    /** Ringkasan status untuk antarmuka (tanpa membocorkan kunci). */
    public function status(): array
    {
        $provider = $this->activeProvider();
        $providers = [];
        foreach (self::PROVIDERS as $id) {
            $providers[] = [
                'id' => $id,
                'label' => $this->label($id),
                'model' => $this->activeModel($id),
                'models' => $this->models($id),
                'hasKey' => $this->hasKey($id),
                'nativePdf' => (bool) ($this->config($id)['native_pdf'] ?? false),
            ];
        }
        return [
            'enabled' => $this->enabled(),
            'provider' => $provider,
            'providerLabel' => $this->label($provider),
            'model' => $this->activeModel(),
            'providers' => $providers,
            'reason' => $this->enabled() ? null : $this->reason(),
        ];
    }

    /** Alasan AI tidak aktif (untuk ditampilkan ke pengguna). */
    public function reason(): string
    {
        if (! $this->setting()->enabled) {
            return 'Langkah AI dimatikan pada pengaturan aplikasi.';
        }
        $provider = $this->activeProvider();
        return 'Kunci API untuk ' . $this->label($provider) . ' belum diatur.';
    }

    /**
     * Simpan perubahan pengaturan. Kunci API hanya disimpan bila diisi (kosong = biarkan).
     *
     * @param  array<string,mixed>  $data
     */
    public function update(array $data): array
    {
        $setting = $this->setting();
        if (isset($data['provider'])) {
            $provider = (string) $data['provider'];
            if (! in_array($provider, self::PROVIDERS, true)) {
                throw new RuntimeException('Penyedia AI tidak dikenal.');
            }
            $setting->provider = $provider;
            $setting->model = null; // model ikut kembali ke bawaan penyedia baru
        }
        if (array_key_exists('model', $data)) {
            $model = trim((string) ($data['model'] ?? ''));
            $setting->model = $model === '' ? null : $model;
        }
        if (array_key_exists('enabled', $data)) {
            $setting->enabled = (bool) $data['enabled'];
        }
        if (array_key_exists('apiKey', $data)) {
            $key = trim((string) ($data['apiKey'] ?? ''));
            if ($key !== '') {
                $keys = $setting->api_keys ?? [];
                $keys = is_array($keys) ? $keys : [];
                $keys[$setting->provider] = $key;
                $setting->api_keys = $keys;
            }
        }
        $setting->save();
        Log::info('ai_settings_updated', ['provider' => $setting->provider, 'has_key' => $this->hasKey($setting->provider)]);
        return $this->status();
    }
}
