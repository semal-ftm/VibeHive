/* ==========================================================================
   sw.js — VibeHive service worker (makes the site an installable PWA)
   • Pages, CSS and JS always come fresh from the network when online, so an
     update can never mix old and new files; the cached copies are only used
     offline
   • Icons and fonts are cached for speed
   • API requests always go to the network – never stale posts or likes
   • Uploaded photos are cached as you see them
   • With no connection, pages fall back to offline.html
   Bump VERSION whenever the frontend changes so phones get the update.
   ========================================================================== */

const VERSION = "vibehive-v10";
const SHELL_CACHE = `${VERSION}-shell`;
const MEDIA_CACHE = `${VERSION}-media`;

const SHELL = [
  "./", "index.html", "login.html", "register.html", "profile.html", "explore.html",
  "notifications.html", "post.html", "messages.html", "chat.html", "offline.html", "manifest.webmanifest",
  "css/style.css",
  "js/theme-boot.js", "js/config.js", "js/api.js", "js/app.js", "js/vibes.js", "js/posts.js",
  "js/pwa.js", "js/auth.js", "js/feed.js", "js/explore.js", "js/profile.js",
  "js/notifications.js", "js/post.js", "js/offline.js", "js/auth-showcase.js", "js/messages.js", "js/chat.js",
  "assets/favicon.svg", "assets/icons/icon-192.png", "assets/icons/icon-512.png",
  "assets/icons/maskable-512.png", "assets/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Live data: always from the network
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin/")) return;

  // Uploaded avatars and post photos: cache-first
  if (url.pathname.startsWith("/media/")) {
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
    return;
  }

  // Page navigations: fresh from the network, cached copy or offline page as fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request, { ignoreSearch: true })) || caches.match("offline.html"))
    );
    return;
  }

  // CSS and JS: network first, so a new version is used immediately
  if (/\.(css|js)$/.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Icons, images and fonts: cached copy now, refreshed in the background
  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request, { cache: "no-cache" });
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request, { ignoreSearch: true })) || Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}
