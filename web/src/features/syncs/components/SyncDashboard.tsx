'use client';

import React from 'react';
import { useRetry } from '../hooks/useRetry';
import { useSyncs } from '../hooks/useSyncs';
import { SyncTable } from './SyncTable';

export interface SyncDashboardProps {
  pollIntervalMs?: number;
}

export function SyncDashboard({ pollIntervalMs = 5000 }: SyncDashboardProps = {}): React.JSX.Element {
  const { syncs, isLoading, error, refresh } = useSyncs(pollIntervalMs);
  const { retryingId, retryError, triggerRetry } = useRetry(refresh);

  return (
    <div className="dashboard">
      {/* ── Page header ──────────────────────────────────────── */}
      <header className="dashboard-header">
        <div className="dashboard-title-group">
          {/* Branded icon */}
          <div className="dashboard-logo" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M7 9h6M7 12h4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div>
            <h1 className="dashboard-title">Order Sync Dashboard</h1>
            <p className="dashboard-subtitle">
              Live status of incoming orders and HubSpot deal synchronisation
            </p>
          </div>
        </div>

        <div className="dashboard-header-actions">
          {/* Live polling indicator */}
          <span className="live-indicator" aria-label="Live polling active">
            <span className="live-dot" aria-hidden="true" />
            LIVE
          </span>

          {/* Refresh button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => refresh()}
            disabled={isLoading}
            aria-label={isLoading ? 'Refreshing data' : 'Refresh data'}
          >
            {isLoading ? (
              <>
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: 'spin 0.7s linear infinite' }}
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Refreshing…
              </>
            ) : (
              <>
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Alert banners ────────────────────────────────────── */}
      {error && (
        <div className="alert alert-error" role="alert">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span><strong>Error: </strong>{error}</span>
        </div>
      )}

      {retryError && (
        <div className="alert alert-warn" role="alert">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span><strong>Retry warning: </strong>{retryError}</span>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────── */}
      <main>
        <SyncTable
          syncs={syncs}
          onRetry={triggerRetry}
          retryingId={retryingId}
          isLoading={isLoading && syncs.length === 0}
        />
      </main>
    </div>
  );
}
