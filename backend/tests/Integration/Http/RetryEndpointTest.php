<?php

namespace Tests\Integration\Http;

use App\Enums\SyncStatus;
use App\Models\Order;
use App\Models\SyncAttempt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

class RetryEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_202_for_failed_attempt_and_creates_linked_pending_attempt(): void
    {
        Queue::fake();

        $failedAttempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => 'ORD-RETRY-01',
            'status' => SyncStatus::Failed,
            'attempt_number' => 1,
            'failure_code' => 'RATE_LIMIT',
            'failure_message' => 'HubSpot rate limit hit',
        ]);

        $response = $this->postJson("/api/sync-attempts/{$failedAttempt->id}/retry");

        $response->assertStatus(202)
            ->assertJsonPath('status', 'accepted')
            ->assertJsonPath('attempt.retryOf', $failedAttempt->id)
            ->assertJsonPath('attempt.attemptNumber', 2)
            ->assertJsonPath('attempt.status', 'pending');

        $this->assertDatabaseHas('sync_attempts', [
            'order_id' => 'ORD-RETRY-01',
            'retry_of' => $failedAttempt->id,
            'attempt_number' => 2,
            'status' => 'pending',
        ]);
    }

    public function test_it_returns_409_conflict_when_retrying_non_failed_attempt(): void
    {
        $pendingAttempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => 'ORD-RETRY-02',
            'status' => SyncStatus::Pending,
            'attempt_number' => 1,
        ]);

        $response = $this->postJson("/api/sync-attempts/{$pendingAttempt->id}/retry");

        $response->assertStatus(409)
            ->assertJsonPath('error', 'Conflict: Cannot retry this sync attempt.');
    }

    public function test_it_returns_409_conflict_when_order_is_already_synced(): void
    {
        $failedAttempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => 'ORD-RETRY-03',
            'status' => SyncStatus::Failed,
            'attempt_number' => 1,
        ]);

        // Order exists in database (already synced)
        Order::create([
            'order_id' => 'ORD-RETRY-03',
            'hubspot_deal_id' => 'deal_synced_999',
            'hubspot_contact_id' => 'contact_999',
            'total_amount' => 50.00,
            'currency' => 'USD',
            'customer_email' => 'synced@example.com',
            'payload' => ['order_id' => 'ORD-RETRY-03'],
        ]);

        $response = $this->postJson("/api/sync-attempts/{$failedAttempt->id}/retry");

        $response->assertStatus(409);
    }
}
