/**
 * OfflineQueue — queues Supabase write operations when offline,
 * replays them automatically when connectivity returns.
 */

interface QueuedOperation {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete' | 'upsert';
  payload: any;
  filters?: Record<string, string>;
  createdAt: string;
}

const QUEUE_KEY = 'basilix_offline_queue';

function getQueue(): QueuedOperation[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedOperation[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueOperation(op: Omit<QueuedOperation, 'id' | 'createdAt'>) {
  const queue = getQueue();
  queue.push({
    ...op,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  saveQueue(queue);
}

export function getQueueLength(): number {
  return getQueue().length;
}

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  const { supabase } = await import('@/integrations/supabase/client');
  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: QueuedOperation[] = [];

  for (const op of queue) {
    try {
      let query: any;
      switch (op.action) {
        case 'insert':
          query = supabase.from(op.table as any).insert(op.payload);
          break;
        case 'update':
          query = supabase.from(op.table as any).update(op.payload);
          if (op.filters) {
            for (const [col, val] of Object.entries(op.filters)) {
              query = query.eq(col, val);
            }
          }
          break;
        case 'delete':
          query = supabase.from(op.table as any).delete();
          if (op.filters) {
            for (const [col, val] of Object.entries(op.filters)) {
              query = query.eq(col, val);
            }
          }
          break;
        case 'upsert':
          query = supabase.from(op.table as any).upsert(op.payload);
          break;
      }

      const { error } = await query;
      if (error) {
        console.warn('[OfflineQueue] Failed to sync:', op, error);
        remaining.push(op);
        failed++;
      } else {
        synced++;
      }
    } catch {
      remaining.push(op);
      failed++;
    }
  }

  saveQueue(remaining);
  return { synced, failed };
}

/** Returns true if online */
export function isOnline(): boolean {
  return navigator.onLine;
}

// Auto-flush when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    const { synced } = await flushQueue();
    if (synced > 0) {
      console.log(`[OfflineQueue] Synced ${synced} queued operations`);
    }
  });
}