import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Order-HubSpot Sync Dashboard',
  description: 'Real-time order synchronization ledger and monitoring dashboard',
};

export interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: '#FAFAFA', color: '#111827' }}>
        {children}
      </body>
    </html>
  );
}
