<?php

namespace App\Models;

use App\Enums\SyncStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use InvalidArgumentException;

class SyncAttempt extends Model
{
    use HasUuids;

    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'order_id',
        'status',
        'hubspot_deal_id',
        'hubspot_contact_id',
        'retry_of',
        'attempt_number',
        'failure_code',
        'failure_message',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'status' => SyncStatus::class,
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'attempt_number' => 'integer',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id', 'order_id');
    }

    public function parentAttempt(): BelongsTo
    {
        return $this->belongsTo(self::class, 'retry_of', 'id');
    }

    /**
     * Transition the attempt to a new status enforcing state machine rules.
     */
    public function transitionTo(SyncStatus $newStatus, ?string $failureCode = null, ?string $failureMessage = null): void
    {
        if (! $this->status->canTransitionTo($newStatus)) {
            throw new InvalidArgumentException("Illegal status transition from {$this->status->value} to {$newStatus->value}");
        }

        $this->status = $newStatus;

        if ($newStatus === SyncStatus::Processing) {
            $this->started_at = now();
        }

        if (in_array($newStatus, [SyncStatus::Success, self::statusFailureTarget()])) {
            $this->completed_at = now();
        }

        if ($failureCode !== null) {
            $this->failure_code = $failureCode;
        }

        if ($failureMessage !== null) {
            $this->failure_message = $failureMessage;
        }

        $this->save();
    }

    private static function statusFailureTarget(): SyncStatus
    {
        return SyncStatus::Failed;
    }
}
