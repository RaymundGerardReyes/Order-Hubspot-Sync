<?php

namespace Tests\Support\Concerns;

trait InteractsWithInternalToken
{
    /**
     * Provide headers with valid internal token.
     */
    protected function withInternalToken(?string $token = null): static
    {
        $token = $token ?? config('services.internal.token', 'test_internal_token_secret');

        return $this->withHeaders([
            'X-Internal-Token' => $token,
            'Accept' => 'application/json',
        ]);
    }
}
