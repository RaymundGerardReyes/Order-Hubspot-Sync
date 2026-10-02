/**
 * Core domain status for order sync attempts.
 */
export type SyncStatus = 'pending' | 'processing' | 'success' | 'succeeded' | 'failed';

/**
 * Sync attempt record mirroring unified Node.js API response.
 */
export interface SyncAttempt {
  id: string;
  orderId: string;
  status: SyncStatus;
  hubspotDealId?: string | null;
  hubspotContactId?: string | null;
  retryOf?: string | null;
  attemptNumber?: number;
  failureCode?: string | null;
  failureMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;

  // Analysis doc properties
  attempt_id?: number;
  order_id?: string;
  customer_email?: string | null;
  total?: number | null;
  currency?: string | null;
  error?: string | null;
  error_code?: string | null;
  can_retry?: boolean;
}

/**
 * Order item specification.
 */
export interface OrderItem {
  sku: string;
  name?: string;
  quantity?: number;
  qty?: number;
  unitPrice?: number;
  price?: number;
}

/**
 * Customer profile associated with the order.
 */
export interface CustomerProfile {
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
}

/**
 * Webhook order payload contract.
 */
export interface OrderPayload {
  event?: string;
  orderId?: string;
  order_id?: string;
  customer: CustomerProfile;
  items: OrderItem[];
  totalAmount?: number;
  total_amount?: number;
  total?: number;
  currency?: string;
  createdAt?: string;
  created_at?: string;
}

/**
 * Standard backend API collection response wrapper.
 */
export interface ApiCollectionResponse<T> {
  data: T[];
}

/**
 * Retry response payload contract.
 */
export interface RetryResponse {
  status: string;
  message: string;
  attempt: SyncAttempt;
}
