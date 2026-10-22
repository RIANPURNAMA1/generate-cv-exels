<?php

return [
    'retention_hours' => (int) env('FILE_RETENTION_HOURS', 24),
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),

    /*
     | AI: satu lapisan abstraksi untuk beberapa penyedia (Claude, GPT, Gemini).
     | Kunci API hanya di backend: dibaca dari .env atau dari pengaturan aplikasi
     | (disimpan terenkripsi di tabel ai_settings). Kunci tidak pernah dikirim ke frontend.
     */
    'ai' => [
        'provider' => env('AI_PROVIDER', 'claude'),
        'timeout' => (int) env('AI_TIMEOUT', 90),
        'max_tokens' => (int) env('AI_MAX_TOKENS', 4096),
        'providers' => [
            'claude' => [
                'label' => 'Claude (Anthropic)',
                'key' => env('ANTHROPIC_API_KEY'),
                'model' => env('CLAUDE_MODEL', 'claude-sonnet-5-5'),
                'base_url' => env('ANTHROPIC_BASE_URL', 'https://api.anthropic.com'),
                'models' => ['claude-sonnet-5-5', 'claude-opus-4-1', 'claude-haiku-4-5', 'claude-3-7-sonnet-latest'],
                'native_pdf' => true,
            ],
            'openai' => [
                'label' => 'GPT (OpenAI)',
                'key' => env('OPENAI_API_KEY'),
                'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
                'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com'),
                'models' => ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1', 'gpt-5-mini'],
                'native_pdf' => false,
            ],
            'gemini' => [
                'label' => 'Gemini (Google)',
                'key' => env('GEMINI_API_KEY'),
                'model' => env('GEMINI_MODEL', 'gemini-2.0-flash'),
                'base_url' => env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com'),
                'models' => ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash'],
                'native_pdf' => true,
            ],
        ],
    ],

    // Dipertahankan agar kompatibel dengan konfigurasi lama.
    'anthropic' => [
        'key' => env('ANTHROPIC_API_KEY'),
        'model' => env('CLAUDE_MODEL', 'claude-sonnet-5-5'),
        'timeout' => 60,
    ],
];
