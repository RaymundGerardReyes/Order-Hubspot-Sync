import type { HubSpotClient } from './client.js';
import type { OrderPayload } from '../schema.js';

/**
 * HubSpot contact + deal operations.
 *
 * Contact upsert lifecycle (analysis doc §Contact upsert):
 *   1. Find contact by email
 *   2. If found: PATCH firstname, lastname, phone
 *   3. If absent: POST new contact
 *   4. If creation 409 conflict (race): retrieve existing, update it
 *   5. Save resulting contact ID
 *
 * Deal idempotency (analysis doc §HubSpot guard):
 *   search external_order_id → reuse if found, create only when absent
 */
export class HubSpotRepository {
  constructor(
    private readonly client: HubSpotClient,
    private readonly pipelineId: string,
    private readonly dealStageId: string,
    private readonly orderIdProperty: string
  ) {}

  // ─── Contact ─────────────────────────────────────────────────────────────

  async findOrUpsertContact(payload: OrderPayload): Promise<string> {
    const properties = this.buildContactProperties(payload);

    // Step 1: Search by email
    const searchResult = await this.client.request<{ results: Array<{ id: string }> }>(
      'POST',
      'crm/v3/objects/contacts/search',
      {
        filterGroups: [{
          filters: [{ propertyName: 'email', operator: 'EQ', value: payload.customer.email }],
        }],
        properties: ['email', 'firstname', 'lastname', 'phone'],
        limit: 1,
      }
    );

    if (searchResult.results?.[0]?.id) {
      const contactId = searchResult.results[0].id;
      // Step 2: PATCH existing contact
      await this.client.request('PATCH', `crm/v3/objects/contacts/${contactId}`, { properties });
      return contactId;
    }

    // Step 3: Create new contact
    try {
      const created = await this.client.request<{ id: string }>(
        'POST',
        'crm/v3/objects/contacts',
        { properties }
      );
      return created.id;
    } catch (err: unknown) {
      // Step 4: Email conflict race condition — retrieve existing and update
      if (err instanceof Error && 'statusCode' in err && (err as { statusCode: number }).statusCode === 409) {
        const retry = await this.client.request<{ results: Array<{ id: string }> }>(
          'POST',
          'crm/v3/objects/contacts/search',
          {
            filterGroups: [{
              filters: [{ propertyName: 'email', operator: 'EQ', value: payload.customer.email }],
            }],
            limit: 1,
          }
        );
        if (retry.results?.[0]?.id) {
          const contactId = retry.results[0].id;
          await this.client.request('PATCH', `crm/v3/objects/contacts/${contactId}`, { properties });
          return contactId;
        }
      }
      throw err;
    }
  }

  private buildContactProperties(payload: OrderPayload): Record<string, string> {
    const props: Record<string, string> = {
      email: payload.customer.email,
      firstname: payload.customer.first_name ?? '',
      lastname: payload.customer.last_name ?? '',
    };
    if (payload.customer.phone) {
      props['phone'] = payload.customer.phone;
    }
    return props;
  }

  // ─── Deal ─────────────────────────────────────────────────────────────────

  /**
   * Find existing deal by external_order_id or create a new one.
   * Returns the canonical HubSpot deal ID.
   */
  async findOrCreateDeal(payload: OrderPayload, contactId: string): Promise<string> {
    // Search by external_order_id (custom unique property — idempotency key)
    const searchResult = await this.client.request<{ results: Array<{ id: string }> }>(
      'POST',
      'crm/v3/objects/deals/search',
      {
        filterGroups: [{
          filters: [{
            propertyName: this.orderIdProperty,
            operator: 'EQ',
            value: payload.order_id,
          }],
        }],
        limit: 1,
      }
    );

    if (searchResult.results?.[0]?.id) {
      // Deal already exists in HubSpot — crash recovery path
      const dealId = searchResult.results[0].id;
      // Ensure association is still intact
      await this.associateDealContact(dealId, contactId);
      return dealId;
    }

    // Create deal with contact association in a single request
    const dealName = this.buildDealName(payload);
    const closeDateUtc = new Date(payload.created_at).toISOString().split('T')[0] + 'T00:00:00.000Z';

    const created = await this.client.request<{ id: string }>(
      'POST',
      'crm/v3/objects/deals',
      {
        properties: {
          dealname: dealName,
          amount: payload.total.toFixed(2),
          pipeline: this.pipelineId,
          dealstage: this.dealStageId,
          closedate: closeDateUtc,
          [this.orderIdProperty]: payload.order_id,
        },
        associations: [{
          to: { id: contactId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }],
        }],
      }
    );

    return created.id;
  }

  async associateDealContact(dealId: string, contactId: string): Promise<void> {
    await this.client.request(
      'PUT',
      `crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/3`
    );
  }

  /**
   * Deal name format: "Order ORD-10482 — Maria Santos" (em-dash per analysis doc §HubSpot mapping)
   */
  private buildDealName(payload: OrderPayload): string {
    const name = payload.customer.name ||
      [payload.customer.first_name, payload.customer.last_name].filter(Boolean).join(' ') ||
      payload.customer.email;
    return `Order ${payload.order_id} \u2014 ${name}`;
  }
}
