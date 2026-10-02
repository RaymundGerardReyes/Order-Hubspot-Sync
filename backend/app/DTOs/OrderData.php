<?php

namespace App\DTOs;

class OrderData
{
    /**
     * @param array<int, array{sku: string, name: string, quantity: int, unitPrice: float}> $items
     */
    public function __construct(
        public readonly string $orderId,
        public readonly string $customerEmail,
        public readonly string $customerName,
        public readonly float $totalAmount,
        public readonly string $currency,
        public readonly array $items,
        public readonly string $createdAt,
        public readonly ?string $customerFirstName = null,
        public readonly ?string $customerLastName = null,
        public readonly ?string $customerPhone = null,
    ) {}

    /**
     * Build an OrderData instance from a webhook payload array.
     */
    public static function fromArray(array $payload): self
    {
        $customer = $payload['customer'] ?? [];
        $rawItems = $payload['items'] ?? [];

        // Resolve customer name parts
        $firstName = $customer['first_name'] ?? null;
        $lastName = $customer['last_name'] ?? null;
        $phone = $customer['phone'] ?? null;

        $name = $customer['name'] ?? $payload['customer_name'] ?? null;
        if (empty($name)) {
            $assembledName = trim(($firstName ?? '') . ' ' . ($lastName ?? ''));
            $name = ! empty($assembledName) ? $assembledName : 'Guest Customer';
        }

        // If first/last name weren't provided explicitly, split name
        if (empty($firstName) && empty($lastName) && ! empty($name) && $name !== 'Guest Customer') {
            $parts = explode(' ', trim($name), 2);
            $firstName = $parts[0] ?? null;
            $lastName = $parts[1] ?? null;
        }

        // Normalize item fields (quantity vs qty, unitPrice vs price)
        $normalizedItems = array_map(function ($item) {
            return [
                'sku' => (string) ($item['sku'] ?? ''),
                'name' => (string) ($item['name'] ?? ''),
                'quantity' => (int) ($item['quantity'] ?? $item['qty'] ?? 1),
                'unitPrice' => (float) ($item['unitPrice'] ?? $item['price'] ?? 0.0),
            ];
        }, $rawItems);

        $totalAmount = (float) (
            $payload['total'] ??
            $payload['totalAmount'] ??
            $payload['total_amount'] ??
            0.0
        );

        return new self(
            orderId: (string) ($payload['order_id'] ?? $payload['orderId'] ?? ''),
            customerEmail: (string) ($customer['email'] ?? $payload['customer_email'] ?? ''),
            customerName: (string) $name,
            totalAmount: $totalAmount,
            currency: (string) ($payload['currency'] ?? 'USD'),
            items: $normalizedItems,
            createdAt: (string) ($payload['created_at'] ?? $payload['createdAt'] ?? now()->toIso8601String()),
            customerFirstName: $firstName,
            customerLastName: $lastName,
            customerPhone: $phone,
        );
    }

    /**
     * Convert DTO to standard array representation.
     */
    public function toArray(): array
    {
        return [
            'order_id' => $this->orderId,
            'customer_email' => $this->customerEmail,
            'customer_name' => $this->customerName,
            'customer_first_name' => $this->customerFirstName,
            'customer_last_name' => $this->customerLastName,
            'customer_phone' => $this->customerPhone,
            'total_amount' => $this->totalAmount,
            'currency' => $this->currency,
            'items' => $this->items,
            'created_at' => $this->createdAt,
        ];
    }
}
