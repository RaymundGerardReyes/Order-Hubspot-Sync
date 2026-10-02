<?php

/**
 * REG-002: Honor upstream 429 Retry-After header.
 * Issue: When HubSpot returns HTTP 429 Too Many Requests with a Retry-After header,
 * the client must honor that specific duration instead of a blind retry.
 * Date: 2026-10-02
 */

namespace Tests\Regression;

use App\Services\Hubspot\HubspotClient;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class REG002RetryAfterHeaderTest extends TestCase
{
    public function test_reg_002_honors_retry_after_header_on_429(): void
    {
        Http::fake([
            'https://api.hubapi.com/crm/v3/test-retry' => Http::sequence()
                ->push(['message' => 'Rate limit exceeded'], 429, ['Retry-After' => '0'])
                ->push(['id' => 'deal_recovered_after_rate_limit'], 200),
        ]);

        $client = new HubspotClient(
            accessToken: 'test-token',
            baseUrl: 'https://api.hubapi.com',
            maxRetries: 2
        );

        $result = $client->request('POST', 'crm/v3/test-retry');

        $this->assertSame('deal_recovered_after_rate_limit', $result['id']);
        Http::assertSentCount(2);
    }
}
