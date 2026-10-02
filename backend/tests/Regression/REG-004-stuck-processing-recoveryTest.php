<?php

/**
 * REG-004: Stuck processing attempt recovery.
 * Issue: If a worker process terminates abruptly while an attempt is in 'processing' status,
 * stale processing attempts must be identifiable and marked failed for re-attempting.
 * Date: 2026-10-02
 */

namespace Tests\Regression;

use App\Enums\SyncStatus;
use App\Models\SyncAttempt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class REG004StuckProcessingRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_reg_004_identifies_and_recovers_stale_processing_attempts(): void
    {
        // Stale attempt stuck in processing for > 30 minutes
        $staleAttempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => 'ORD-STUCK-001',
            'status' => SyncStatus::Processing,
            'attempt_number' => 1,
            'started_at' => now()->subMinutes(45),
        ]);

        // Fresh attempt processing normally for 1 minute
        $freshAttempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => 'ORD-FRESH-001',
            'status' => SyncStatus::Processing,
            'attempt_number' => 1,
            'started_at' => now()->subMinute(),
        ]);

        // Find stuck processing attempts older than 30 minutes
        $stuckAttempts = SyncAttempt::where('status', SyncStatus::Processing)
            ->where('started_at', '<', now()->subMinutes(30))
            ->get();

        $this->assertCount(1, $stuckAttempts);
        $this->assertSame($staleAttempt->id, $stuckAttempts->first()->id);

        // Recover by transitioning to failed with TIMEOUT code
        $stuckAttempts->first()->transitionTo(
            SyncStatus::Failed,
            'WORKER_TIMEOUT',
            'Worker processing timed out after 30 minutes without completion.'
        );

        $staleAttempt->refresh();
        $this->assertSame(SyncStatus::Failed, $staleAttempt->status);
        $this->assertSame('WORKER_TIMEOUT', $staleAttempt->failure_code);

        // Verify fresh attempt was untouched
        $freshAttempt->refresh();
        $this->assertSame(SyncStatus::Processing, $freshAttempt->status);
    }
}
