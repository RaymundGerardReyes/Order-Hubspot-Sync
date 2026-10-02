<?php

namespace Tests\Feature;

use App\Services\Hubspot\HubspotClient;
use Illuminate\Support\Facades\File;
use Mockery;
use Tests\TestCase;

class ExportTest extends TestCase
{
    public function test_export_deals_command_writes_valid_csv(): void
    {
        $mockClient = Mockery::mock(HubspotClient::class);
        $mockClient->shouldReceive('request')
            ->once()
            ->andReturn([
                'results' => [
                    [
                        'id' => '1001',
                        'properties' => [
                            'order_id' => 'ORD-EXP-1',
                            'dealname' => 'Order #ORD-EXP-1 - Test',
                            'amount' => '120.00',
                            'dealstage' => 'closedwon',
                            'closedate' => '2026-10-01T00:00:00Z',
                            'createdate' => '2026-10-01T00:00:00Z',
                        ],
                    ],
                ],
                'paging' => null,
            ]);

        $this->app->instance(HubspotClient::class, $mockClient);

        $outputPath = storage_path('framework/testing_deals_export.csv');
        if (File::exists($outputPath)) {
            File::delete($outputPath);
        }

        $this->artisan("hubspot:export-deals --days=7 --output={$outputPath}")
            ->assertExitCode(0);

        $this->assertFileExists($outputPath);
        $content = File::get($outputPath);
        $this->assertStringContainsString('Deal ID,Order ID,Deal Name,Amount,Stage,Close Date,Create Date', $content);
        $this->assertStringContainsString('ORD-EXP-1', $content);

        File::delete($outputPath);
    }
}
