<?php

/**
 * REG-005: Disallow retrying non-failed attempts (HTTP 409).
 * Issue: Triggering a retry on a pending, processing, or already successful attempt
 * must return HTTP 409 Conflict to prevent racing duplicate deal creations.
 * Date: 2026-10-02
 */

namespace Tests\Regression;

use App\Enums\SyncStatus;
use App\Models\SyncAttempt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class REG005RetryNonFailed409Test extends TestCase
{
    use RefreshDatabase;

    public function test_reg_005_returns_409_when_attempt_is_successful(): void
    {
        $attempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => 'ORD-REG-409-1',
            'status' => SyncStatus::Success,
            'attempt_number' => 1,
            'completed_at' => now(),
        ]);

        $response = $this->postJson("/api/sync-attempts/{$attempt->id}/retry");

        $response->assertStatus(409)
            ->assertJsonPath('error', 'Conflict: Cannot retry this sync attempt.');
    }

    public function test_reg_005_returns_409_when_attempt_is_pending(): void
    {
        $attempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => 'ORD-REG-409-2',
            'status' => SyncStatus::Pending,
            'attempt_number' => 1,
        ]);

        $response = $this->postJson("/api/sync-attempts/{$attempt->id}/retry");

        $response->assertStatus(409)
            ->assertJsonPath('error', 'Conflict: Cannot retry this sync attempt.');
    }
}
