// Basilix Service Worker — handles Web Push when app is closed
const CACHE_NAME = "basilix-v3";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
    ])
  );
});

// Keep SW alive for background push
self.addEventListener("fetch", () => {});

// ─── PUSH EVENT — fires even when app is fully closed ─────────────────────
self.addEventListener("push", event => {
  let payload = {};
  if (event.data) {
    try { payload = event.data.json(); }
    catch { payload = { title: "Basilix", body: event.data.text() }; }
  }

  const title   = payload.title  || "Basilix";
  const options = {
    body:               payload.body   || "",
    icon:               payload.icon   || "/lovable-uploads/fe018138-2090-4b1d-8808-4ed8082f7011.png",
    badge:              payload.badge  || "/lovable-uploads/fe018138-2090-4b1d-8808-4ed8082f7011.png",
    tag:                payload.tag    || "basilix",
    data:               payload.data   || {},
    requireInteraction: true,
    renotify:           true,
    silent:             false,
    actions: [
      { action: "open",    title: "Open App" },
      { action: "dismiss", title: "Dismiss"  }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── NOTIFICATION CLICK ────────────────────────────────────────────────────
self.addEventListener("notificationclick", event => {
  event.notification.close();
  if (event.action === "dismiss") return;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && "focus" in c) return c.focus();
      }
      return clients.openWindow(self.location.origin);
    })
  );
});
