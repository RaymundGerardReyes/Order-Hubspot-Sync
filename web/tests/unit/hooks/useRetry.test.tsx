import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRetry } from '@/features/syncs/hooks/useRetry';

describe('useRetry Hook', () => {
  it('triggers retry, invokes onSuccess callback, and updates state', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useRetry(onSuccess));

    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryingId).toBe(null);

    let retryPromise: Promise<unknown>;
    await act(async () => {
      retryPromise = result.current.triggerRetry('att-failed-02');
      await retryPromise;
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryError).toBe(null);
  });

  it('records error message on failed retry', async () => {
    const { result } = renderHook(() => useRetry());

    await act(async () => {
      await result.current.triggerRetry('non-existent-attempt');
    });

    expect(result.current.retryError).toBeTruthy();
  });
});
