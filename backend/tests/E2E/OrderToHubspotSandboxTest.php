<?php

namespace Tests\E2E;

use App\DTOs\OrderData;
use App\Enums\SyncStatus;
use App\Models\SyncAttempt;
use App\Services\Hubspot\DealMapper;
use App\Services\Hubspot\HubspotClient;
use App\Services\Hubspot\HubspotGateway;
use App\Services\Hubspot\OrderSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrderToHubspotSandboxTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_syncs_order_to_live_hubspot_sandbox_when_flag_enabled(): void
    {
        if (env('HUBSPOT_E2E') !== '1') {
            $this->markTestSkipped('HUBSPOT_E2E is not set to 1. Skipping live HubSpot sandbox integration test.');
        }

        $token = (string) config('services.hubspot.access_token');
        if (empty($token)) {
            $this->markTestSkipped('HUBSPOT_ACCESS_TOKEN is not configured for live sandbox test.');
        }

        $client = new HubspotClient($token);
        $gateway = new HubspotGateway($client, new DealMapper());
        $service = new OrderSyncService($gateway);

        $testOrderId = 'ORD-SANDBOX-' . rand(10000, 99999);
        $orderData = new OrderData(
            orderId: $testOrderId,
            customerEmail: 'sandbox.test@example.com',
            customerName: 'Sandbox Tester',
            totalAmount: 15.99,
            currency: 'USD',
            items: [['sku' => 'SB-1', 'name' => 'Sandbox Item', 'quantity' => 1, 'unitPrice' => 15.99]],
            createdAt: now()->toIso8601String()
        );

        $attempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => $testOrderId,
            'status' => SyncStatus::Pending,
            'attempt_number' => 1,
        ]);

        $order = $service->sync($orderData, $attempt);

        $this->assertNotEmpty($order->hubspot_deal_id);
        $this->assertNotEmpty($order->hubspot_contact_id);

        $attempt->refresh();
        $this->assertSame(SyncStatus::Success, $attempt->status);
    }
}
