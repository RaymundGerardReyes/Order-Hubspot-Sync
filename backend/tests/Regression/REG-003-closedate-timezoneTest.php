<?php

/**
 * REG-003: HubSpot Deal closedate must normalize timezone offset to UTC.
 * Issue: Timestamps with timezone offsets (e.g. +08:00) caused deal closedate misalignment
 * unless converted to midnight UTC.
 * Date: 2026-10-02
 */

namespace Tests\Regression;

use App\DTOs\OrderData;
use App\Services\Hubspot\DealMapper;
use Tests\TestCase;

class REG003ClosedateTimezoneTest extends TestCase
{
    public function test_reg_003_converts_plus_0800_offset_to_utc(): void
    {
        $mapper = new DealMapper();

        $orderData = new OrderData(
            orderId: 'ORD-TZ-001',
            customerEmail: 'tz@example.com',
            customerName: 'TZ Tester',
            totalAmount: 100.0,
            currency: 'USD',
            items: [],
            createdAt: '2026-10-02T03:00:00+08:00'
        );

        $props = $mapper->toDealProperties($orderData);

        // In UTC, 2026-10-02 03:00 +08:00 is 2026-10-01 19:00:00 UTC
        $this->assertStringContainsString('Z', $props['closedate']);
        $this->assertStringContainsString('2026-10-01', $props['closedate']);
    }
}
