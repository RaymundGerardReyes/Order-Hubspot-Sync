import React from 'react';
import { SyncAttempt } from '../types';
import { RetryButton } from './RetryButton';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '../format';

export interface SyncTableProps {
  syncs: SyncAttempt[];
  onRetry: (attemptId: string) => Promise<unknown>;
  retryingId: string | null;
  /** Shows skeleton rows while initial data loads */
  isLoading?: boolean;
}

const SKELETON_ROWS = 5;

function SkeletonRow(): React.JSX.Element {
  return (
    <tr className="skeleton-row" aria-hidden="true">
      {[120, 80, 100, 50, 200, 100, 60].map((w, i) => (
        <td key={i}>
          <div className="skeleton-cell" style={{ inlineSize: `${w}px` }} />
        </td>
      ))}
    </tr>
  );
}

export function SyncTable({
  syncs,
  onRetry,
  retryingId,
  isLoading = false,
}: SyncTableProps): React.JSX.Element {
  // ── Loading skeleton ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="table-card">
        <div className="table-card-header">
          <span className="table-card-title">Recent Sync Attempts</span>
        </div>
        <div className="table-wrapper" aria-busy="true" aria-label="Loading sync attempts">
          <table className="sync-table" aria-label="Sync attempts">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>HubSpot Deal</th>
                <th>Attempt</th>
                <th>Failure Detail</th>
                <th>Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────
  if (syncs.length === 0) {
    return (
      <div className="table-card">
        <div className="table-card-header">
          <span className="table-card-title">Recent Sync Attempts</span>
          <span className="table-card-count">0 records</span>
        </div>
        <div className="empty-state">
          <svg
            className="empty-state-icon"
            aria-hidden="true"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 17H5a2 2 0 00-2 2" />
            <path d="M11 21H4a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V17" />
            <path d="M17 21a4 4 0 100-8 4 4 0 000 8z" />
            <path d="M17 15v2" />
            <path d="M17 19.01l.01-.01" />
          </svg>
          <p className="empty-state-title">No order sync attempts recorded yet.</p>
          <p className="empty-state-body">
            Send a webhook via the mock script and it will appear here within seconds.
          </p>
        </div>
      </div>
    );
  }

  // ── Data table ────────────────────────────────────────────
  return (
    <div className="table-card">
      <div className="table-card-header">
        <span className="table-card-title">Recent Sync Attempts</span>
        <span className="table-card-count">{syncs.length} record{syncs.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="table-wrapper">
        <table className="sync-table" aria-label="Sync attempts">
          <thead>
            <tr>
              <th scope="col">Order ID</th>
              <th scope="col">Status</th>
              <th scope="col">HubSpot Deal</th>
              <th scope="col">Attempt</th>
              <th scope="col">Failure Detail</th>
              <th scope="col">Timestamp</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {syncs.map((sync) => (
              <tr key={sync.id}>
                <td className="col-order-id" data-label="Order ID">
                  {sync.orderId}
                </td>
                <td data-label="Status">
                  <StatusBadge status={sync.status} />
                </td>
                <td
                  className={`col-deal-id${sync.hubspotDealId ? '' : ' empty'}`}
                  data-label="HubSpot Deal"
                >
                  {sync.hubspotDealId ?? '—'}
                </td>
                <td className="col-attempt" data-label="Attempt">
                  #{sync.attemptNumber ?? 1}
                  {sync.retryOf ? (
                    <span style={{ color: 'var(--color-gray-400)', marginInlineStart: '4px' }}>
                      (retry)
                    </span>
                  ) : null}
                </td>
                <td
                  className={`col-failure${sync.failureMessage ? '' : ' empty'}`}
                  data-label="Failure Detail"
                  title={sync.failureMessage ?? undefined}
                >
                  {sync.failureMessage
                    ? `[${sync.failureCode ?? 'ERR'}] ${sync.failureMessage}`
                    : '—'}
                </td>
                <td className="col-date" data-label="Timestamp">
                  {formatDate(sync.createdAt)}
                </td>
                <td data-label="Actions">
                  {sync.status === 'failed' && (
                    <RetryButton
                      attemptId={sync.id}
                      onRetry={onRetry}
                      isLoading={retryingId === sync.id}
                      disabled={retryingId !== null}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
