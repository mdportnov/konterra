/// <reference lib="webworker" />
import type { PrecacheEntry } from "serwist"
import { Serwist, CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate, ExpirationPlugin, CacheableResponsePlugin } from "serwist"

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST: (PrecacheEntry | string)[] }

const cacheOkOnly = new CacheableResponsePlugin({ statuses: [200] })

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: /\.(?:js|css)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-resources",
        plugins: [cacheOkOnly, new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
    {
      matcher: /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i,
      handler: new CacheFirst({
        cacheName: "images",
        plugins: [cacheOkOnly, new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 60 * 24 * 60 * 60 })],
      }),
    },
    {
      matcher: /\.(?:woff|woff2|ttf|otf|eot)$/i,
      handler: new CacheFirst({
        cacheName: "fonts",
        plugins: [cacheOkOnly, new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 365 * 24 * 60 * 60 })],
      }),
    },
    {
      matcher: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "google-fonts",
        plugins: [cacheOkOnly, new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 365 * 24 * 60 * 60 })],
      }),
    },
    {
      matcher: ({ url, request }) =>
        request.method === "GET" &&
        /^\/api\/(contacts|connections|visited-countries|wishlist-countries|country-connections|tags|trips|interactions|favors)\b/.test(url.pathname),
      handler: new StaleWhileRevalidate({
        cacheName: "globe-api-data",
        plugins: [cacheOkOnly, new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 7 * 24 * 60 * 60 })],
      }),
    },
    {
      matcher: /\/api\//i,
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages",
        plugins: [cacheOkOnly, new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 30 * 24 * 60 * 60 })],
        networkTimeoutSeconds: 3,
      }),
    },
  ],
  fallbacks: {
    entries: [{ url: "/offline", matcher: ({ request }) => request.destination === "document" }],
  },
})

serwist.addEventListeners()
