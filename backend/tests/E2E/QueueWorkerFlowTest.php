<?php

namespace Tests\E2E;

use App\Enums\SyncStatus;
use App\Models\Order;
use App\Models\SyncAttempt;
use App\Services\Hubspot\HubspotClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\Builders\OrderPayloadBuilder;
use Tests\Support\Concerns\InteractsWithInternalToken;
use Tests\Support\Fakes\FakeHubspot;
use Tests\TestCase;

class QueueWorkerFlowTest extends TestCase
{
    use RefreshDatabase;
    use InteractsWithInternalToken;

    public function test_end_to_end_ingress_to_queue_worker_completion_flow(): void
    {
        FakeHubspot::happyPath('ct_queue_flow_123', 'dl_queue_flow_456');

        $this->app->instance(HubspotClient::class, new HubspotClient('fake_token', 'https://api.hubapi.com', 1));

        $payload = OrderPayloadBuilder::make()
            ->withOrderId('ORD-E2E-QUEUE-01')
            ->withCustomer('flow@example.com', 'Flow Tester', '+15551234567')
            ->withTotal(180.50, 'USD')
            ->build();

        // 1. Post to Internal Ingress Endpoint
        $response = $this->withInternalToken()
            ->postJson('/api/internal/orders', $payload);

        $response->assertStatus(202);
        $attemptId = $response->json('attempt.id');

        // 2. Since QUEUE_CONNECTION is sync in test env (or run work --once)
        // verify the order record is created in the database
        $order = Order::where('order_id', 'ORD-E2E-QUEUE-01')->first();
        $this->assertNotNull($order);
        $this->assertSame('dl_queue_flow_456', $order->hubspot_deal_id);
        $this->assertSame('ct_queue_flow_123', $order->hubspot_contact_id);
        $this->assertSame('180.50', (string) $order->total_amount);

        // 3. Verify sync_attempts state machine reached terminal success
        $attempt = SyncAttempt::find($attemptId);
        $this->assertNotNull($attempt);
        $this->assertSame(SyncStatus::Success, $attempt->status);
        $this->assertNotNull($attempt->started_at);
        $this->assertNotNull($attempt->completed_at);
        $this->assertNull($attempt->failure_code);
    }
}
