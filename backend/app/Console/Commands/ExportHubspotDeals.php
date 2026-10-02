<?php

namespace App\Console\Commands;

use App\Services\Hubspot\HubspotClient;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ExportHubspotDeals extends Command
{
    protected $signature = 'hubspot:export-deals 
                            {--days=7 : Number of days to look back} 
                            {--output=deals_export.csv : Output file path}';

    protected $description = 'Export recent HubSpot deals created within the specified days to CSV (Language B export)';

    public function handle(HubspotClient $client): int
    {
        $days = (int) $this->option('days');
        $outputPath = (string) $this->option('output');
        $cutoffDate = Carbon::now()->subDays($days)->utc()->toIso8601String();

        $this->info("Fetching HubSpot deals created since {$cutoffDate}...");

        $properties = ['dealname', 'amount', 'dealstage', 'closedate', 'createdate', 'order_id'];
        $after = null;
        $allDeals = [];

        do {
            $payload = [
                'properties' => $properties,
                'limit' => 100,
            ];

            if ($after !== null) {
                $payload['after'] = $after;
            }

            $response = $client->request('POST', 'crm/v3/objects/deals/search', [
                'filterGroups' => [
                    [
                        'filters' => [
                            [
                                'propertyName' => 'createdate',
                                'operator' => 'GTE',
                                'value' => $cutoffDate,
                            ],
                        ],
                    ],
                ],
                'properties' => $properties,
                'limit' => 100,
                'after' => $after,
            ]);

            $results = $response['results'] ?? [];
            foreach ($results as $deal) {
                $props = $deal['properties'] ?? [];
                $allDeals[] = [
                    'deal_id' => $deal['id'] ?? '',
                    'order_id' => $props['order_id'] ?? '',
                    'dealname' => $props['dealname'] ?? '',
                    'amount' => $props['amount'] ?? '0.00',
                    'stage' => $props['dealstage'] ?? '',
                    'closedate' => $props['closedate'] ?? '',
                    'createdate' => $props['createdate'] ?? '',
                ];
            }

            $after = $response['paging']['next']['after'] ?? null;
        } while ($after !== null);

        $this->info("Found " . count($allDeals) . " deals. Writing to {$outputPath}...");

        $fp = fopen($outputPath, 'w');
        if ($fp === false) {
            $this->error("Failed to open output file: {$outputPath}");
            return 1;
        }

        // CSV Headers
        fputcsv($fp, ['Deal ID', 'Order ID', 'Deal Name', 'Amount', 'Stage', 'Close Date', 'Create Date']);

        foreach ($allDeals as $row) {
            fputcsv($fp, $row);
        }

        fclose($fp);

        $this->info("Deals successfully exported to {$outputPath}");
        return 0;
    }
}
