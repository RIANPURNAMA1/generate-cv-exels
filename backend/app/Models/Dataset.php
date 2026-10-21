<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Dataset extends Model
{
    use HasUuids;

    protected $fillable = ['user_id', 'name', 'columns', 'row_count', 'file_path', 'expires_at'];
    protected $casts = ['columns' => 'array', 'expires_at' => 'datetime'];
}
