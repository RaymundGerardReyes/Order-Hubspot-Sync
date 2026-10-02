import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/features/syncs/components/StatusBadge';

describe('StatusBadge Component', () => {
  it('renders correct labels for each status variant', () => {
    const { rerender } = render(<StatusBadge status="success" />);
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();

    rerender(<StatusBadge status="failed" />);
    expect(screen.getByText('FAILED')).toBeInTheDocument();

    rerender(<StatusBadge status="pending" />);
    expect(screen.getByText('PENDING')).toBeInTheDocument();

    rerender(<StatusBadge status="processing" />);
    expect(screen.getByText('PROCESSING')).toBeInTheDocument();
  });
});
