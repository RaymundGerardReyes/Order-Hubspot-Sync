<?php

namespace App\Http\Controllers;

use App\Actions\RetryAttemptAction;
use App\Http\Resources\SyncAttemptResource;
use App\Models\SyncAttempt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;
use InvalidArgumentException;

class SyncAttemptController extends Controller
{
    public function __construct(
        private readonly RetryAttemptAction $retryAttemptAction,
    ) {}

    /**
     * Get the latest 50 sync attempts for dashboard visibility.
     */
    public function index(): AnonymousResourceCollection
    {
        $attempts = SyncAttempt::query()
            ->latest('created_at')
            ->limit(50)
            ->get();

        return SyncAttemptResource::collection($attempts);
    }

    /**
     * Trigger a retry for a failed attempt.
     */
    public function retry(string $id): JsonResponse
    {
        try {
            $newAttempt = $this->retryAttemptAction->execute($id);

            return response()->json([
                'status' => 'accepted',
                'message' => 'Retry attempt successfully scheduled.',
                'attempt' => new SyncAttemptResource($newAttempt),
            ], 202);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'error' => 'Conflict: Cannot retry this sync attempt.',
                'message' => $e->getMessage(),
            ], 409);
        }
    }
}
