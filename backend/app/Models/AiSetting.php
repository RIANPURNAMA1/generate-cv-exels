<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiSetting extends Model
{
    protected $fillable = ['user_id', 'provider', 'model', 'api_keys', 'enabled'];

    // Kunci API disimpan terenkripsi di database.
    protected $casts = ['api_keys' => 'encrypted:array', 'enabled' => 'boolean'];
}
