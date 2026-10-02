<?php

namespace App\Actions;

use App\DTOs\OrderData;
use App\Enums\SyncStatus;
use App\Jobs\SyncOrderJob;
use App\Models\Order;
use App\Models\SyncAttempt;
use Illuminate\Support\Str;

class ReceiveOrderAction
{
    /**
     * Deduplicate incoming order, initialize pending attempt, and dispatch background job.
     *
     * @return array{status: string, attempt: ?SyncAttempt, order: ?Order}
     */
    public function execute(array $payload): array
    {
        $orderData = OrderData::fromArray($payload);

        // 1. Idempotency Check: Already synced orders are not re-processed
        $existingOrder = Order::where('order_id', $orderData->orderId)->first();
        if ($existingOrder !== null) {
            return [
                'status' => 'duplicate',
                'attempt' => null,
                'order' => $existingOrder,
            ];
        }

        // 2. Count existing attempts for this order
        $attemptNumber = SyncAttempt::where('order_id', $orderData->orderId)->count() + 1;

        // 3. Create Pending Attempt
        $attempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => $orderData->orderId,
            'status' => SyncStatus::Pending,
            'attempt_number' => $attemptNumber,
        ]);

        // 4. Dispatch Async Job
        SyncOrderJob::dispatch($attempt->id, $payload);

        return [
            'status' => 'accepted',
            'attempt' => $attempt,
            'order' => null,
        ];
    }
}
