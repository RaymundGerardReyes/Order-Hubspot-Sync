<?php

namespace App\Services\Hubspot;

use App\DTOs\OrderData;

class HubspotGateway
{
    public function __construct(
        private readonly HubspotClient $client,
        private readonly DealMapper $mapper,
    ) {}

    /**
     * Find existing contact by email or create a new contact.
     */
    public function findOrCreateContact(OrderData $orderData): string
    {
        $contactProperties = $this->mapper->toContactProperties($orderData);

        // Try searching for contact by email
        $searchPayload = [
            'filterGroups' => [
                [
                    'filters' => [
                        [
                            'propertyName' => 'email',
                            'operator' => 'EQ',
                            'value' => $orderData->customerEmail,
                        ],
                    ],
                ],
            ],
            'limit' => 1,
        ];

        $searchResult = $this->client->request('POST', 'crm/v3/objects/contacts/search', $searchPayload);

        if (! empty($searchResult['results'][0]['id'])) {
            return (string) $searchResult['results'][0]['id'];
        }

        // Create contact
        $createResult = $this->client->request('POST', 'crm/v3/objects/contacts', [
            'properties' => $contactProperties,
        ]);

        return (string) ($createResult['id'] ?? '');
    }

    /**
     * Create or find deal for this order.
     */
    public function findOrCreateDeal(OrderData $orderData): string
    {
        // Search if deal already exists with order_id
        $searchPayload = [
            'filterGroups' => [
                [
                    'filters' => [
                        [
                            'propertyName' => 'order_id',
                            'operator' => 'EQ',
                            'value' => $orderData->orderId,
                        ],
                    ],
                ],
            ],
            'limit' => 1,
        ];

        $searchResult = $this->client->request('POST', 'crm/v3/objects/deals/search', $searchPayload);

        if (! empty($searchResult['results'][0]['id'])) {
            return (string) $searchResult['results'][0]['id'];
        }

        $dealProperties = $this->mapper->toDealProperties(
            $orderData,
            pipeline: (string) config('services.hubspot.pipeline_id', 'default'),
            dealstage: (string) config('services.hubspot.stage_id', 'closedwon')
        );

        $createResult = $this->client->request('POST', 'crm/v3/objects/deals', [
            'properties' => $dealProperties,
        ]);

        return (string) ($createResult['id'] ?? '');
    }

    /**
     * Associate a deal with a contact in HubSpot.
     */
    public function associateDealWithContact(string $dealId, string $contactId): void
    {
        // Association type 3: Deal to Contact
        $this->client->request(
            'PUT',
            "crm/v3/objects/deals/{$dealId}/associations/contacts/{$contactId}/3"
        );
    }
}
