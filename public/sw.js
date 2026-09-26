// Service worker — satisfies PWA installability criteria, gives a friendly
// offline fallback, and (V2) receives Web Push messages. Deliberately does
// NOT cache-first any app route, API response, or Server Action: this app's
// data must always be fetched fresh (see the Client Router Cache staleness
// bug fixed earlier — a caching service worker would reintroduce that same
// class of bug at a lower level).

const CACHE_NAME = "smart-reminder-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only ever intervene for page navigations, and only to show an offline
  // fallback when the network genuinely fails — everything else (data
  // fetches, Server Actions, static assets) passes straight through to the
  // network exactly as if there were no service worker at all.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  );
});

// Payload shape is PushPayload from src/lib/push/server.ts: { title, body, tag, url? }.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      data: { url: payload.url || "/app" },
      icon: "/icons/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
