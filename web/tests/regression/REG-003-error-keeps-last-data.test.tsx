/**
 * REG-003: Preserve cached dataset when refresh fails.
 * Issue: Temporary network interruptions during background polling must retain
 * previously rendered sync attempts on the UI rather than wiping the view.
 * Date: 2026-10-02
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSyncs } from '@/features/syncs/hooks/useSyncs';
import * as apiModule from '@/features/syncs/api';
import { mockSyncAttempts } from '../mocks/data/syncAttempts';

describe('REG-003: Retain Data On Polling Failure', () => {
  it('keeps existing attempts in state when a subsequent poll fails', async () => {
    // Initial fetch succeeds
    const fetchSpy = vi.spyOn(apiModule, 'fetchSyncAttempts').mockResolvedValueOnce(mockSyncAttempts);

    const { result } = renderHook(() => useSyncs(0));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.syncs).toHaveLength(3);
    expect(result.current.error).toBe(null);

    // Subsequent poll encounters network error
    fetchSpy.mockRejectedValueOnce(new Error('Gateway Timeout 504'));

    await act(async () => {
      await result.current.refresh();
    });

    // Should retain existing 3 sync attempts
    expect(result.current.syncs).toHaveLength(3);
    expect(result.current.error).toBe('Gateway Timeout 504');
  });
});
