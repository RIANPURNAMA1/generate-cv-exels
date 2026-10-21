<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class GenerationItem extends Model
{
    use HasUuids;

    protected $table = 'generation_items';
    protected $fillable = ['job_id', 'participant_id', 'participant_name', 'status', 'error', 'warnings', 'xlsx_path', 'pdf_path'];
    protected $casts = ['warnings' => 'array'];
}
