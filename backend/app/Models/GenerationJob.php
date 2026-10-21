<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GenerationJob extends Model
{
    use HasUuids;

    protected $table = 'generation_jobs';
    protected $fillable = ['user_id', 'template_id', 'options', 'mapping', 'status', 'zip_path', 'expires_at'];
    protected $casts = ['options' => 'array', 'mapping' => 'array', 'expires_at' => 'datetime'];

    public function items(): HasMany
    {
        return $this->hasMany(GenerationItem::class, 'job_id');
    }
}
