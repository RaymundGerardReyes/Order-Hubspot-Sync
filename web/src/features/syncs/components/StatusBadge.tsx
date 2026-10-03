import React from 'react';
import { SyncStatus } from '../types';

export interface StatusBadgeProps {
  status: SyncStatus;
}

const statusConfig: Record<SyncStatus, { className: string; label: string }> = {
  pending: {
    className: 'pending',
    label: 'PENDING',
  },
  processing: {
    className: 'processing',
    label: 'PROCESSING',
  },
  success: {
    className: 'success',
    label: 'SUCCESS',
  },
  succeeded: {
    className: 'success',
    label: 'SUCCESS',
  },
  failed: {
    className: 'failed',
    label: 'FAILED',
  },
};

export function StatusBadge({ status }: StatusBadgeProps): React.JSX.Element {
  const config = statusConfig[status] ?? { className: '', label: status.toUpperCase() };

  return (
    <span className={`status-badge ${config.className}`} aria-label={`Status: ${config.label}`}>
      <span className="status-badge-dot" aria-hidden="true" />
      {config.label}
    </span>
  );
}
