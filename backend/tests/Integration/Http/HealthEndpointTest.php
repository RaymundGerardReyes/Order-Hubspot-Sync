<?php

namespace Tests\Integration\Http;

use App\Enums\SyncStatus;
use App\Models\SyncAttempt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class HealthEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_healthy_status_and_pending_failed_counts(): void
    {
        // 2 pending, 1 failed
        SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => 'ORD-H-1',
            'status' => SyncStatus::Pending,
            'attempt_number' => 1,
        ]);
        SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => 'ORD-H-2',
            'status' => SyncStatus::Pending,
            'attempt_number' => 1,
        ]);
        SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => 'ORD-H-3',
            'status' => SyncStatus::Failed,
            'attempt_number' => 1,
        ]);

        $response = $this->getJson('/api/health');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'healthy')
            ->assertJsonPath('database', 'connected')
            ->assertJsonPath('pendingSyncs', 2)
            ->assertJsonPath('failedSyncs', 1)
            ->assertJsonStructure(['status', 'database', 'pendingSyncs', 'failedSyncs', 'timestamp']);
    }
}
