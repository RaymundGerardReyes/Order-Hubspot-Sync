<?php

namespace Tests\Unit\Exceptions;

use App\Exceptions\UpstreamRejectedException;
use App\Exceptions\UpstreamUnavailableException;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class UpstreamExceptionsTest extends TestCase
{
    public function test_upstream_unavailable_exception_stores_status_and_retry_after(): void
    {
        $previous = new RuntimeException('Connection timed out');
        $exception = new UpstreamUnavailableException(
            message: 'HubSpot service unavailable',
            statusCode: 503,
            retryAfterSeconds: 30,
            previous: $previous
        );

        $this->assertSame('HubSpot service unavailable', $exception->getMessage());
        $this->assertSame(503, $exception->statusCode);
        $this->assertSame(30, $exception->retryAfterSeconds);
        $this->assertSame($previous, $exception->getPrevious());
    }

    public function test_upstream_rejected_exception_stores_rejection_payload(): void
    {
        $errors = [
            'status' => 'error',
            'message' => 'Property dealname is required',
            'correlationId' => 'cid-12345',
        ];

        $exception = new UpstreamRejectedException(
            message: 'HubSpot rejected deal creation',
            statusCode: 400,
            upstreamErrors: $errors
        );

        $this->assertSame('HubSpot rejected deal creation', $exception->getMessage());
        $this->assertSame(400, $exception->statusCode);
        $this->assertSame($errors, $exception->upstreamErrors);
    }
}
