import { http, HttpResponse } from 'msw';
import { mockSyncAttempts } from './data/syncAttempts';

export const handlers = [
  // List attempts (both endpoint aliases)
  http.get('*/api/sync-attempts', () => {
    return HttpResponse.json({
      data: mockSyncAttempts,
    });
  }),
  http.get('*/api/syncs', () => {
    return HttpResponse.json({
      data: mockSyncAttempts,
    });
  }),

  // Retry attempt (support both /api/orders/:id/retry and /api/sync-attempts/:id/retry)
  http.post('*/api/orders/:id/retry', ({ params }) => {
    const { id } = params;
    const target = mockSyncAttempts.find((a) => a.id === id || a.orderId === id);

    if (!target) {
      return HttpResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (target.status !== 'failed') {
      return HttpResponse.json(
        { error: 'Conflict: Cannot retry this sync attempt.', message: 'Only failed attempts can be retried' },
        { status: 409 }
      );
    }

    const retriedAttempt = {
      id: `att-retried-${Date.now()}`,
      orderId: target.orderId,
      status: 'pending' as const,
      retryOf: target.id,
      attemptNumber: target.attemptNumber + 1,
      failureCode: null,
      failureMessage: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };

    return HttpResponse.json(
      {
        status: 'accepted',
        message: 'Retry attempt successfully scheduled.',
        attempt: retriedAttempt,
      },
      { status: 202 }
    );
  }),
  http.post('*/api/sync-attempts/:id/retry', ({ params }) => {
    const { id } = params;
    const target = mockSyncAttempts.find((a) => a.id === id || a.orderId === id);

    if (!target) {
      return HttpResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (target.status !== 'failed') {
      return HttpResponse.json(
        { error: 'Conflict: Cannot retry this sync attempt.', message: 'Only failed attempts can be retried' },
        { status: 409 }
      );
    }

    const retriedAttempt = {
      id: `att-retried-${Date.now()}`,
      orderId: target.orderId,
      status: 'pending' as const,
      retryOf: target.id,
      attemptNumber: target.attemptNumber + 1,
      failureCode: null,
      failureMessage: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };

    return HttpResponse.json(
      {
        status: 'accepted',
        message: 'Retry attempt successfully scheduled.',
        attempt: retriedAttempt,
      },
      { status: 202 }
    );
  }),

  // Health check
  http.get('*/api/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      database: 'connected',
      pendingSyncs: 1,
      failedSyncs: 1,
      timestamp: new Date().toISOString(),
    });
  }),
  // Fallback 404 route for client error handling tests
  http.get('*/api/unknown-route', () => {
    return HttpResponse.json({ message: 'Route not found' }, { status: 404 });
  }),
];
