<?php

namespace Tests\Unit\DTOs;

use App\DTOs\OrderData;
use PHPUnit\Framework\TestCase;

class OrderDataTest extends TestCase
{
    public function test_it_creates_order_data_from_snake_case_array(): void
    {
        $payload = [
            'order_id' => 'ORD-999',
            'customer' => [
                'name' => 'Alice Smith',
                'email' => 'alice@example.com',
            ],
            'total_amount' => 199.50,
            'currency' => 'EUR',
            'items' => [
                ['sku' => 'SKU-A', 'name' => 'Item A', 'quantity' => 1, 'unitPrice' => 199.50],
            ],
            'created_at' => '2026-10-02T10:00:00Z',
        ];

        $dto = OrderData::fromArray($payload);

        $this->assertSame('ORD-999', $dto->orderId);
        $this->assertSame('alice@example.com', $dto->customerEmail);
        $this->assertSame('Alice Smith', $dto->customerName);
        $this->assertSame(199.50, $dto->totalAmount);
        $this->assertSame('EUR', $dto->currency);
        $this->assertCount(1, $dto->items);
        $this->assertSame('2026-10-02T10:00:00Z', $dto->createdAt);
    }

    public function test_it_creates_order_data_from_camel_case_array(): void
    {
        $payload = [
            'orderId' => 'ORD-888',
            'customer_email' => 'bob@example.com',
            'customer_name' => 'Bob Jones',
            'totalAmount' => 45.00,
            'currency' => 'USD',
            'items' => [],
            'createdAt' => '2026-10-02T11:00:00Z',
        ];

        $dto = OrderData::fromArray($payload);

        $this->assertSame('ORD-888', $dto->orderId);
        $this->assertSame('bob@example.com', $dto->customerEmail);
        $this->assertSame('Bob Jones', $dto->customerName);
        $this->assertSame(45.00, $dto->totalAmount);
        $this->assertSame('USD', $dto->currency);
    }

    public function test_it_provides_array_representation(): void
    {
        $dto = new OrderData(
            orderId: 'ORD-777',
            customerEmail: 'clara@example.com',
            customerName: 'Clara Oswald',
            totalAmount: 75.00,
            currency: 'GBP',
            items: [],
            createdAt: '2026-10-02T12:00:00Z'
        );

        $array = $dto->toArray();

        $this->assertSame('ORD-777', $array['order_id']);
        $this->assertSame('clara@example.com', $array['customer_email']);
        $this->assertSame('Clara Oswald', $array['customer_name']);
        $this->assertSame(75.00, $array['total_amount']);
        $this->assertSame('GBP', $array['currency']);
    }

    public function test_it_creates_order_data_from_stage_2_brief_sample_payload(): void
    {
        $briefPayload = [
            'event' => 'order.created',
            'order_id' => 'ORD-10482',
            'created_at' => '2026-09-20T14:32:00+08:00',
            'customer' => [
                'email' => 'maria.santos@example.com',
                'first_name' => 'Maria',
                'last_name' => 'Santos',
                'phone' => '+639171234567',
            ],
            'items' => [
                [
                    'sku' => 'TSH-BLK-M',
                    'name' => 'Black Tee (M)',
                    'qty' => 2,
                    'price' => 450.00,
                ],
            ],
            'currency' => 'PHP',
            'total' => 900.00,
        ];

        $dto = OrderData::fromArray($briefPayload);

        $this->assertSame('ORD-10482', $dto->orderId);
        $this->assertSame('maria.santos@example.com', $dto->customerEmail);
        $this->assertSame('Maria Santos', $dto->customerName);
        $this->assertSame('Maria', $dto->customerFirstName);
        $this->assertSame('Santos', $dto->customerLastName);
        $this->assertSame('+639171234567', $dto->customerPhone);
        $this->assertSame(900.00, $dto->totalAmount);
        $this->assertSame('PHP', $dto->currency);
        $this->assertCount(1, $dto->items);
        $this->assertSame(2, $dto->items[0]['quantity']);
        $this->assertSame(450.00, $dto->items[0]['unitPrice']);
    }
}
