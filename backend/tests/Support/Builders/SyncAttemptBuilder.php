<?php

namespace Tests\Support\Builders;

use App\Enums\SyncStatus;
use App\Models\Order;
use App\Models\SyncAttempt;
use Illuminate\Support\Str;

class SyncAttemptBuilder
{
    private string $orderId;
    private SyncStatus $status = SyncStatus::Pending;
    private ?string $retryOf = null;
    private int $attemptNumber = 1;
    private ?string $failureCode = null;
    private ?string $failureMessage = null;

    public function __construct()
    {
        $this->orderId = 'ORD-' . rand(10000, 99999);
    }

    public static function make(): self
    {
        return new self();
    }

    public function forOrder(Order|string $order): self
    {
        $this->orderId = $order instanceof Order ? $order->order_id : $order;
        return $this;
    }

    public function inStatus(SyncStatus $status): self
    {
        $this->status = $status;
        return $this;
    }

    public function pending(): self
    {
        return $this->inStatus(SyncStatus::Pending);
    }

    public function processing(): self
    {
        return $this->inStatus(SyncStatus::Processing);
    }

    public function successful(): self
    {
        return $this->inStatus(SyncStatus::Success);
    }

    public function failed(string $code = 'SYNC_ERROR', string $message = 'Failed to sync to HubSpot'): self
    {
        $this->status = SyncStatus::Failed;
        $this->failureCode = $code;
        $this->failureMessage = $message;
        return $this;
    }

    public function withRetryOf(SyncAttempt|string $parent): self
    {
        $this->retryOf = $parent instanceof SyncAttempt ? $parent->id : $parent;
        $this->attemptNumber = $parent instanceof SyncAttempt ? $parent->attempt_number + 1 : 2;
        return $this;
    }

    public function withAttemptNumber(int $num): self
    {
        $this->attemptNumber = $num;
        return $this;
    }

    public function create(array $attributes = []): SyncAttempt
    {
        // Ensure parent order exists if not already present
        Order::firstOrCreate(
            ['order_id' => $this->orderId],
            [
                'total_amount' => 99.99,
                'currency' => 'USD',
                'customer_email' => 'customer@example.com',
                'payload' => [
                    'order_id' => $this->orderId,
                    'customer' => ['email' => 'customer@example.com', 'name' => 'Test User'],
                    'items' => [['sku' => 'SKU-1', 'quantity' => 1, 'unitPrice' => 99.99]],
                    'total_amount' => 99.99,
                ],
            ]
        );

        return SyncAttempt::create(array_merge([
            'id' => (string) Str::uuid(),
            'order_id' => $this->orderId,
            'status' => $this->status,
            'retry_of' => $this->retryOf,
            'attempt_number' => $this->attemptNumber,
            'failure_code' => $this->failureCode,
            'failure_message' => $this->failureMessage,
            'started_at' => in_array($this->status, [SyncStatus::Processing, SyncStatus::Success, SyncStatus::Failed]) ? now() : null,
            'completed_at' => in_array($this->status, [SyncStatus::Success, SyncStatus::Failed]) ? now() : null,
        ], $attributes));
    }
}
