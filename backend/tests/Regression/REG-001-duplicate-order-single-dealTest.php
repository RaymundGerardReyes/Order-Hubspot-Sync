<?php

/**
 * REG-001: Duplicate order payloads must produce at most one HubSpot deal.
 * Issue: Duplicate webhook delivery could cause multiple deals to be created in HubSpot.
 * Date: 2026-10-02
 */

namespace Tests\Regression;

use App\Actions\ReceiveOrderAction;
use App\Models\Order;
use App\Models\SyncAttempt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\Support\Builders\OrderPayloadBuilder;
use Tests\TestCase;

class REG001DuplicateOrderSingleDealTest extends TestCase
{
    use RefreshDatabase;

    public function test_reg_001_locks_idempotency_guarantee_single_deal(): void
    {
        Queue::fake();

        $payload = OrderPayloadBuilder::make()
            ->withOrderId('ORD-REG-DUP-01')
            ->build();

        $action = new ReceiveOrderAction();

        // 1. Initial attempt
        $res1 = $action->execute($payload);
        $this->assertSame('accepted', $res1['status']);

        // Simulate completed sync
        Order::create([
            'order_id' => 'ORD-REG-DUP-01',
            'hubspot_deal_id' => 'deal_first_winner',
            'hubspot_contact_id' => 'ct_first_winner',
            'total_amount' => 59.98,
            'currency' => 'USD',
            'customer_email' => 'john.doe@example.com',
            'payload' => $payload,
        ]);

        // 2. Duplicate attempt
        $res2 = $action->execute($payload);
        $this->assertSame('duplicate', $res2['status']);

        // Assert exactly one order in database
        $this->assertSame(1, Order::where('order_id', 'ORD-REG-DUP-01')->count());
        $order = Order::where('order_id', 'ORD-REG-DUP-01')->first();
        $this->assertSame('deal_first_winner', $order->hubspot_deal_id);
    }
}
