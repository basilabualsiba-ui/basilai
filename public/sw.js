// Basilix Service Worker — handles Web Push + Offline caching
const CACHE_NAME = "basilix-v4";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/lovable-uploads/fe018138-2090-4b1d-8808-4ed8082f7011.png",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

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

// ─── FETCH — caching strategies ───────────────────────────────────────────
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Supabase API: stale-while-revalidate
  if (url.hostname.includes("supabase.co") && url.pathname.startsWith("/rest/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then(response => {
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Supabase Storage (images): cache-first
  if (url.hostname.includes("supabase.co") && url.pathname.includes("/storage/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        } catch {
          return new Response("", { status: 503 });
        }
      })
    );
    return;
  }

  // App shell & assets: cache-first, fallback to network
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok && (url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.endsWith(".png") || url.pathname.endsWith(".jpg") || url.pathname.endsWith(".svg"))) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // For navigation requests, return cached index.html (SPA fallback)
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
          return new Response("", { status: 503 });
        });
      })
    );
    return;
  }
});

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