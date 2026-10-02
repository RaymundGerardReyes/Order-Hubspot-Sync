import { describe, expect, it, vi } from 'vitest';
import { HubSpotClient } from '../../src/hubspot/client';
import { HubSpotRepository } from '../../src/hubspot/repository';
import type { OrderPayload } from '../../src/schema';

describe('HubSpotRepository Unit Tests', () => {
  const sampleOrder: OrderPayload = {
    event: 'order.created',
    orderId: 'ORD-10482',
    order_id: 'ORD-10482',
    created_at: '2026-09-20T14:32:00+08:00',
    createdAt: '2026-09-20T14:32:00+08:00',
    customer: {
      email: 'maria.santos@example.com',
      first_name: 'Maria',
      last_name: 'Santos',
      name: 'Maria Santos',
      phone: '+639171234567',
    },
    items: [{
      sku: 'TSH-BLK-M',
      name: 'Black Tee (M)',
      qty: 2,
      quantity: 2,
      price: 450,
      unitPrice: 450,
    }],
    currency: 'PHP',
    total: 900,
    total_amount: 900,
    totalAmount: 900,
  };

  it('updates existing contact when search finds email (Req 23)', async () => {
    const fakeClient = {
      request: vi.fn().mockImplementation((method, path) => {
        if (path === 'crm/v3/objects/contacts/search') {
          return Promise.resolve({ results: [{ id: 'contact_existing_123' }] });
        }
        if (method === 'PATCH' && path.includes('contacts/contact_existing_123')) {
          return Promise.resolve({});
        }
        return Promise.resolve({});
      }),
    } as unknown as HubSpotClient;

    const repo = new HubSpotRepository(fakeClient, 'default', 'closedwon', 'external_order_id');
    const contactId = await repo.findOrUpsertContact(sampleOrder);

    expect(contactId).toBe('contact_existing_123');
    expect(fakeClient.request).toHaveBeenCalledWith(
      'PATCH',
      'crm/v3/objects/contacts/contact_existing_123',
      expect.objectContaining({
        properties: expect.objectContaining({
          email: 'maria.santos@example.com',
          firstname: 'Maria',
          lastname: 'Santos',
          phone: '+639171234567',
        }),
      })
    );
  });

  it('creates new contact when search finds nothing (Req 23)', async () => {
    const fakeClient = {
      request: vi.fn().mockImplementation((method, path) => {
        if (path === 'crm/v3/objects/contacts/search') {
          return Promise.resolve({ results: [] });
        }
        if (method === 'POST' && path === 'crm/v3/objects/contacts') {
          return Promise.resolve({ id: 'contact_new_456' });
        }
        return Promise.resolve({});
      }),
    } as unknown as HubSpotClient;

    const repo = new HubSpotRepository(fakeClient, 'default', 'closedwon', 'external_order_id');
    const contactId = await repo.findOrUpsertContact(sampleOrder);

    expect(contactId).toBe('contact_new_456');
  });

  it('creates deal with external_order_id and contact association in single call (Req 23 & 24)', async () => {
    let capturedBody: any = null;
    const fakeClient = {
      request: vi.fn().mockImplementation((_method, path, body) => {
        if (path === 'crm/v3/objects/deals/search') {
          return Promise.resolve({ results: [] });
        }
        if (path === 'crm/v3/objects/deals') {
          capturedBody = body;
          return Promise.resolve({ id: 'deal_789' });
        }
        return Promise.resolve({});
      }),
    } as unknown as HubSpotClient;

    const repo = new HubSpotRepository(fakeClient, 'default', 'closedwon', 'external_order_id');
    const dealId = await repo.findOrCreateDeal(sampleOrder, 'contact_123');

    expect(dealId).toBe('deal_789');
    expect(capturedBody).not.toBeNull();
    expect(capturedBody.properties.external_order_id).toBe('ORD-10482');
    expect(capturedBody.properties.amount).toBe('900.00');
    expect(capturedBody.properties.dealname).toContain('Order ORD-10482 \u2014 Maria Santos');
    expect(capturedBody.associations).toEqual([
      {
        to: { id: 'contact_123' },
        types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }],
      },
    ]);
  });

  it('reuses existing deal when search finds external_order_id (Req 24 idempotency guard)', async () => {
    const fakeClient = {
      request: vi.fn().mockImplementation((_method, path) => {
        if (path === 'crm/v3/objects/deals/search') {
          return Promise.resolve({ results: [{ id: 'deal_already_exists_999' }] });
        }
        if (path.includes('associations')) {
          return Promise.resolve({});
        }
        return Promise.resolve({});
      }),
    } as unknown as HubSpotClient;

    const repo = new HubSpotRepository(fakeClient, 'default', 'closedwon', 'external_order_id');
    const dealId = await repo.findOrCreateDeal(sampleOrder, 'contact_123');

    expect(dealId).toBe('deal_already_exists_999');
  });
});
