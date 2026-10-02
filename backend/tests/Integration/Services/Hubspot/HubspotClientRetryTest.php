<?php

namespace Tests\Integration\Services\Hubspot;

use App\Exceptions\UpstreamRejectedException;
use App\Exceptions\UpstreamUnavailableException;
use App\Services\Hubspot\HubspotClient;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class HubspotClientRetryTest extends TestCase
{
    public function test_it_retries_transient_failures_and_succeeds(): void
    {
        // Simulate: 429 (rate limit) -> 503 (server error) -> 200 (success)
        Http::fake([
            'https://api.hubapi.com/crm/v3/test' => Http::sequence()
                ->push(['message' => 'Rate limit exceeded'], 429, ['Retry-After' => '0'])
                ->push(['message' => 'Temporary outage'], 503)
                ->push(['id' => 'res_123', 'status' => 'ok'], 200),
        ]);

        $client = new HubspotClient(
            accessToken: 'test-token',
            baseUrl: 'https://api.hubapi.com',
            maxRetries: 3
        );

        $result = $client->request('POST', 'crm/v3/test', ['foo' => 'bar']);

        $this->assertSame('res_123', $result['id']);
        Http::assertSentCount(3);
    }

    public function test_it_does_not_retry_permanent_400_rejections(): void
    {
        Http::fake([
            'https://api.hubapi.com/crm/v3/test' => Http::response([
                'status' => 'error',
                'message' => 'Invalid email address syntax',
            ], 400),
        ]);

        $client = new HubspotClient(
            accessToken: 'test-token',
            baseUrl: 'https://api.hubapi.com',
            maxRetries: 3
        );

        $this->expectException(UpstreamRejectedException::class);
        $this->expectExceptionMessage('HubSpot rejected request: HTTP 400');

        try {
            $client->request('POST', 'crm/v3/test', ['email' => 'bad_email']);
        } finally {
            // Must have only attempted once without retrying
            Http::assertSentCount(1);
        }
    }

    public function test_it_throws_upstream_unavailable_when_retries_exhausted(): void
    {
        Http::fake([
            'https://api.hubapi.com/crm/v3/test' => Http::response(
                ['message' => 'Server error'],
                500
            ),
        ]);

        $client = new HubspotClient(
            accessToken: 'test-token',
            baseUrl: 'https://api.hubapi.com',
            maxRetries: 2
        );

        $this->expectException(UpstreamUnavailableException::class);

        try {
            $client->request('POST', 'crm/v3/test');
        } finally {
            Http::assertSentCount(2);
        }
    }
}
