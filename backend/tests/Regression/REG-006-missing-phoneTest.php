<?php

/**
 * REG-006: Payload without phone number still syncs successfully.
 * Issue: Missing optional phone numbers in the customer object must not fail schema validation
 * or contact property generation.
 * Date: 2026-10-02
 */

namespace Tests\Regression;

use App\DTOs\OrderData;
use App\Enums\SyncStatus;
use App\Models\SyncAttempt;
use App\Services\Hubspot\DealMapper;
use App\Services\Hubspot\HubspotClient;
use App\Services\Hubspot\HubspotGateway;
use App\Services\Hubspot\OrderSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Support\Builders\OrderPayloadBuilder;
use Tests\Support\Fakes\FakeHubspot;
use Tests\TestCase;

class REG006MissingPhoneTest extends TestCase
{
    use RefreshDatabase;

    public function test_reg_006_syncs_order_without_customer_phone(): void
    {
        FakeHubspot::happyPath('ct_nophone_1', 'dl_nophone_1');

        $client = new HubspotClient('fake_token', 'https://api.hubapi.com', 1);
        $gateway = new HubspotGateway($client, new DealMapper());
        $service = new OrderSyncService($gateway);

        // Build payload explicitly without phone
        $payload = OrderPayloadBuilder::make()
            ->withOrderId('ORD-REG-NOPHONE')
            ->withCustomer('nophone@example.com', 'No Phone User')
            ->withoutPhone()
            ->build();

        $this->assertArrayNotHasKey('phone', $payload['customer']);

        $orderData = OrderData::fromArray($payload);

        $attempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => 'ORD-REG-NOPHONE',
            'status' => SyncStatus::Pending,
            'attempt_number' => 1,
        ]);

        $order = $service->sync($orderData, $attempt);

        $this->assertSame('dl_nophone_1', $order->hubspot_deal_id);
        $this->assertSame('ct_nophone_1', $order->hubspot_contact_id);

        $attempt->refresh();
        $this->assertSame(SyncStatus::Success, $attempt->status);
    }
}
