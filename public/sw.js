// Enhanced Service Worker for iOS background notifications
const CACHE_NAME = 'track-my-life-v2';
const DB_NAME = 'TrackMyLifeNotifications';
const DB_VERSION = 2;
const STORE_NAME = 'scheduled_notifications';

// Initialize IndexedDB for persistent notification storage
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      
      // Clear old stores if they exist
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      if (db.objectStoreNames.contains('app_data')) {
        db.deleteObjectStore('app_data');
      }
      
      // Create new store
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('scheduledTime', 'scheduledTime', { unique: false });
      store.createIndex('type', 'type', { unique: false });
    };
  });
}

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install');
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      openDB() // Initialize DB on install
    ])
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log('Service Worker: Clearing Old Cache');
              return caches.delete(cache);
            }
          })
        );
      }),
      setupBackgroundNotificationTimer()
    ])
  );
});

// Enhanced message handler for scheduling notifications
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    await storeNotification(event.data.data);
    event.ports[0]?.postMessage({ success: true });
  } else if (event.data && event.data.type === 'GET_SCHEDULED_NOTIFICATIONS') {
    const notifications = await getStoredNotifications();
    event.ports[0]?.postMessage({ notifications });
  } else if (event.data && event.data.type === 'CLEAR_OLD_NOTIFICATIONS') {
    await clearOldNotifications();
    event.ports[0]?.postMessage({ success: true });
  }
});

// Store notification in IndexedDB
async function storeNotification(notificationData) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    const notification = {
      id: notificationData.id || `notification_${Date.now()}_${Math.random()}`,
      title: notificationData.title,
      body: notificationData.body,
      scheduledTime: new Date(notificationData.scheduleAt).getTime(),
      type: notificationData.type || 'general',
      data: notificationData.data || {},
      created: Date.now()
    };
    
    await store.put(notification);
    console.log('SW: Stored notification:', notification);
    
    // Schedule immediate check if this is soon
    const timeUntil = notification.scheduledTime - Date.now();
    if (timeUntil > 0 && timeUntil < 5 * 60 * 1000) { // Within 5 minutes
      setTimeout(() => checkAndSendNotifications(), timeUntil);
    }
    
  } catch (error) {
    console.error('SW: Error storing notification:', error);
  }
}

// Get stored notifications
async function getStoredNotifications() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return await store.getAll();
  } catch (error) {
    console.error('SW: Error getting notifications:', error);
    return [];
  }
}

// Clear old notifications
async function clearOldNotifications() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const now = Date.now();
    
    const notifications = await store.getAll();
    for (const notification of notifications) {
      if (notification.scheduledTime < now - (24 * 60 * 60 * 1000)) { // Older than 24 hours
        await store.delete(notification.id);
      }
    }
  } catch (error) {
    console.error('SW: Error clearing old notifications:', error);
  }
}

// Background sync for notifications
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background Sync', event.tag);
  
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkAndSendNotifications());
  }
});

// Periodic background task to check for notifications
async function setupBackgroundNotificationTimer() {
  // Check notifications every minute when active
  setInterval(() => {
    checkAndSendNotifications();
  }, 60000); // 1 minute
  
  // Initial check
  await checkAndSendNotifications();
}

// Check and send due notifications
async function checkAndSendNotifications() {
  try {
    const notifications = await getStoredNotifications();
    const now = Date.now();
    
    for (const notification of notifications) {
      if (notification.scheduledTime <= now + 30000 && notification.scheduledTime > now - 60000) { // Within 30 seconds window
        await showNotification(notification);
        
        // Remove sent notification
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        await tx.objectStore(STORE_NAME).delete(notification.id);
        
        console.log('SW: Sent and removed notification:', notification.title);
      }
    }
    
    // Clean up very old notifications
    await clearOldNotifications();
  } catch (error) {
    console.error('SW: Error checking notifications:', error);
  }
}

// Show notification with iOS optimization
async function showNotification(notification) {
  const options = {
    body: notification.body,
    icon: '/lovable-uploads/fe018138-2090-4b1d-8808-4ed8082f7011.png',
    badge: '/lovable-uploads/fe018138-2090-4b1d-8808-4ed8082f7011.png',
    tag: `track-my-life-${notification.type}`,
    requireInteraction: true,
    silent: false,
    renotify: true,
    data: notification.data,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    // iOS specific optimizations
    image: notification.type === 'prayer' ? '/lovable-uploads/fe018138-2090-4b1d-8808-4ed8082f7011.png' : undefined
  };

  await self.registration.showNotification(notification.title, options);
}

// Enhanced push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push Received', event);
  
  let notificationData;
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = {
        title: 'Track My Life',
        body: event.data.text() || 'You have a new notification',
      };
    }
  } else {
    notificationData = {
      title: 'Track My Life',
      body: 'You have a new notification',
    };
  }
  
  const options = {
    body: notificationData.body,
    icon: '/lovable-uploads/fe018138-2090-4b1d-8808-4ed8082f7011.png',
    badge: '/lovable-uploads/fe018138-2090-4b1d-8808-4ed8082f7011.png',
    data: notificationData.data || {},
    requireInteraction: true,
    tag: notificationData.tag || 'track-my-life',
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    silent: false,
    renotify: true,
    // iOS PWA optimizations
    image: notificationData.image
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification Click', event);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Focus or open the app
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow(self.location.origin);
      }
    })
  );
});

// iOS PWA visibility change handler for background notifications
self.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // App went to background, ensure notifications are properly scheduled
    checkAndSendNotifications();
  }
});

// Keep service worker alive for iOS
self.addEventListener('fetch', (event) => {
  // Let browser handle all fetches normally
  // This event listener keeps the SW active
});

// Handle periodic background sync (for browsers that support it)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'background-notifications') {
    event.waitUntil(checkAndSendNotifications());
  }
});

// Message communication with app for debugging
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'PING') {
    console.log('SW: Received ping from app');
    event.ports[0]?.postMessage({ 
      status: 'active', 
      timestamp: Date.now(),
      storedNotifications: (await getStoredNotifications()).length
    });
  }
});