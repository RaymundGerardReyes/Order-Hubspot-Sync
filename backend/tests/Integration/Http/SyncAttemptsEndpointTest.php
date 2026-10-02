<?php

namespace Tests\Integration\Http;

use App\Enums\SyncStatus;
use App\Models\Order;
use App\Models\SyncAttempt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SyncAttemptsEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_latest_attempts_in_order_with_proper_resource_shape(): void
    {
        $order = Order::create([
            'order_id' => 'ORD-SYNC-01',
            'customer_email' => 'sensitive-user@example.com',
            'total_amount' => 120.00,
            'currency' => 'USD',
            'payload' => [
                'order_id' => 'ORD-SYNC-01',
                'customer' => ['credit_card' => '4111-XXXX-XXXX-1111', 'email' => 'sensitive-user@example.com'],
            ],
        ]);

        $attempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => $order->order_id,
            'status' => SyncStatus::Success,
            'attempt_number' => 1,
            'started_at' => now()->subMinute(),
            'completed_at' => now(),
        ]);

        $response = $this->getJson('/api/sync-attempts');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'orderId',
                        'status',
                        'retryOf',
                        'attemptNumber',
                        'failureCode',
                        'failureMessage',
                        'startedAt',
                        'completedAt',
                        'createdAt',
                    ],
                ],
            ]);

        // Verify no payload leak (e.g. credit card / raw payload should never be present)
        $responseContent = $response->getContent();
        $this->assertStringNotContainsString('credit_card', $responseContent);
        $this->assertStringNotContainsString('4111-XXXX-XXXX-1111', $responseContent);
    }

    public function test_it_limits_results_to_fifty_newest_first(): void
    {
        $order = Order::create([
            'order_id' => 'ORD-BULK-01',
            'customer_email' => 'bulk@example.com',
            'total_amount' => 10.00,
            'currency' => 'USD',
            'payload' => ['order_id' => 'ORD-BULK-01'],
        ]);

        // Create 55 attempts with increasing timestamps
        for ($i = 1; $i <= 55; $i++) {
            SyncAttempt::create([
                'id' => (string) Str::uuid(),
                'order_id' => $order->order_id,
                'status' => SyncStatus::Pending,
                'attempt_number' => $i,
                'created_at' => now()->addMinutes($i),
            ]);
        }

        $response = $this->getJson('/api/sync-attempts');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertCount(50, $data);
        // First entry should be the latest (attempt 55)
        $this->assertSame(55, $data[0]['attemptNumber']);
    }
}
