<?php

namespace Tests\Integration\Console;

use App\Services\Hubspot\HubspotClient;
use Illuminate\Support\Facades\File;
use Mockery;
use Tests\Support\Fakes\FakeHubspot;
use Tests\TestCase;

class ExportHubspotDealsTest extends TestCase
{
    public function test_export_deals_command_handles_pagination_and_writes_expected_csv_headers(): void
    {
        FakeHubspot::paginatedDeals();

        // Bind real HubspotClient using Http::fake
        $this->app->instance(HubspotClient::class, new HubspotClient('fake_token', 'https://api.hubapi.com', 1));

        $outputPath = sys_get_temp_dir() . '/deals_export_test_' . uniqid() . '.csv';

        if (File::exists($outputPath)) {
            File::delete($outputPath);
        }

        $this->artisan("hubspot:export-deals --days=7 --output={$outputPath}")
            ->assertExitCode(0);

        $this->assertFileExists($outputPath);
        $content = File::get($outputPath);

        // Assert CSV headers
        $this->assertStringContainsString('Deal ID,Order ID,Deal Name,Amount,Stage,Close Date,Create Date', $content);

        // Assert both page 1 and page 2 deals are present
        $this->assertStringContainsString('dl_1001', $content);
        $this->assertStringContainsString('ORD-1001', $content);
        $this->assertStringContainsString('dl_1002', $content);
        $this->assertStringContainsString('ORD-1002', $content);

        File::delete($outputPath);
    }
}
