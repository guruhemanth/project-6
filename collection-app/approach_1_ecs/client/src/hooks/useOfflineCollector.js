import { useState, useEffect, useCallback, useRef } from 'react';
import { get, set, del } from 'idb-keyval';
import api from '../services/api';

const IDB_QUEUE_KEY = 'onen_doorstep_offline_queue_v1';

/**
 * Custom hook for high-speed offline collection queueing, background syncing,
 * and local storage fallback with UUID idempotency keys.
 */
export function useOfflineCollector(onSyncSuccess) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingQueue, setPendingQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Load existing queue from IndexedDB
  const refreshQueue = useCallback(async () => {
    try {
      const queue = (await get(IDB_QUEUE_KEY)) || [];
      setPendingQueue(queue);
      return queue;
    } catch (err) {
      console.error('Error reading offline queue from IndexedDB:', err);
      return [];
    }
  }, []);

  // Flush queued donations to backend API sequentially with idempotency keys
  const flushQueue = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;

    try {
      syncingRef.current = true;
      setIsSyncing(true);
      const queue = (await get(IDB_QUEUE_KEY)) || [];

      if (queue.length === 0) {
        syncingRef.current = false;
        setIsSyncing(false);
        return;
      }

      const remaining = [];
      const syncedRecords = [];

      for (const item of queue) {
        try {
          const res = await api.post('/api/records', {
            idempotency_key: item.idempotency_key,
            name: item.name,
            door_number: item.door_number,
            phone_number: item.phone_number,
            amount: item.amount,
            payment_mode: item.payment_mode || 'Cash',
          });
          syncedRecords.push(res.data);
        } catch (err) {
          // If server already processed or error is non-fatal, proceed
          if (err.response?.status === 409) {
            console.warn(`Idempotency duplicate skipped for key: ${item.idempotency_key}`);
          } else {
            console.error('Failed to sync item, retaining in queue:', item, err);
            remaining.push(item);
          }
        }
      }

      if (remaining.length > 0) {
        await set(IDB_QUEUE_KEY, remaining);
      } else {
        await del(IDB_QUEUE_KEY);
      }

      setPendingQueue(remaining);

      if (syncedRecords.length > 0 && onSyncSuccess) {
        onSyncSuccess(syncedRecords);
      }
    } catch (err) {
      console.error('Error during offline queue sync:', err);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [onSyncSuccess]);

  // Enqueue donation locally in IndexedDB
  const enqueueDonation = useCallback(
    async (donation) => {
      const idempotencyKey =
        donation.idempotency_key ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

      const queueItem = {
        ...donation,
        idempotency_key: idempotencyKey,
        queued_at: new Date().toISOString(),
        is_offline: true,
      };

      try {
        const currentQueue = (await get(IDB_QUEUE_KEY)) || [];
        const updatedQueue = [...currentQueue, queueItem];
        await set(IDB_QUEUE_KEY, updatedQueue);
        setPendingQueue(updatedQueue);
        return queueItem;
      } catch (err) {
        console.error('Failed to enqueue donation in IndexedDB:', err);
        return queueItem;
      }
    },
    []
  );

  // Listen to browser online/offline lifecycle events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial queue check
    refreshQueue().then((q) => {
      if (navigator.onLine && q.length > 0) {
        flushQueue();
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushQueue, refreshQueue]);

  return {
    isOnline,
    isSyncing,
    pendingQueue,
    pendingCount: pendingQueue.length,
    enqueueDonation,
    flushQueue,
    refreshQueue,
  };
}
