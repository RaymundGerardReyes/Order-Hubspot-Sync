<?php

namespace App\Services\Hubspot;

use App\DTOs\OrderData;
use Carbon\Carbon;

class DealMapper
{
    /**
     * Map OrderData to HubSpot Deal properties.
     *
     * @return array<string, mixed>
     */
    public function toDealProperties(OrderData $orderData, string $pipeline = 'default', string $dealstage = 'closedwon'): array
    {
        // HubSpot closedate requires midnight UTC in ISO8601 UTC
        $closeDateUtc = Carbon::parse($orderData->createdAt)->utc()->startOfDay()->toIso8601String();

        return [
            'dealname' => "Order #{$orderData->orderId} - {$orderData->customerName}",
            'amount' => (string) number_format($orderData->totalAmount, 2, '.', ''),
            'pipeline' => $pipeline,
            'dealstage' => $dealstage,
            'closedate' => $closeDateUtc,
            'order_id' => $orderData->orderId,
            'currency' => $orderData->currency,
        ];
    }

    /**
     * Map OrderData to HubSpot Contact properties (including optional phone).
     *
     * @return array<string, mixed>
     */
    public function toContactProperties(OrderData $orderData): array
    {
        $properties = [
            'email' => $orderData->customerEmail,
            'firstname' => (string) ($orderData->customerFirstName ?? ''),
            'lastname' => (string) ($orderData->customerLastName ?? ''),
        ];

        if (! empty($orderData->customerPhone)) {
            $properties['phone'] = $orderData->customerPhone;
        }

        return $properties;
    }
}
