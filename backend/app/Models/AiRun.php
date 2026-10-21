<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AiRun extends Model
{
    use HasUuids;

    protected $fillable = ['user_id', 'kind', 'status', 'input', 'result', 'file_path', 'photo_path', 'tokens_in', 'tokens_out', 'error', 'expires_at'];
    // Hasil AI memuat data pribadi: disimpan terenkripsi.
    protected $casts = ['input' => 'array', 'result' => 'encrypted:array', 'expires_at' => 'datetime'];
}
