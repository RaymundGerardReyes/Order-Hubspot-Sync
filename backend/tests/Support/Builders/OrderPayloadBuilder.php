<?php

namespace Tests\Support\Builders;

class OrderPayloadBuilder
{
    private array $data;

    public function __construct()
    {
        $this->data = [
            'order_id' => 'ORD-' . rand(10000, 99999),
            'customer' => [
                'name' => 'John Doe',
                'email' => 'john.doe@example.com',
                'phone' => '+15551234567',
            ],
            'items' => [
                [
                    'sku' => 'SKU-001',
                    'name' => 'Premium Widget',
                    'quantity' => 2,
                    'unitPrice' => 29.99,
                ],
            ],
            'total_amount' => 59.98,
            'currency' => 'USD',
            'created_at' => now()->toIso8601String(),
        ];
    }

    public static function make(): self
    {
        return new self();
    }

    public function withOrderId(string $orderId): self
    {
        $this->data['order_id'] = $orderId;
        return $this;
    }

    public function withCustomer(string $email, ?string $name = null, ?string $phone = null): self
    {
        $this->data['customer'] = array_filter([
            'email' => $email,
            'name' => $name,
            'phone' => $phone,
        ], fn ($val) => $val !== null);

        return $this;
    }

    public function withoutPhone(): self
    {
        unset($this->data['customer']['phone']);
        return $this;
    }

    public function withItems(array $items): self
    {
        $this->data['items'] = $items;
        return $this;
    }

    public function withTotal(float $amount, string $currency = 'USD'): self
    {
        $this->data['total_amount'] = $amount;
        $this->data['currency'] = $currency;
        return $this;
    }

    public function withCreatedAt(string $createdAt): self
    {
        $this->data['created_at'] = $createdAt;
        return $this;
    }

    public function asCamelCase(): self
    {
        $this->data['orderId'] = $this->data['order_id'];
        unset($this->data['order_id']);

        $this->data['totalAmount'] = $this->data['total_amount'];
        unset($this->data['total_amount']);

        $this->data['createdAt'] = $this->data['created_at'];
        unset($this->data['created_at']);

        return $this;
    }

    public function build(): array
    {
        return $this->data;
    }
}
