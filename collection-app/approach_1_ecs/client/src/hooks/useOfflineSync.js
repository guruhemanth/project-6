import { useEffect, useState, useCallback } from 'react';
import { get, set } from 'idb-keyval';
import api from '../services/api';
import useCollectionStore from '../store/useCollectionStore';

const OFFLINE_QUEUE_KEY = 'chandas_pending_donations';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { applyCollectionDelta } = useCollectionStore();

  const updatePendingCount = useCallback(async () => {
    try {
      const queue = (await get(OFFLINE_QUEUE_KEY)) || [];
      setPendingCount(queue.length);
    } catch (e) {
      console.warn('Could not read offline queue:', e);
    }
  }, []);

  // Enqueue a donation locally in IndexedDB when offline
  const enqueueOfflineDonation = async (donation) => {
    const queue = (await get(OFFLINE_QUEUE_KEY)) || [];
    const record = {
      ...donation,
      idempotency_key: crypto.randomUUID(),
      queued_at: new Date().toISOString(),
    };
    queue.push(record);
    await set(OFFLINE_QUEUE_KEY, queue);
    await updatePendingCount();
    return record;
  };

  // Flush queued items sequentially to server upon reconnection
  const flushQueue = useCallback(async () => {
    if (!navigator.onLine || syncing) return;
    const queue = (await get(OFFLINE_QUEUE_KEY)) || [];
    if (queue.length === 0) return;

    setSyncing(true);
    const failed = [];

    for (const item of queue) {
      try {
        const res = await api.post('/api/records', item);
        applyCollectionDelta({
          action: 'INSERT',
          record: res.data,
          amountDelta: Number(res.data.amount),
        });
      } catch (err) {
        console.error('Failed to sync offline item:', item, err);
        failed.push(item);
      }
    }

    await set(OFFLINE_QUEUE_KEY, failed);
    await updatePendingCount();
    setSyncing(false);
  }, [syncing, applyCollectionDelta, updatePendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushQueue, updatePendingCount]);

  return { isOnline, syncing, pendingCount, enqueueOfflineDonation, flushQueue };
}
