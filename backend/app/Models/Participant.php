<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Participant extends Model
{
    use HasUuids;

    protected $fillable = ['dataset_id', 'user_id', 'data', 'photo_path', 'status', 'expires_at'];
    // Data pribadi disimpan terenkripsi.
    protected $casts = ['data' => 'encrypted:array', 'expires_at' => 'datetime'];
    protected $hidden = ['photo_path'];
}
