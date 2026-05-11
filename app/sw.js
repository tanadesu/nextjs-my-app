const cacheName = "osaka-jintorigassen-v13";
const appShell = [
  ".",
  "index.html",
  "style.css",
  "script.js",
  "manifest.webmanifest",
  "supabase-config.js",
  "osaka-character.png",
  "migi/2.png",
  "migi/3.png",
  "migi/4.png",
  "migi/5.png",
  "migi/6.png",
  "migi/7.png",
  "migi/8.png",
  "migi/9.png",
  "migi/10.png",
  "icon.svg",
  "favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => cache.addAll(appShell)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        const shouldCache =
          event.request.url.startsWith(self.location.origin) &&
          networkResponse.ok;

        if (shouldCache) {
          const responseClone = networkResponse.clone();
          caches.open(cacheName).then((cache) => cache.put(event.request, responseClone));
        }

        return networkResponse;
      });
    }),
  );
});
