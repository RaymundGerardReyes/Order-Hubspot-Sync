<?php

namespace Tests\Unit\Models;

use App\Enums\SyncStatus;
use App\Models\SyncAttempt;
use InvalidArgumentException;
use Tests\TestCase;

class SyncAttemptTransitionTest extends TestCase
{
    public function test_it_transitions_from_pending_to_processing_and_sets_started_at(): void
    {
        $attempt = new SyncAttempt([
            'id' => 'att_test_1',
            'order_id' => 'ORD-101',
            'status' => SyncStatus::Pending,
            'attempt_number' => 1,
        ]);

        $attempt->transitionTo(SyncStatus::Processing);

        $this->assertSame(SyncStatus::Processing, $attempt->status);
        $this->assertNotNull($attempt->started_at);
        $this->assertNull($attempt->completed_at);
    }

    public function test_it_transitions_from_processing_to_success_and_sets_completed_at(): void
    {
        $attempt = new SyncAttempt([
            'id' => 'att_test_2',
            'order_id' => 'ORD-102',
            'status' => SyncStatus::Processing,
            'attempt_number' => 1,
            'started_at' => now()->subMinute(),
        ]);

        $attempt->transitionTo(SyncStatus::Success);

        $this->assertSame(SyncStatus::Success, $attempt->status);
        $this->assertNotNull($attempt->completed_at);
        $this->assertNull($attempt->failure_code);
    }

    public function test_it_transitions_from_processing_to_failed_recording_reason(): void
    {
        $attempt = new SyncAttempt([
            'id' => 'att_test_3',
            'order_id' => 'ORD-103',
            'status' => SyncStatus::Processing,
            'attempt_number' => 1,
            'started_at' => now()->subMinute(),
        ]);

        $attempt->transitionTo(SyncStatus::Failed, 'HUBSPOT_400', 'Missing required deal property');

        $this->assertSame(SyncStatus::Failed, $attempt->status);
        $this->assertSame('HUBSPOT_400', $attempt->failure_code);
        $this->assertSame('Missing required deal property', $attempt->failure_message);
        $this->assertNotNull($attempt->completed_at);
    }

    public function test_it_throws_exception_on_illegal_transition(): void
    {
        $attempt = new SyncAttempt([
            'id' => 'att_test_4',
            'order_id' => 'ORD-104',
            'status' => SyncStatus::Pending,
            'attempt_number' => 1,
        ]);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Illegal status transition from pending to success');

        // Cannot skip directly from Pending to Success without Processing
        $attempt->transitionTo(SyncStatus::Success);
    }
}
