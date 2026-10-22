<?php

use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\DatasetController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\GenerateController;
use App\Http\Controllers\Api\ParticipantController;
use App\Http\Controllers\Api\TemplateController;
use Illuminate\Support\Facades\Route;

// Unduhan lewat signed URL berumur pendek (15 menit).
Route::get('/files/{path}', [FileController::class, 'download'])->middleware(['signed', 'throttle:60,1'])->name('files.download');

Route::middleware(['throttle:120,1'])->group(function () {
    Route::get('/templates', [TemplateController::class, 'index']);
    Route::post('/templates', [TemplateController::class, 'store'])->middleware('throttle:20,1');
    Route::put('/templates/{id}', [TemplateController::class, 'update']);
    Route::delete('/templates/{id}', [TemplateController::class, 'destroy']);
    Route::get('/templates/{id}/download-sample-data', [TemplateController::class, 'sampleData']);

    Route::post('/datasets', [DatasetController::class, 'store'])->middleware('throttle:20,1');
    Route::post('/participants', [ParticipantController::class, 'store']);
    Route::put('/participants/{id}', [ParticipantController::class, 'update']);
    Route::delete('/participants/{id}', [ParticipantController::class, 'destroy']);
    Route::delete('/session', [ParticipantController::class, 'purgeMine']);

    Route::post('/generate', [GenerateController::class, 'store'])->middleware('throttle:30,1');
    Route::get('/jobs/{id}', [GenerateController::class, 'show']);

    Route::get('/sample-template', [TemplateController::class, 'sampleTemplate']);

    // Langkah AI (opsional; 503 bila penyedia aktif belum punya kunci API)
    Route::get('/ai/status', [AiController::class, 'status']);
    Route::put('/ai/settings', [AiController::class, 'updateSettings'])->middleware('throttle:20,1');
    Route::post('/ai/suggest', [AiController::class, 'suggest'])->middleware('throttle:10,1');
    Route::post('/imports/pdf', [AiController::class, 'importPdf'])->middleware('throttle:10,1');
    Route::get('/ai/jobs/{id}', [AiController::class, 'show']);
    Route::get('/ai/jobs/{id}/photo', [AiController::class, 'photo']);
});
