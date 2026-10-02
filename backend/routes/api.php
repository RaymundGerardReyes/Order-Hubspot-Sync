<?php

use App\Http\Controllers\HealthController;
use App\Http\Controllers\InternalOrderController;
use App\Http\Controllers\SyncAttemptController;
use App\Http\Middleware\VerifyInternalToken;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::prefix('internal')->middleware([VerifyInternalToken::class])->group(function () {
    Route::post('/orders', [InternalOrderController::class, 'store']);
});

Route::get('/syncs', [SyncAttemptController::class, 'index']);
Route::post('/syncs/{id}/retry', [SyncAttemptController::class, 'retry']);
Route::get('/healthz', [HealthController::class, 'check']);
