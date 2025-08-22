import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';

interface OfflineContextType {
  isOffline: boolean;
  isOnline: boolean;
  connectionType: string | null;
  syncQueue: SyncItem[];
  addToSyncQueue: (item: SyncItem) => void;
  processSyncQueue: () => Promise<void>;
  clearSyncQueue: () => void;
}

interface SyncItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>([]);

  const isOnline = !isOffline;

  // Initialize offline state
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    
    // Load sync queue from localStorage
    const savedQueue = localStorage.getItem('sync_queue');
    if (savedQueue) {
      try {
        setSyncQueue(JSON.parse(savedQueue));
      } catch (error) {
        console.error('Failed to load sync queue:', error);
      }
    }

    // Check connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setConnectionType(connection?.effectiveType || null);
    }
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success('Connection restored', {
        icon: '🌐',
        duration: 3000,
      });
      
      // Auto-sync when coming back online
      if (syncQueue.length > 0) {
        toast.promise(
          processSyncQueue(),
          {
            loading: 'Syncing offline changes...',
            success: 'All changes synced successfully',
            error: 'Some changes failed to sync',
          }
        );
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast.error('No internet connection', {
        icon: '📴',
        duration: 5000,
      });
    };

    const handleConnectionChange = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setConnectionType(connection?.effectiveType || null);
        
        // Warn about slow connections
        if (connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
          toast('Slow connection detected', {
            icon: '🐌',
            duration: 4000,
          });
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if ('connection' in navigator) {
      (navigator as any).connection?.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        (navigator as any).connection?.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [syncQueue.length]);

  // Persist sync queue to localStorage
  useEffect(() => {
    localStorage.setItem('sync_queue', JSON.stringify(syncQueue));
  }, [syncQueue]);

  const addToSyncQueue = (item: Omit<SyncItem, 'id' | 'timestamp' | 'retryCount'>) => {
    const syncItem: SyncItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    setSyncQueue(prev => [...prev, syncItem]);
    
    toast.success('Changes saved offline', {
      icon: '💾',
      duration: 2000,
    });
  };

  const processSyncQueue = async (): Promise<void> => {
    if (isOffline || syncQueue.length === 0) {
      return;
    }

    const maxRetries = 3;
    const succeededItems: string[] = [];
    const failedItems: SyncItem[] = [];

    for (const item of syncQueue) {
      try {
        // Simulate API call based on item type and resource
        await syncItemToServer(item);
        succeededItems.push(item.id);
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        
        if (item.retryCount < maxRetries) {
          failedItems.push({
            ...item,
            retryCount: item.retryCount + 1,
          });
        } else {
          console.error(`Max retries exceeded for item ${item.id}, removing from queue`);
        }
      }
    }

    // Update sync queue with only failed items that haven't exceeded max retries
    setSyncQueue(failedItems);

    if (succeededItems.length > 0) {
      console.log(`Successfully synced ${succeededItems.length} items`);
    }

    if (failedItems.length > 0) {
      console.warn(`${failedItems.length} items failed to sync and will be retried`);
    }
  };

  const clearSyncQueue = () => {
    setSyncQueue([]);
    localStorage.removeItem('sync_queue');
    toast.success('Sync queue cleared');
  };

  // Auto-retry failed sync items periodically when online
  useEffect(() => {
    if (isOffline || syncQueue.length === 0) return;

    const retryInterval = setInterval(() => {
      const itemsToRetry = syncQueue.filter(item => item.retryCount > 0);
      if (itemsToRetry.length > 0) {
        processSyncQueue();
      }
    }, 30000); // Retry every 30 seconds

    return () => clearInterval(retryInterval);
  }, [isOffline, syncQueue]);

  const value = {
    isOffline,
    isOnline,
    connectionType,
    syncQueue,
    addToSyncQueue,
    processSyncQueue,
    clearSyncQueue,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

// Helper function to sync individual items to server
async function syncItemToServer(item: SyncItem): Promise<void> {
  const { apiClient } = await import('@/services/api');
  
  switch (item.resource) {
    case 'cases':
      if (item.type === 'create') {
        await apiClient.createCase(item.data);
      } else if (item.type === 'update') {
        await apiClient.updateCase(item.data.id, item.data);
      } else if (item.type === 'delete') {
        await apiClient.deleteCase(item.data.id);
      }
      break;
      
    case 'entities':
      if (item.type === 'create') {
        await apiClient.createEntity(item.data);
      } else if (item.type === 'update') {
        await apiClient.updateEntity(item.data.id, item.data);
      } else if (item.type === 'delete') {
        await apiClient.deleteEntity(item.data.id);
      }
      break;
      
    case 'comments':
      if (item.type === 'create') {
        await apiClient.createComment(item.data);
      } else if (item.type === 'update') {
        await apiClient.updateComment(item.data.id, item.data);
      } else if (item.type === 'delete') {
        await apiClient.deleteComment(item.data.id);
      }
      break;
      
    default:
      throw new Error(`Unknown resource type: ${item.resource}`);
  }
}

// Custom hook for offline-aware queries
export function useOfflineQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: {
    fallbackData?: T;
    cacheKey?: string;
  } = {}
) {
  const { isOffline } = useOffline();
  const [cachedData, setCachedData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = options.cacheKey || queryKey.join('-');

  // Load cached data on mount
  useEffect(() => {
    const cached = localStorage.getItem(`cache_${cacheKey}`);
    if (cached) {
      try {
        setCachedData(JSON.parse(cached));
      } catch (error) {
        console.error('Failed to parse cached data:', error);
      }
    }
  }, [cacheKey]);

  // Fetch data when online
  useEffect(() => {
    if (isOffline) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    queryFn()
      .then(data => {
        setCachedData(data);
        localStorage.setItem(`cache_${cacheKey}`, JSON.stringify(data));
      })
      .catch(err => {
        setError(err);
        console.error('Query failed:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOffline, cacheKey]);

  const data = cachedData || options.fallbackData;

  return {
    data,
    isLoading: isLoading && !data,
    error,
    isOffline,
    isStale: isOffline && !!data,
  };
}

// Utility function to check if device is low on storage
export function useStorageQuota() {
  const [storageInfo, setStorageInfo] = useState<{
    usage: number;
    quota: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentage = quota > 0 ? (usage / quota) * 100 : 0;
        
        setStorageInfo({ usage, quota, percentage });
        
        // Warn if storage is getting full
        if (percentage > 90) {
          toast.error('Storage almost full - offline features may be limited', {
            duration: 8000,
          });
        } else if (percentage > 75) {
          toast('Storage getting full', {
            icon: '⚠️',
            duration: 5000,
          });
        }
      });
    }
  }, []);

  return storageInfo;
}