<?php

if (!function_exists('app_user_id')) {
    /**
     * Id user default (tanpa login). Dibuat otomatis bila belum ada.
     */
    function app_user_id(): int
    {
        $user = \App\Models\User::query()->orderBy('id')->first();
        if ($user) {
            return (int) $user->id;
        }

        return (int) \App\Models\User::create([
            'name' => 'Pengguna',
            'email' => 'user@local',
            'password' => \Illuminate\Support\Facades\Hash::make(''),
        ])->id;
    }
}
