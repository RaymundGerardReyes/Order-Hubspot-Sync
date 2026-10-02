import { getDb } from '../db/connection.js';
import { orderRepo, attemptRepo } from '../db/repositories.js';
import type { HubSpotRepository } from '../hubspot/repository.js';
import type { OrderPayload } from '../schema.js';

/**
 * SyncService orchestrates the full HubSpot sync workflow.
 *
 * Sequence (analysis doc §End-to-end sequence):
 *   1. Atomically claim pending attempt → processing
 *   2. Find/upsert contact
 *   3. Find/create deal (with external_order_id lookup first)
 *   4. Ensure contact association
 *   5. Mark attempt succeeded; save CRM IDs
 *   6. Mark order succeeded; save canonical IDs
 */
export class SyncService {
  constructor(private readonly hubspot: HubSpotRepository) {}

  async syncAttempt(attemptId: number, payload: OrderPayload): Promise<void> {
    // Step 1: Claim attempt atomically (prevents double-processing)
    const claimed = attemptRepo.claimPending(attemptId);
    if (!claimed) {
      // Another worker or tick already claimed this attempt — skip
      console.warn(`[SyncService] Attempt ${attemptId} already claimed, skipping.`);
      return;
    }

    try {
      // Step 2: Contact upsert
      const contactId = await this.hubspot.findOrUpsertContact(payload);

      // Step 3 + 4: Deal find-or-create (association included in create call)
      const dealId = await this.hubspot.findOrCreateDeal(payload, contactId);

      // Step 5: Mark attempt succeeded
      const db = getDb();
      db.transaction(() => {
        attemptRepo.markSucceeded(attemptId, contactId, dealId);
        // Step 6: Mark order succeeded with canonical CRM IDs
        orderRepo.updateStatus(payload.order_id, 'succeeded', contactId, dealId);
      })();

      console.info(`[SyncService] Order ${payload.order_id} synced. deal=${dealId} contact=${contactId}`);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const code = (err && typeof err === 'object' && 'statusCode' in err)
        ? String((err as { statusCode: number }).statusCode)
        : 'SYNC_ERROR';

      attemptRepo.markFailed(attemptId, code, message);
      orderRepo.updateStatus(payload.order_id, 'failed');

      console.error(`[SyncService] Order ${payload.order_id} sync failed: ${message}`);
      throw err;
    }
  }
}
