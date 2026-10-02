<?php

namespace App\Exceptions;

use Exception;

class UpstreamUnavailableException extends Exception
{
    public function __construct(
        string $message = 'Upstream HubSpot service is temporarily unavailable.',
        public readonly int $statusCode = 503,
        public readonly ?int $retryAfterSeconds = null,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $statusCode, $previous);
    }
}
