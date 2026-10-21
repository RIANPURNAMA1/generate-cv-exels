<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Template extends Model
{
    use HasUuids;

    protected $fillable = ['user_id', 'name', 'file_path', 'placeholders', 'sha256'];
    protected $casts = ['placeholders' => 'array'];
}
