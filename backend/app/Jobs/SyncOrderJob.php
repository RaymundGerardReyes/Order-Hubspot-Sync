<?php

namespace App\Jobs;

use App\DTOs\OrderData;
use App\Models\SyncAttempt;
use App\Services\Hubspot\OrderSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncOrderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;

    public function __construct(
        public readonly string $attemptId,
        public readonly array $orderPayload,
    ) {}

    /**
     * Execute the job with an atomic order-level lock.
     */
    public function handle(OrderSyncService $syncService): void
    {
        $attempt = SyncAttempt::find($this->attemptId);
        if (! $attempt) {
            Log::error("SyncOrderJob: Attempt {$this->attemptId} not found.");
            return;
        }

        $orderData = OrderData::fromArray($this->orderPayload);
        $lockKey = "order_sync_lock:{$orderData->orderId}";

        // Acquire 30s atomic lock per order to prevent race conditions
        $lock = Cache::lock($lockKey, 30);

        $lock->block(10, function () use ($syncService, $orderData, $attempt) {
            try {
                $syncService->sync($orderData, $attempt);
            } catch (Throwable $e) {
                Log::warning("SyncOrderJob failed for order {$orderData->orderId}: {$e->getMessage()}");
                throw $e;
            }
        });
    }
}
