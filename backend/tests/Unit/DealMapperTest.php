<?php

namespace Tests\Unit;

use App\DTOs\OrderData;
use App\Services\Hubspot\DealMapper;
use PHPUnit\Framework\TestCase;

class DealMapperTest extends TestCase
{
    private DealMapper $mapper;

    protected function setUp(): void
    {
        parent::setUp();
        $this->mapper = new DealMapper();
    }

    public function test_it_maps_order_data_to_deal_properties_accurately(): void
    {
        $orderData = new OrderData(
            orderId: 'ORD-9876',
            customerEmail: 'sarah.connor@example.com',
            customerName: 'Sarah Connor',
            totalAmount: 149.99,
            currency: 'USD',
            items: [
                ['sku' => 'RES-01', 'name' => 'Resistance Gear', 'quantity' => 1, 'unitPrice' => 149.99],
            ],
            createdAt: '2026-10-03T12:00:00Z',
        );

        $properties = $this->mapper->toDealProperties($orderData, 'sales_pipeline', 'contract_signed');

        $this->assertSame('Order #ORD-9876 - Sarah Connor', $properties['dealname']);
        $this->assertSame('149.99', $properties['amount']);
        $this->assertSame('sales_pipeline', $properties['pipeline']);
        $this->assertSame('contract_signed', $properties['dealstage']);
        $this->assertSame('ORD-9876', $properties['order_id']);
        $this->assertSame('USD', $properties['currency']);
        $this->assertStringContainsString('2026-10-03T00:00:00', $properties['closedate']);
    }

    public function test_it_maps_order_data_to_contact_properties_accurately(): void
    {
        $orderData = new OrderData(
            orderId: 'ORD-1234',
            customerEmail: 'john.doe@example.com',
            customerName: 'John Doe',
            totalAmount: 50.00,
            currency: 'USD',
            items: [],
            createdAt: '2026-10-03T12:00:00Z',
        );

        $properties = $this->mapper->toContactProperties($orderData);

        $this->assertSame('john.doe@example.com', $properties['email']);
        $this->assertSame('John', $properties['firstname']);
        $this->assertSame('Doe', $properties['lastname']);
    }
}
