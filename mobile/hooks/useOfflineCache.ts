/**
 * Offline Cache Hook
 * Provides offline-first data fetching with automatic sync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

const CACHE_PREFIX = 'offline_cache_';
const PENDING_SYNC_KEY = 'pending_sync_operations';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh
  syncOnReconnect?: boolean; // Sync pending operations when coming online
}

interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface PendingSyncOperation {
  id: string;
  type: 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  data: any;
  timestamp: number;
}

interface UseOfflineCacheResult<T> {
  data: T | null;
  isLoading: boolean;
  isStale: boolean;
  isOffline: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  clearCache: () => Promise<void>;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export function useOfflineCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): UseOfflineCacheResult<T> {
  const {
    ttl = DEFAULT_TTL,
    staleWhileRevalidate = true,
    syncOnReconnect = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isMounted = useRef(true);
  const cacheKey = `${CACHE_PREFIX}${key}`;

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = isOffline;
      const nowOnline = state.isConnected && state.isInternetReachable;

      setIsOffline(!nowOnline);

      // Sync pending operations when coming back online
      if (wasOffline && nowOnline && syncOnReconnect) {
        syncPendingOperations();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOffline, syncOnReconnect]);

  // Load cached data on mount
  useEffect(() => {
    loadCachedData();
    return () => {
      isMounted.current = false;
    };
  }, [key]);

  const loadCachedData = async () => {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);

      if (cached) {
        const parsedCache: CachedData<T> = JSON.parse(cached);
        const now = Date.now();
        const isExpired = now - parsedCache.timestamp > parsedCache.ttl;

        if (!isExpired) {
          if (isMounted.current) {
            setData(parsedCache.data);
            setIsStale(false);
            setIsLoading(false);
          }
          return;
        } else if (staleWhileRevalidate) {
          // Return stale data while fetching fresh
          if (isMounted.current) {
            setData(parsedCache.data);
            setIsStale(true);
          }
        }
      }

      // Fetch fresh data
      await fetchAndCache();
    } catch (err) {
      if (isMounted.current) {
        setError(err as Error);
        setIsLoading(false);
      }
    }
  };

  const fetchAndCache = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const freshData = await fetcher();

      if (isMounted.current) {
        setData(freshData);
        setIsStale(false);
        setError(null);
      }

      // Cache the fresh data
      const cacheEntry: CachedData<T> = {
        data: freshData,
        timestamp: Date.now(),
        ttl,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
    } catch (err) {
      // If offline and we have stale data, keep using it
      if (isOffline && data) {
        if (isMounted.current) {
          setIsStale(true);
        }
      } else {
        if (isMounted.current) {
          setError(err as Error);
        }
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const refresh = useCallback(async () => {
    await fetchAndCache();
  }, [fetcher, ttl]);

  const clearCache = useCallback(async () => {
    await AsyncStorage.removeItem(cacheKey);
    if (isMounted.current) {
      setData(null);
      setIsStale(false);
    }
  }, [cacheKey]);

  return {
    data,
    isLoading,
    isStale,
    isOffline,
    error,
    refresh,
    clearCache,
  };
}

// Queue an operation for later sync
export async function queueOfflineOperation(
  operation: Omit<PendingSyncOperation, 'id' | 'timestamp'>
): Promise<void> {
  try {
    const pendingJson = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    const pending: PendingSyncOperation[] = pendingJson
      ? JSON.parse(pendingJson)
      : [];

    const newOperation: PendingSyncOperation = {
      ...operation,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    pending.push(newOperation);
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
  } catch (error) {
    console.error('Failed to queue offline operation:', error);
  }
}

// Sync all pending operations
export async function syncPendingOperations(): Promise<void> {
  try {
    const pendingJson = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    if (!pendingJson) return;

    const pending: PendingSyncOperation[] = JSON.parse(pendingJson);
    const remaining: PendingSyncOperation[] = [];

    for (const operation of pending) {
      try {
        // Execute the operation
        const response = await fetch(operation.endpoint, {
          method: operation.type,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(operation.data),
        });

        if (!response.ok) {
          // Keep failed operations for retry
          remaining.push(operation);
        }
      } catch {
        // Keep operations that failed due to network issues
        remaining.push(operation);
      }
    }

    // Update pending operations
    if (remaining.length > 0) {
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem(PENDING_SYNC_KEY);
    }
  } catch (error) {
    console.error('Failed to sync pending operations:', error);
  }
}

// Get count of pending operations
export async function getPendingOperationCount(): Promise<number> {
  try {
    const pendingJson = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    if (!pendingJson) return 0;

    const pending: PendingSyncOperation[] = JSON.parse(pendingJson);
    return pending.length;
  } catch {
    return 0;
  }
}

export default useOfflineCache;
