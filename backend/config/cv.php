<?php

return [
    'retention_hours' => (int) env('FILE_RETENTION_HOURS', 24),
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),
    'anthropic' => [
        'key' => env('ANTHROPIC_API_KEY'),          // hanya backend; tidak pernah dikirim ke frontend
        'model' => env('CLAUDE_MODEL', 'claude-sonnet-5-5'),
        'timeout' => 60,
    ],
];
