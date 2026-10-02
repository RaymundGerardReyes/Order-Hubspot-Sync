<?php

namespace App\Actions;

use App\Enums\SyncStatus;
use App\Jobs\SyncOrderJob;
use App\Models\Order;
use App\Models\SyncAttempt;
use Illuminate\Support\Str;
use InvalidArgumentException;

class RetryAttemptAction
{
    /**
     * Create a new pending attempt referencing a failed attempt and dispatch.
     *
     * @throws InvalidArgumentException
     */
    public function execute(string $attemptId): SyncAttempt
    {
        $failedAttempt = SyncAttempt::findOrFail($attemptId);

        if ($failedAttempt->status !== SyncStatus::Failed) {
            throw new InvalidArgumentException("Only failed attempts can be retried. Current status: {$failedAttempt->status->value}");
        }

        // Check if order was already successfully synced
        $order = Order::where('order_id', $failedAttempt->order_id)->first();
        if ($order !== null) {
            throw new InvalidArgumentException("Order {$failedAttempt->order_id} has already been successfully synced.");
        }

        $nextAttemptNumber = SyncAttempt::where('order_id', $failedAttempt->order_id)->count() + 1;

        $newAttempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => $failedAttempt->order_id,
            'status' => SyncStatus::Pending,
            'retry_of' => $failedAttempt->id,
            'attempt_number' => $nextAttemptNumber,
        ]);

        // Retrieve payload from order or prior attempt
        $payload = $order?->payload ?? ['order_id' => $failedAttempt->order_id];

        SyncOrderJob::dispatch($newAttempt->id, $payload);

        return $newAttempt;
    }
}
