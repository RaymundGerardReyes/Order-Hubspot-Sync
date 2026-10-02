<?php

namespace App\Http\Controllers;

use App\Enums\SyncStatus;
use App\Models\SyncAttempt;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController extends Controller
{
    /**
     * Operational health check for database and queue backlog status.
     */
    public function check(): JsonResponse
    {
        $dbOk = false;
        try {
            DB::connection()->getPdo();
            $dbOk = true;
        } catch (Throwable $e) {
            // DB down
        }

        $pendingCount = 0;
        $failedCount = 0;

        if ($dbOk) {
            $pendingCount = SyncAttempt::where('status', SyncStatus::Pending)->count();
            $failedCount = SyncAttempt::where('status', SyncStatus::Failed)->count();
        }

        $isHealthy = $dbOk;

        return response()->json([
            'status' => $isHealthy ? 'healthy' : 'unhealthy',
            'database' => $dbOk ? 'connected' : 'disconnected',
            'pendingSyncs' => $pendingCount,
            'failedSyncs' => $failedCount,
            'timestamp' => now()->toIso8601String(),
        ], $isHealthy ? 200 : 503);
    }
}
