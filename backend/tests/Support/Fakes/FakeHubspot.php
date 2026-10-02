<?php

namespace Tests\Support\Fakes;

use Illuminate\Support\Facades\Http;

class FakeHubspot
{
    /**
     * Preset: Happy path where new contact and deal are created and associated.
     */
    public static function happyPath(string $contactId = 'ct_109283', string $dealId = 'dl_987654321'): void
    {
        Http::fake([
            '*/crm/v3/objects/contacts/search*' => Http::response(['total' => 0, 'results' => []], 200),
            '*/crm/v3/objects/contacts' => Http::response(['id' => $contactId, 'properties' => []], 201),
            '*/crm/v3/objects/deals/search*' => Http::response(['total' => 0, 'results' => []], 200),
            '*/crm/v3/objects/deals' => Http::response(['id' => $dealId, 'properties' => []], 201),
            '*/crm/v3/objects/deals/*/associations/contacts/*/*' => Http::response([], 200),
        ]);
    }

    /**
     * Preset: Contact and Deal already exist in HubSpot.
     */
    public static function existingContactAndDeal(string $contactId = 'ct_existing_456', string $dealId = 'dl_existing_789'): void
    {
        Http::fake([
            '*/crm/v3/objects/contacts/search*' => Http::response([
                'total' => 1,
                'results' => [['id' => $contactId, 'properties' => ['email' => 'customer@example.com']]],
            ], 200),
            '*/crm/v3/objects/contacts/*' => Http::response(['id' => $contactId, 'properties' => []], 200),
            '*/crm/v3/objects/deals/search*' => Http::response([
                'total' => 1,
                'results' => [['id' => $dealId, 'properties' => ['dealname' => 'Existing Deal']]],
            ], 200),
            '*/crm/v3/objects/deals/*/associations/contacts/*/*' => Http::response([], 200),
        ]);
    }

    /**
     * Preset: 429 Rate Limit returned.
     */
    public static function rateLimited(int $retryAfter = 2): void
    {
        Http::fake([
            '*/crm/v3/*' => Http::response(
                ['message' => 'Rate limit exceeded'],
                429,
                ['Retry-After' => (string) $retryAfter]
            ),
        ]);
    }

    /**
     * Preset: 503 Service Unavailable returned.
     */
    public static function serviceUnavailable(): void
    {
        Http::fake([
            '*/crm/v3/*' => Http::response(['message' => 'HubSpot temporary outage'], 503),
        ]);
    }

    /**
     * Preset: 400 Bad Request permanently rejected.
     */
    public static function badRequest(array $errors = ['message' => 'Invalid email address']): void
    {
        Http::fake([
            '*/crm/v3/*' => Http::response($errors, 400),
        ]);
    }

    /**
     * Preset: Deal search with 2 pages for export testing.
     */
    public static function paginatedDeals(): void
    {
        $page1 = json_decode(file_get_contents(__DIR__ . '/../Fixtures/hubspot/deals-search-page-1.json'), true);
        $page2 = json_decode(file_get_contents(__DIR__ . '/../Fixtures/hubspot/deals-search-page-2.json'), true);

        Http::fake([
            '*/crm/v3/objects/deals/search*' => function ($request) use ($page1, $page2) {
                $body = json_decode($request->body(), true);
                if (isset($body['after']) && $body['after'] === 'cursor_page_2') {
                    return Http::response($page2, 200);
                }
                return Http::response($page1, 200);
            },
        ]);
    }
}
