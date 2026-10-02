<?php

namespace App\Services\Hubspot;

use App\DTOs\OrderData;
use App\Enums\SyncStatus;
use App\Models\Order;
use App\Models\SyncAttempt;
use Illuminate\Support\Facades\DB;
use Throwable;

class OrderSyncService
{
    public function __construct(
        private readonly HubspotGateway $gateway,
    ) {}

    /**
     * Synchronize order to HubSpot, associate records, and persist to database ledger.
     *
     * @throws Throwable
     */
    public function sync(OrderData $orderData, SyncAttempt $attempt): Order
    {
        $attempt->transitionTo(SyncStatus::Processing);

        try {
            // 1. Contact Creation / Lookup
            $contactId = $this->gateway->findOrCreateContact($orderData);

            // 2. Deal Creation / Lookup
            $dealId = $this->gateway->findOrCreateDeal($orderData);

            // 3. Associate Deal with Contact
            if ($dealId && $contactId) {
                $this->gateway->associateDealWithContact($dealId, $contactId);
            }

            // 4. Atomic Database Persistence
            $order = DB::transaction(function () use ($orderData, $dealId, $contactId, $attempt) {
                $createdOrder = Order::updateOrCreate(
                    ['order_id' => $orderData->orderId],
                    [
                        'hubspot_deal_id' => $dealId,
                        'hubspot_contact_id' => $contactId,
                        'total_amount' => $orderData->totalAmount,
                        'currency' => $orderData->currency,
                        'customer_email' => $orderData->customerEmail,
                        'payload' => $orderData->toArray(),
                    ]
                );

                $attempt->transitionTo(SyncStatus::Success);

                return $createdOrder;
            });

            return $order;

        } catch (Throwable $e) {
            $failureCode = method_exists($e, 'getStatusCode') ? (string) $e->getStatusCode() : '500';
            $attempt->transitionTo(SyncStatus::Failed, $failureCode, $e->getMessage());

            throw $e;
        }
    }
}
