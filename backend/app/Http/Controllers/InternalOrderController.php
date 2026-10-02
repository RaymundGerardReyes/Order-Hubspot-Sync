<?php

namespace App\Http\Controllers;

use App\Actions\ReceiveOrderAction;
use App\Http\Requests\OrderWebhookRequest;
use App\Http\Resources\SyncAttemptResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

class InternalOrderController extends Controller
{
    public function __construct(
        private readonly ReceiveOrderAction $receiveOrderAction,
    ) {}

    /**
     * Receive verified webhook payload forwarded by Node receiver.
     */
    public function store(OrderWebhookRequest $request): JsonResponse
    {
        $result = $this->receiveOrderAction->execute($request->validated());

        if ($result['status'] === 'duplicate') {
            return response()->json([
                'status' => 'duplicate',
                'message' => "Order {$result['order']->order_id} has already been synced.",
                'orderId' => $result['order']->order_id,
                'hubspotDealId' => $result['order']->hubspot_deal_id,
            ], 200);
        }

        return response()->json([
            'status' => 'accepted',
            'message' => 'Order accepted for processing.',
            'attempt' => new SyncAttemptResource($result['attempt']),
        ], 202);
    }
}
