'use client';

import React from 'react';
import { useRetry } from '../hooks/useRetry';
import { useSyncs } from '../hooks/useSyncs';
import { SyncTable } from './SyncTable';

export function SyncDashboard(): React.JSX.Element {
  const { syncs, isLoading, error, refresh } = useSyncs(5000);
  const { isRetrying, retryingId, retryError, triggerRetry } = useRetry(refresh);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Order to HubSpot Sync Dashboard</h1>
          <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '0.875rem' }}>
            Live status of incoming orders and HubSpot deal synchronization
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#F3F4F6',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '6px', marginBottom: '16px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {retryError && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: '6px', marginBottom: '16px' }}>
          <strong>Retry Warning:</strong> {retryError}
        </div>
      )}

      <main>
        <SyncTable syncs={syncs} onRetry={triggerRetry} retryingId={retryingId} />
      </main>
    </div>
  );
}
