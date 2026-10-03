#!/usr/bin/env php
<?php

/**
 * HubSpot 7-Day Deal Exporter (Language B — PHP)
 *
 * Req 28: A small script that exports all deals created in the last 7 days
 * from HubSpot to a CSV file for the client's accounting team.
 *
 * Usage:
 *   php export-deals.php
 *   php export-deals.php --days=7 --output=deals.csv
 *   php export-deals.php --days=14 --output=storage/exports/deals.csv
 *
 * Environment variables required:
 *   HUBSPOT_ACCESS_TOKEN — HubSpot Service Key or private app bearer token
 *
 * Dependencies: None. Pure PHP, no Composer packages required.
 */

declare(strict_types=1);

// ─── Load environment from .env file if present ───────────────────────────

function loadEnv(string $path): void
{
    if (!file_exists($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key   = trim($key);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        $_ENV[$key] = $value;
        putenv("{$key}={$value}");
    }
}

// Multi-path environment traversal
loadEnv(__DIR__ . '/../.env');
loadEnv(__DIR__ . '/.env');
loadEnv(getcwd() . '/.env');

// ─── Parse CLI arguments ───────────────────────────────────────────────────

$options = getopt('', ['days::', 'output::']);
$days    = (int) ($options['days'] ?? 7);
$output  = (string) ($options['output'] ?? 'deals_export.csv');

// ─── Validate environment ──────────────────────────────────────────────────

$accessToken = getenv('HUBSPOT_ACCESS_TOKEN');
if (!$accessToken) {
    fwrite(STDERR, "Error: HUBSPOT_ACCESS_TOKEN environment variable is required.\n");
    exit(1);
}

if (str_contains($accessToken, 'replace-with')) {
    fwrite(STDERR, "Warning: HUBSPOT_ACCESS_TOKEN in .env is set to a placeholder:\n");
    fwrite(STDERR, "         '{$accessToken}'\n");
    fwrite(STDERR, "         Please update your .env with a valid HubSpot Service Key or Private App token.\n\n");
}

// ─── Configuration ─────────────────────────────────────────────────────────

$baseUrl = rtrim((string) (getenv('HUBSPOT_BASE_URL') ?: 'https://api.hubapi.com'), '/');
const REQUEST_PROPERTIES = [
    'hs_object_id',
    'dealname',
    'amount',
    'closedate',
    'pipeline',
    'dealstage',
    'createdate',
    'external_order_id',
];
const TIMEOUT_SECONDS = 30;

// ─── Calculate cutoff timestamp ────────────────────────────────────────────

$cutoffTimestamp = (new DateTimeImmutable("now", new DateTimeZone('UTC')))
    ->modify("-{$days} days")
    ->format(DateTimeInterface::ATOM);

fwrite(STDOUT, "Fetching HubSpot deals created since {$cutoffTimestamp} (last {$days} days)...\n");

// ─── HubSpot API helper ────────────────────────────────────────────────────

/**
 * Send an authenticated HTTP request to the HubSpot API.
 * Returns the decoded JSON response array or throws on error.
 *
 * @return array<string, mixed>
 */
function hubspotRequest(string $method, string $path, array $body = [], string $token = '', string $baseUrl = 'https://api.hubapi.com'): array
{
    $url = $baseUrl . '/' . ltrim($path, '/');

    $headers = [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
        'Accept: application/json',
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => TIMEOUT_SECONDS,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_CUSTOMREQUEST  => $method,
    ]);

    if ($method === 'POST' && !empty($body)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $responseBody = curl_exec($ch);
    $httpStatus   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError    = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        throw new RuntimeException("cURL error: {$curlError}");
    }

    $decoded = json_decode((string) $responseBody, true);
    if ($httpStatus < 200 || $httpStatus >= 300) {
        $message = $decoded['message'] ?? $responseBody;
        throw new RuntimeException("HubSpot API error {$httpStatus}: {$message}");
    }

    return (array) ($decoded ?? []);
}

// ─── Paginate through all HubSpot deals in the last N days ────────────────

$after   = null;
$written = 0;

// Ensure output directory exists
$outputDir = dirname($output);
if ($outputDir && $outputDir !== '.' && !is_dir($outputDir)) {
    if (!mkdir($outputDir, 0755, true)) {
        fwrite(STDERR, "Error: Cannot create output directory: {$outputDir}\n");
        exit(1);
    }
}

$fp = @fopen($output, 'w');
if ($fp === false) {
    if (file_exists($output)) {
        // Target file exists and is locked by an external application (e.g. Microsoft Excel on Windows).
        // Automatically fallback to a timestamped file so the export never crashes or fails!
        $fallbackOutput = preg_replace('/\.csv$/i', '_' . date('Ymd_His') . '.csv', $output);
        if ($fallbackOutput === $output) {
            $fallbackOutput = $output . '_' . date('Ymd_His') . '.csv';
        }

        fwrite(STDERR, "[Notice] Target '{$output}' is currently locked by another application (e.g., Microsoft Excel).\n");
        fwrite(STDERR, "[Notice] Automatically redirecting output to: {$fallbackOutput}\n\n");

        $output = $fallbackOutput;
        $fp     = @fopen($output, 'w');
    }
}

if ($fp === false) {
    fwrite(STDERR, "Error: Cannot open output file for writing: {$output}\n");
    $err = error_get_last();
    if ($err && isset($err['message'])) {
        fwrite(STDERR, "Details: {$err['message']}\n");
    }
    exit(1);
}

// Write CSV header (always written even when no deals found — analysis doc §Language B)
fputcsv($fp, [
    'hubspot_deal_id',
    'deal_name',
    'amount',
    'close_date',
    'pipeline',
    'deal_stage',
    'created_at',
    'external_order_id',
], ',', '"', "\\");

try {
    do {
        $requestBody = [
            'filterGroups' => [[
                'filters' => [[
                    'propertyName' => 'createdate',
                    'operator'     => 'GTE',
                    'value'        => $cutoffTimestamp,
                ]],
            ]],
            'properties' => REQUEST_PROPERTIES,
            'sorts'      => [['propertyName' => 'createdate', 'direction' => 'DESCENDING']],
            'limit'      => 100,
        ];

        if ($after !== null) {
            $requestBody['after'] = $after;
        }

        $response = hubspotRequest('POST', 'crm/v3/objects/deals/search', $requestBody, $accessToken, $baseUrl);

        $results = $response['results'] ?? [];

        foreach ($results as $deal) {
            $props = $deal['properties'] ?? [];
            fputcsv($fp, [
                $deal['id']                      ?? '',
                $props['dealname']               ?? '',
                $props['amount']                 ?? '',
                $props['closedate']              ?? '',
                $props['pipeline']               ?? '',
                $props['dealstage']              ?? '',
                $props['createdate']             ?? '',
                $props['external_order_id']      ?? '',
            ], ',', '"', "\\");
            $written++;
        }

        // Follow pagination cursor
        $after = $response['paging']['next']['after'] ?? null;

        if ($after !== null) {
            fwrite(STDOUT, "  Fetched {$written} deals so far, fetching next page...\n");
        }
    } while ($after !== null);

} catch (RuntimeException $e) {
    fclose($fp);
    fwrite(STDERR, "Error: " . $e->getMessage() . "\n");
    exit(1);
}

fclose($fp);

fwrite(STDOUT, "Exported {$written} deal(s) to: {$output}\n");
if ($written === 0) {
    fwrite(STDOUT, "No deals found in the last {$days} days (CSV header still written).\n");
}
exit(0);
