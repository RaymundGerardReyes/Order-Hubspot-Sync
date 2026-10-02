<?php

namespace App\Exceptions;

use Exception;

class UpstreamRejectedException extends Exception
{
    public function __construct(
        string $message = 'Upstream HubSpot service rejected the request.',
        public readonly int $statusCode = 400,
        public readonly ?array $upstreamErrors = null,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $statusCode, $previous);
    }
}
