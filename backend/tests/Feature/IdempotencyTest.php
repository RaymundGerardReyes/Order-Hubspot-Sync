<?php

namespace Tests\Feature;

use App\Actions\ReceiveOrderAction;
use App\Models\Order;
use App\Models\SyncAttempt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class IdempotencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_duplicate_order_does_not_create_new_order_or_job(): void
    {
        Queue::fake();

        // 1. Manually create an existing processed order
        Order::create([
            'order_id' => 'ORD-DUPLICATE-001',
            'hubspot_deal_id' => 'deal_111',
            'hubspot_contact_id' => 'contact_222',
            'total_amount' => 100.00,
            'currency' => 'USD',
            'customer_email' => 'duplicate@example.com',
            'payload' => ['sample' => 'data'],
        ]);

        $payload = [
            'orderId' => 'ORD-DUPLICATE-001',
            'customer' => ['name' => 'Dupe Test', 'email' => 'duplicate@example.com'],
            'items' => [['sku' => 'ITEM-1', 'quantity' => 1, 'unitPrice' => 100.00]],
            'totalAmount' => 100.00,
            'currency' => 'USD',
        ];

        $action = new ReceiveOrderAction();
        $result = $action->execute($payload);

        $this->assertSame('duplicate', $result['status']);
        $this->assertNull($result['attempt']);
        $this->assertNotNull($result['order']);
        $this->assertSame('ORD-DUPLICATE-001', $result['order']->order_id);

        // Ensure orders table count remains 1
        $this->assertSame(1, Order::where('order_id', 'ORD-DUPLICATE-001')->count());

        // Ensure no new sync attempt was created
        $this->assertSame(0, SyncAttempt::where('order_id', 'ORD-DUPLICATE-001')->count());
    }
}
