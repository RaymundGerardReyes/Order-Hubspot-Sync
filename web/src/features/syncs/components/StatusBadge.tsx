import React from 'react';
import { SyncStatus } from '../types';

export interface StatusBadgeProps {
  status: SyncStatus;
}

export function StatusBadge({ status }: StatusBadgeProps): React.JSX.Element {
  const badgeStyles: Record<SyncStatus, { bg: string; text: string; label: string }> = {
    pending: {
      bg: '#FEF3C7',
      text: '#92400E',
      label: 'Pending',
    },
    processing: {
      bg: '#DBEAFE',
      text: '#1E40AF',
      label: 'Processing',
    },
    success: {
      bg: '#D1FAE5',
      text: '#065F46',
      label: 'Success',
    },
    succeeded: {
      bg: '#D1FAE5',
      text: '#065F46',
      label: 'Success',
    },
    failed: {
      bg: '#FEE2E2',
      text: '#991B1B',
      label: 'Failed',
    },
  };

  const style = badgeStyles[status] ?? {
    bg: '#F3F4F6',
    text: '#374151',
    label: status,
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.text,
      }}
    >
      {style.label}
    </span>
  );
}
