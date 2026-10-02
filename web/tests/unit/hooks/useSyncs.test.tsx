import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSyncs } from '@/features/syncs/hooks/useSyncs';

describe('useSyncs Hook', () => {
  it('loads sync attempts and transitions loading state', async () => {
    const { result } = renderHook(() => useSyncs(0));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.syncs).toHaveLength(3);
    expect(result.current.error).toBe(null);
  });
});
