import React from 'react';
import { SyncAttempt } from '../types';
import { RetryButton } from './RetryButton';
import { StatusBadge } from './StatusBadge';

export interface SyncTableProps {
  syncs: SyncAttempt[];
  onRetry: (attemptId: string) => Promise<unknown>;
  retryingId: string | null;
}

export function SyncTable({ syncs, onRetry, retryingId }: SyncTableProps): React.JSX.Element {
  if (syncs.length === 0) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>
        No order sync attempts recorded yet.
      </div>
    );
  }

  const formatDate = (isoString?: string | null): string => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Order ID</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>HubSpot Deal</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Attempt #</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Failure Detail</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Created At</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {syncs.map((sync) => (
            <tr key={sync.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
              <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>
                {sync.orderId}
              </td>
              <td style={{ padding: '12px 16px' }}>
                <StatusBadge status={sync.status} />
              </td>
              <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: sync.hubspotDealId ? '#1D4ED8' : '#9CA3AF' }}>
                {sync.hubspotDealId ?? '-'}
              </td>
              <td style={{ padding: '12px 16px' }}>
                {sync.attemptNumber}
                {sync.retryOf ? ` (Retry of #${sync.retryOf.slice(0, 8)})` : ''}
              </td>
              <td style={{ padding: '12px 16px', maxWidth: '300px', wordBreak: 'break-word', color: '#DC2626' }}>
                {sync.failureMessage ? `[${sync.failureCode ?? 'ERR'}] ${sync.failureMessage}` : '-'}
              </td>
              <td style={{ padding: '12px 16px', color: '#6B7280' }}>
                {formatDate(sync.createdAt)}
              </td>
              <td style={{ padding: '12px 16px' }}>
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
  );
}
