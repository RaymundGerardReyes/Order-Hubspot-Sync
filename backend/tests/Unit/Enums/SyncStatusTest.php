<?php

namespace Tests\Unit\Enums;

use App\Enums\SyncStatus;
use PHPUnit\Framework\TestCase;

class SyncStatusTest extends TestCase
{
    public function test_it_defines_expected_sync_statuses(): void
    {
        $this->assertSame('pending', SyncStatus::Pending->value);
        $this->assertSame('processing', SyncStatus::Processing->value);
        $this->assertSame('success', SyncStatus::Success->value);
        $this->assertSame('failed', SyncStatus::Failed->value);
    }

    public function test_it_validates_allowed_transitions(): void
    {
        // Pending transitions
        $this->assertTrue(SyncStatus::Pending->canTransitionTo(SyncStatus::Processing));
        $this->assertTrue(SyncStatus::Pending->canTransitionTo(SyncStatus::Failed));

        // Processing transitions
        $this->assertTrue(SyncStatus::Processing->canTransitionTo(SyncStatus::Success));
        $this->assertTrue(SyncStatus::Processing->canTransitionTo(SyncStatus::Failed));

        // Failed transition (retry)
        $this->assertTrue(SyncStatus::Failed->canTransitionTo(SyncStatus::Pending));
    }

    public function test_it_prevents_illegal_transitions(): void
    {
        // Pending cannot skip to success
        $this->assertFalse(SyncStatus::Pending->canTransitionTo(SyncStatus::Success));

        // Processing cannot revert to pending
        $this->assertFalse(SyncStatus::Processing->canTransitionTo(SyncStatus::Pending));

        // Success is terminal
        $this->assertFalse(SyncStatus::Success->canTransitionTo(SyncStatus::Pending));
        $this->assertFalse(SyncStatus::Success->canTransitionTo(SyncStatus::Processing));
        $this->assertFalse(SyncStatus::Success->canTransitionTo(SyncStatus::Failed));

        // Failed cannot skip directly to success or processing
        $this->assertFalse(SyncStatus::Failed->canTransitionTo(SyncStatus::Success));
        $this->assertFalse(SyncStatus::Failed->canTransitionTo(SyncStatus::Processing));
    }
}
