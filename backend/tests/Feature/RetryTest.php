<?php

namespace Tests\Feature;

use App\Actions\RetryAttemptAction;
use App\Enums\SyncStatus;
use App\Models\SyncAttempt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Tests\TestCase;

class RetryTest extends TestCase
{
    use RefreshDatabase;

    public function test_failed_attempt_can_be_retried_successfully(): void
    {
        Queue::fake();

        $failedAttempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => 'ORD-FAIL-01',
            'status' => SyncStatus::Failed,
            'failure_code' => '503',
            'failure_message' => 'HubSpot timeout',
            'attempt_number' => 1,
        ]);

        $action = new RetryAttemptAction();
        $newAttempt = $action->execute($failedAttempt->id);

        $this->assertSame(SyncStatus::Pending, $newAttempt->status);
        $this->assertSame($failedAttempt->id, $newAttempt->retry_of);
        $this->assertSame(2, $newAttempt->attempt_number);
    }

    public function test_non_failed_attempt_cannot_be_retried(): void
    {
        $pendingAttempt = SyncAttempt::create([
            'id' => (string) Str::uuid(),
            'order_id' => 'ORD-PENDING-01',
            'status' => SyncStatus::Pending,
            'attempt_number' => 1,
        ]);

        $this->expectException(InvalidArgumentException::class);

        $action = new RetryAttemptAction();
        $action->execute($pendingAttempt->id);
    }
}
