<?php

namespace Tests\Integration\Jobs;

use App\Enums\SyncStatus;
use App\Jobs\SyncOrderJob;
use App\Models\SyncAttempt;
use App\Services\Hubspot\OrderSyncService;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Mockery;
use Tests\Support\Builders\OrderPayloadBuilder;
use Tests\TestCase;

class SyncOrderJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_acquires_lock_and_delegates_to_sync_service(): void
    {
        $payload = OrderPayloadBuilder::make()
            ->withOrderId('ORD-JOB-001')
            ->build();

        $attempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => 'ORD-JOB-001',
            'status' => SyncStatus::Pending,
            'attempt_number' => 1,
        ]);

        $mockSyncService = Mockery::mock(OrderSyncService::class);
        $mockSyncService->shouldReceive('sync')
            ->once()
            ->andReturnUsing(function ($orderData, $syncAttempt) {
                $syncAttempt->transitionTo(SyncStatus::Processing);
                $syncAttempt->transitionTo(SyncStatus::Success);
            });

        $job = new SyncOrderJob($attempt->id, $payload);
        $job->handle($mockSyncService);

        $attempt->refresh();
        $this->assertSame(SyncStatus::Success, $attempt->status);
    }

    public function test_it_rethrows_exception_when_sync_fails_for_queue_worker_retry(): void
    {
        $payload = OrderPayloadBuilder::make()
            ->withOrderId('ORD-JOB-ERR')
            ->build();

        $attempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => 'ORD-JOB-ERR',
            'status' => SyncStatus::Pending,
            'attempt_number' => 1,
        ]);

        $mockSyncService = Mockery::mock(OrderSyncService::class);
        $mockSyncService->shouldReceive('sync')
            ->once()
            ->andThrow(new Exception('Temporary network drop'));

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Temporary network drop');

        $job = new SyncOrderJob($attempt->id, $payload);
        $job->handle($mockSyncService);
    }
}
