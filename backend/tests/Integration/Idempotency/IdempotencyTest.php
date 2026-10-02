<?php

namespace Tests\Integration\Idempotency;

use App\Actions\ReceiveOrderAction;
use App\Models\Order;
use App\Models\SyncAttempt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\Support\Builders\OrderPayloadBuilder;
use Tests\TestCase;

class IdempotencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_duplicate_order_payload_does_not_create_duplicate_records_or_jobs(): void
    {
        Queue::fake();

        // 1. Existing completed order
        Order::create([
            'order_id' => 'ORD-IDEM-001',
            'hubspot_deal_id' => 'deal_existing_111',
            'hubspot_contact_id' => 'contact_existing_222',
            'total_amount' => 100.00,
            'currency' => 'USD',
            'customer_email' => 'duplicate@example.com',
            'payload' => ['order_id' => 'ORD-IDEM-001'],
        ]);

        $payload = OrderPayloadBuilder::make()
            ->withOrderId('ORD-IDEM-001')
            ->build();

        $action = new ReceiveOrderAction();
        $result = $action->execute($payload);

        $this->assertSame('duplicate', $result['status']);
        $this->assertNull($result['attempt']);
        $this->assertNotNull($result['order']);
        $this->assertSame('ORD-IDEM-001', $result['order']->order_id);

        // Ensure database table contains exactly 1 record
        $this->assertSame(1, Order::where('order_id', 'ORD-IDEM-001')->count());
        $this->assertSame(0, SyncAttempt::where('order_id', 'ORD-IDEM-001')->count());
        Queue::assertNothingPushed();
    }

    public function test_repeated_sync_attempts_for_same_order_yield_single_order_record(): void
    {
        Queue::fake();

        $payload = OrderPayloadBuilder::make()
            ->withOrderId('ORD-RACE-001')
            ->build();

        $action = new ReceiveOrderAction();

        // First attempt accepted
        $result1 = $action->execute($payload);
        $this->assertSame('accepted', $result1['status']);
        $this->assertSame(1, SyncAttempt::where('order_id', 'ORD-RACE-001')->count());

        // Simulate successful completion of attempt 1
        Order::create([
            'order_id' => 'ORD-RACE-001',
            'hubspot_deal_id' => 'deal_first_win',
            'hubspot_contact_id' => 'contact_first_win',
            'total_amount' => 100.00,
            'currency' => 'USD',
            'customer_email' => 'test@example.com',
            'payload' => $payload,
        ]);

        // Second incoming attempt detected as duplicate
        $result2 = $action->execute($payload);
        $this->assertSame('duplicate', $result2['status']);
        $this->assertSame(1, Order::where('order_id', 'ORD-RACE-001')->count());
    }
}
