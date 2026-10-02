/**
 * Core domain status for order sync attempts.
 */
export type SyncStatus = 'pending' | 'processing' | 'success' | 'failed';

/**
 * Sync attempt record mirroring backend SyncAttemptResource.
 */
export interface SyncAttempt {
  id: string;
  orderId: string;
  status: SyncStatus;
  retryOf: string | null;
  attemptNumber: number;
  failureCode: string | null;
  failureMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

/**
 * Order item specification.
 */
export interface OrderItem {
  sku: string;
  name?: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Customer profile associated with the order.
 */
export interface CustomerProfile {
  name: string;
  email: string;
}

/**
 * Webhook order payload contract.
 */
export interface OrderPayload {
  orderId: string;
  customer: CustomerProfile;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  createdAt?: string;
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
