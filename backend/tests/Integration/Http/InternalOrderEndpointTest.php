<?php

namespace Tests\Integration\Http;

use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\Support\Builders\OrderPayloadBuilder;
use Tests\Support\Concerns\InteractsWithInternalToken;
use Tests\TestCase;

class InternalOrderEndpointTest extends TestCase
{
    use RefreshDatabase;
    use InteractsWithInternalToken;

    public function test_it_returns_202_accepted_for_new_valid_order(): void
    {
        Queue::fake();

        $payload = OrderPayloadBuilder::make()
            ->withOrderId('ORD-INT-001')
            ->build();

        $response = $this->withInternalToken()
            ->postJson('/api/internal/orders', $payload);

        $response->assertStatus(202)
            ->assertJsonPath('status', 'accepted')
            ->assertJsonStructure([
                'status',
                'message',
                'attempt' => ['id', 'orderId', 'status', 'attemptNumber'],
            ]);

        $this->assertDatabaseHas('sync_attempts', [
            'order_id' => 'ORD-INT-001',
            'status' => 'pending',
            'attempt_number' => 1,
        ]);
    }

    public function test_it_returns_200_duplicate_for_already_synced_order(): void
    {
        Queue::fake();

        Order::create([
            'order_id' => 'ORD-INT-DUP',
            'hubspot_deal_id' => 'deal_already_synced_123',
            'hubspot_contact_id' => 'contact_456',
            'total_amount' => 100.00,
            'currency' => 'USD',
            'customer_email' => 'dup@example.com',
            'payload' => ['order_id' => 'ORD-INT-DUP'],
        ]);

        $payload = OrderPayloadBuilder::make()
            ->withOrderId('ORD-INT-DUP')
            ->build();

        $response = $this->withInternalToken()
            ->postJson('/api/internal/orders', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'duplicate')
            ->assertJsonPath('orderId', 'ORD-INT-DUP')
            ->assertJsonPath('hubspotDealId', 'deal_already_synced_123');
    }

    public function test_it_returns_401_when_internal_token_is_missing_or_invalid(): void
    {
        $payload = OrderPayloadBuilder::make()->build();

        // Missing token
        $response = $this->postJson('/api/internal/orders', $payload);
        $response->assertStatus(401);

        // Invalid token
        $response = $this->withHeaders(['X-Internal-Token' => 'invalid_wrong_token'])
            ->postJson('/api/internal/orders', $payload);
        $response->assertStatus(401);
    }

    public function test_it_returns_422_when_payload_is_invalid(): void
    {
        // Missing customer and items
        $response = $this->withInternalToken()
            ->postJson('/api/internal/orders', [
                'order_id' => 'ORD-INVALID',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['customer', 'items']);
    }
}
