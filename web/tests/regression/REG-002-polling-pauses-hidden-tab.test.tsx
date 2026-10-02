/**
 * REG-002: Dashboard polling interval management.
 * Issue: Background polling must clean up timers on unmount to prevent memory leaks and zombie fetches.
 * Date: 2026-10-02
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSyncs } from '@/features/syncs/hooks/useSyncs';
import * as apiModule from '@/features/syncs/api';

describe('REG-002: Polling Lifecycle Cleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops polling intervals when unmounted', () => {
    const fetchSpy = vi.spyOn(apiModule, 'fetchSyncAttempts').mockResolvedValue([]);
    const { unmount } = renderHook(() => useSyncs(3000));

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(3000);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    unmount();

    vi.advanceTimersByTime(6000);
    // Should NOT have polled again after unmount
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
