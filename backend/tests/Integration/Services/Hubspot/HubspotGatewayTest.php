<?php

namespace Tests\Integration\Services\Hubspot;

use App\DTOs\OrderData;
use App\Services\Hubspot\DealMapper;
use App\Services\Hubspot\HubspotClient;
use App\Services\Hubspot\HubspotGateway;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class HubspotGatewayTest extends TestCase
{
    private HubspotGateway $gateway;

    protected function setUp(): void
    {
        parent::setUp();
        $client = new HubspotClient(accessToken: 'mock-token', baseUrl: 'https://api.hubapi.com', maxRetries: 1);
        $this->gateway = new HubspotGateway($client, new DealMapper());
    }

    public function test_find_or_create_contact_updates_existing_contact_when_found(): void
    {
        Http::fake([
            'https://api.hubapi.com/crm/v3/objects/contacts/search' => Http::response([
                'total' => 1,
                'results' => [['id' => 'ct_found_123', 'properties' => ['email' => 'sarah@example.com']]],
            ], 200),
            'https://api.hubapi.com/crm/v3/objects/contacts/ct_found_123' => Http::response([
                'id' => 'ct_found_123',
                'properties' => ['email' => 'sarah@example.com'],
            ], 200),
        ]);

        $orderData = new OrderData(
            orderId: 'ORD-1',
            customerEmail: 'sarah@example.com',
            customerName: 'Sarah Connor',
            totalAmount: 100.0,
            currency: 'USD',
            items: [],
            createdAt: '2026-10-02T10:00:00Z'
        );

        $contactId = $this->gateway->findOrCreateContact($orderData);

        $this->assertSame('ct_found_123', $contactId);
        Http::assertSentCount(2);
        Http::assertSent(fn ($req) => $req->method() === 'PATCH' &&
            $req->url() === 'https://api.hubapi.com/crm/v3/objects/contacts/ct_found_123'
        );
    }

    public function test_find_or_create_contact_creates_contact_when_not_found(): void
    {
        Http::fake([
            'https://api.hubapi.com/crm/v3/objects/contacts/search' => Http::response(['total' => 0, 'results' => []], 200),
            'https://api.hubapi.com/crm/v3/objects/contacts' => Http::response(['id' => 'ct_new_456'], 201),
        ]);

        $orderData = new OrderData(
            orderId: 'ORD-2',
            customerEmail: 'newbie@example.com',
            customerName: 'Newbie User',
            totalAmount: 100.0,
            currency: 'USD',
            items: [],
            createdAt: '2026-10-02T10:00:00Z'
        );

        $contactId = $this->gateway->findOrCreateContact($orderData);

        $this->assertSame('ct_new_456', $contactId);
        Http::assertSent(fn ($req) => $req->url() === 'https://api.hubapi.com/crm/v3/objects/contacts' &&
            $req['properties']['email'] === 'newbie@example.com'
        );
    }

    public function test_find_or_create_deal_creates_deal_with_mapped_properties(): void
    {
        Http::fake([
            'https://api.hubapi.com/crm/v3/objects/deals/search' => Http::response(['total' => 0, 'results' => []], 200),
            'https://api.hubapi.com/crm/v3/objects/deals' => Http::response(['id' => 'dl_new_789'], 201),
        ]);

        $orderData = new OrderData(
            orderId: 'ORD-DEAL-01',
            customerEmail: 'buyer@example.com',
            customerName: 'Buyer Person',
            totalAmount: 250.75,
            currency: 'USD',
            items: [],
            createdAt: '2026-10-02T10:00:00Z'
        );

        $dealId = $this->gateway->findOrCreateDeal($orderData);

        $this->assertSame('dl_new_789', $dealId);
        Http::assertSent(fn ($req) => $req->url() === 'https://api.hubapi.com/crm/v3/objects/deals' &&
            $req['properties']['order_id'] === 'ORD-DEAL-01' &&
            $req['properties']['amount'] === '250.75'
        );
    }

    public function test_associate_deal_with_contact_sends_put_request(): void
    {
        Http::fake([
            'https://api.hubapi.com/crm/v3/objects/deals/dl_1/associations/contacts/ct_2/3' => Http::response([], 200),
        ]);

        $this->gateway->associateDealWithContact('dl_1', 'ct_2');

        Http::assertSent(fn ($req) => $req->method() === 'PUT' &&
            $req->url() === 'https://api.hubapi.com/crm/v3/objects/deals/dl_1/associations/contacts/ct_2/3'
        );
    }
}
