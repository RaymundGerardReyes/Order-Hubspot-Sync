<?php

namespace Tests\Integration\Http;

use Tests\Support\Builders\OrderPayloadBuilder;
use Tests\TestCase;

class VerifyInternalTokenTest extends TestCase
{
    public function test_it_rejects_requests_missing_the_internal_token_header(): void
    {
        $payload = OrderPayloadBuilder::make()->build();

        $response = $this->postJson('/api/internal/orders', $payload);

        $response->assertStatus(401)
            ->assertJsonPath('error', 'Unauthorized: Invalid or missing internal authentication token.');
    }

    public function test_it_rejects_requests_with_an_incorrect_token(): void
    {
        $payload = OrderPayloadBuilder::make()->build();

        $response = $this->withHeaders(['X-Internal-Token' => 'bogus-incorrect-token'])
            ->postJson('/api/internal/orders', $payload);

        $response->assertStatus(401)
            ->assertJsonPath('error', 'Unauthorized: Invalid or missing internal authentication token.');
    }
}
