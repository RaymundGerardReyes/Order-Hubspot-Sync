<?php

namespace App\Services\Hubspot;

use App\Exceptions\UpstreamRejectedException;
use App\Exceptions\UpstreamUnavailableException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class HubspotClient
{
    private string $accessToken;
    private string $baseUrl;
    private int $maxRetries;

    public function __construct(?string $accessToken = null, ?string $baseUrl = null, int $maxRetries = 3)
    {
        $this->accessToken = $accessToken ?? (string) config('services.hubspot.access_token', '');
        $this->baseUrl = rtrim($baseUrl ?? (string) config('services.hubspot.base_url', 'https://api.hubapi.com'), '/');
        $this->maxRetries = $maxRetries;
    }

    /**
     * Send HTTP request to HubSpot with retry and backoff handling.
     *
     * @throws UpstreamUnavailableException
     * @throws UpstreamRejectedException
     */
    public function request(string $method, string $path, array $data = []): array
    {
        $url = $this->baseUrl . '/' . ltrim($path, '/');
        $attempt = 0;

        while ($attempt < $this->maxRetries) {
            $attempt++;

            try {
                $response = Http::withToken($this->accessToken)
                    ->timeout(15)
                    ->acceptJson()
                    ->asJson()
                    ->send($method, $url, empty($data) ? [] : ['json' => $data]);

                if ($response->successful()) {
                    return $response->json() ?? [];
                }

                $status = $response->status();

                // Rate limiting or server errors: retryable
                if ($status === 429 || $status >= 500) {
                    $retryAfter = $this->extractRetryAfter($response);
                    Log::warning("HubSpot request failed with status {$status} on attempt {$attempt}", [
                        'status' => $status,
                        'retry_after' => $retryAfter,
                    ]);

                    if ($attempt < $this->maxRetries) {
                        $sleepSeconds = $retryAfter ?? (int) pow(2, $attempt);
                        sleep($sleepSeconds);
                        continue;
                    }

                    throw new UpstreamUnavailableException(
                        message: "HubSpot unavailable: HTTP {$status} - " . $response->body(),
                        statusCode: $status,
                        retryAfterSeconds: $retryAfter
                    );
                }

                // 4xx errors (client bug / bad payload): permanently rejected
                Log::error("HubSpot request rejected permanently with status {$status}", [
                    'body' => $response->body(),
                ]);

                throw new UpstreamRejectedException(
                    message: "HubSpot rejected request: HTTP {$status} - " . $response->body(),
                    statusCode: $status,
                    upstreamErrors: $response->json()
                );

            } catch (ConnectionException $e) {
                Log::warning("HubSpot connection failed on attempt {$attempt}: " . $e->getMessage());

                if ($attempt < $this->maxRetries) {
                    sleep((int) pow(2, $attempt));
                    continue;
                }

                throw new UpstreamUnavailableException(
                    message: 'HubSpot connection failed: ' . $e->getMessage(),
                    statusCode: 503,
                    previous: $e
                );
            }
        }

        throw new UpstreamUnavailableException('HubSpot request exceeded maximum retry attempts.');
    }

    private function extractRetryAfter(Response $response): ?int
    {
        $header = $response->header('Retry-After');
        if ($header !== null && is_numeric($header)) {
            return (int) $header;
        }

        return null;
    }
}
