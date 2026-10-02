export async function waitForSync(
  backendUrl: string,
  orderId: string,
  targetStatus: 'success' | 'failed' = 'success',
  timeoutMs: number = 10000,
  intervalMs: number = 500
): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(`${backendUrl.replace(/\/$/, '')}/api/sync-attempts`);
      if (res.ok) {
        const json = await res.json();
        const attempts = json.data || [];
        const attempt = attempts.find((a: any) => a.orderId === orderId);

        if (attempt && attempt.status === targetStatus) {
          return attempt;
        }
      }
    } catch {
      // transient fetch error
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for order ${orderId} to reach status ${targetStatus}`
  );
}
