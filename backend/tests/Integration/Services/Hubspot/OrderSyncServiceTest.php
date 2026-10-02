<?php

namespace Tests\Integration\Services\Hubspot;

use App\DTOs\OrderData;
use App\Enums\SyncStatus;
use App\Models\Order;
use App\Models\SyncAttempt;
use App\Services\Hubspot\DealMapper;
use App\Services\Hubspot\HubspotClient;
use App\Services\Hubspot\HubspotGateway;
use App\Services\Hubspot\OrderSyncService;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Support\Fakes\FakeHubspot;
use Tests\TestCase;

class OrderSyncServiceTest extends TestCase
{
    use RefreshDatabase;

    private OrderSyncService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $client = new HubspotClient('fake_token', 'https://api.hubapi.com', 1);
        $gateway = new HubspotGateway($client, new DealMapper());
        $this->service = new OrderSyncService($gateway);
    }

    public function test_it_successfully_syncs_order_records_deal_and_transitions_attempt_to_success(): void
    {
        FakeHubspot::happyPath('ct_abc_123', 'dl_xyz_789');

        $orderData = new OrderData(
            orderId: 'ORD-SYNC-TEST-1',
            customerEmail: 'sync@example.com',
            customerName: 'Sync User',
            totalAmount: 199.99,
            currency: 'USD',
            items: [['sku' => 'SKU-TEST', 'name' => 'Test Item', 'quantity' => 1, 'unitPrice' => 199.99]],
            createdAt: '2026-10-02T10:00:00Z'
        );

        $attempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => 'ORD-SYNC-TEST-1',
            'status' => SyncStatus::Pending,
            'attempt_number' => 1,
        ]);

        $order = $this->service->sync($orderData, $attempt);

        $this->assertInstanceOf(Order::class, $order);
        $this->assertSame('ORD-SYNC-TEST-1', $order->order_id);
        $this->assertSame('dl_xyz_789', $order->hubspot_deal_id);
        $this->assertSame('ct_abc_123', $order->hubspot_contact_id);

        $attempt->refresh();
        $this->assertSame(SyncStatus::Success, $attempt->status);
        $this->assertNotNull($attempt->completed_at);
        $this->assertDatabaseHas('orders', ['order_id' => 'ORD-SYNC-TEST-1', 'hubspot_deal_id' => 'dl_xyz_789']);
    }

    public function test_it_marks_attempt_failed_when_upstream_error_occurs(): void
    {
        FakeHubspot::badRequest(['message' => 'Property validation failed']);

        $orderData = new OrderData(
            orderId: 'ORD-SYNC-FAIL-1',
            customerEmail: 'bad@example.com',
            customerName: 'Bad User',
            totalAmount: 50.0,
            currency: 'USD',
            items: [],
            createdAt: '2026-10-02T10:00:00Z'
        );

        $attempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => 'ORD-SYNC-FAIL-1',
            'status' => SyncStatus::Pending,
            'attempt_number' => 1,
        ]);

        try {
            $this->service->sync($orderData, $attempt);
            $this->fail('Expected exception was not thrown.');
        } catch (Exception $e) {
            $attempt->refresh();
            $this->assertSame(SyncStatus::Failed, $attempt->status);
            $this->assertNotNull($attempt->failure_code);
            $this->assertNotNull($attempt->completed_at);
            $this->assertDatabaseMissing('orders', ['order_id' => 'ORD-SYNC-FAIL-1']);
        }
    }
}
