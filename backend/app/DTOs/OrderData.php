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
    ) {}

    /**
     * Build an OrderData instance from a webhook payload array.
     */
    public static function fromArray(array $payload): self
    {
        $customer = $payload['customer'] ?? [];
        $items = $payload['items'] ?? [];

        return new self(
            orderId: (string) ($payload['orderId'] ?? $payload['order_id'] ?? ''),
            customerEmail: (string) ($customer['email'] ?? $payload['customer_email'] ?? ''),
            customerName: (string) ($customer['name'] ?? $payload['customer_name'] ?? 'Guest Customer'),
            totalAmount: (float) ($payload['totalAmount'] ?? $payload['total_amount'] ?? 0.0),
            currency: (string) ($payload['currency'] ?? 'USD'),
            items: $items,
            createdAt: (string) ($payload['createdAt'] ?? $payload['created_at'] ?? now()->toIso8601String()),
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
            'total_amount' => $this->totalAmount,
            'currency' => $this->currency,
            'items' => $this->items,
            'created_at' => $this->createdAt,
        ];
    }
}
