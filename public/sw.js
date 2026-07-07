// Minimal service worker: satisfies PWA installability (required for the
// Android TWA wrapper) WITHOUT caching anything. The cockpit is live-data
// software — a stale cache showing yesterday's pipeline is worse than a
// spinner, so every request goes straight to the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => { /* network passthrough */ });
