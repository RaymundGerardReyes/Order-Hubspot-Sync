<?php

namespace App\Enums;

enum SyncStatus: string
{
    case Pending = 'pending';
    case Processing = 'processing';
    case Success = 'success';
    case Failed = 'failed';

    /**
     * Determine if a transition from current status to target status is valid.
     */
    public function canTransitionTo(self $target): bool
    {
        return match ($this) {
            self::Pending => in_array($target, [self::Processing, self::Failed]),
            self::Processing => in_array($target, [self::Success, self::Failed]),
            self::Failed => $target === self::Pending, // Allowed during retry
            self::Success => false, // Terminal state
        };
    }
}
