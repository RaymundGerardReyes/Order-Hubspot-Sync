<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SyncAttemptResource extends JsonResource
{
    /**
     * Transform the resource into an array mirroring frontend TypeScript contract.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'orderId' => (string) $this->order_id,
            'status' => $this->status instanceof \BackedEnum ? $this->status->value : (string) $this->status,
            'retryOf' => $this->retry_of ? (string) $this->retry_of : null,
            'attemptNumber' => (int) $this->attempt_number,
            'failureCode' => $this->failure_code ? (string) $this->failure_code : null,
            'failureMessage' => $this->failure_message ? (string) $this->failure_message : null,
            'startedAt' => $this->started_at?->toIso8601String(),
            'completedAt' => $this->completed_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
