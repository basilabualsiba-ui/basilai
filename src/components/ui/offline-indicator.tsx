import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { getQueueLength, flushQueue } from '@/services/OfflineQueue';

export function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const goOffline = () => { setOffline(true); setQueueCount(getQueueLength()); };
    const goOnline = () => {
      setOffline(false);
      // Brief delay to show sync
      setTimeout(() => setQueueCount(getQueueLength()), 2000);
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // Periodically check queue length
  useEffect(() => {
    if (!offline) return;
    const interval = setInterval(() => setQueueCount(getQueueLength()), 5000);
    return () => clearInterval(interval);
  }, [offline]);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-lg animate-in slide-in-from-top duration-300">
      <WifiOff className="h-4 w-4" />
      <span>You're offline — showing cached data</span>
      {queueCount > 0 && (
        <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-600/30 text-xs">
          {queueCount} pending
        </span>
      )}
    </div>
  );
}