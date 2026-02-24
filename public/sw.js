const CACHE_NAME = 'math-olympiad-cache-v1';

// Add lists of files to cache here.
const urlsToCache = [
    '/',
    '/manifest.json', // If you have one
    // Any other static resources
    '/teacher',
    '/student'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                // We use addAll but wrap in try catch or ignore individual failures
                // Next.js static files can be complex, so we'll rely more on the fetch event handler
                return cache.addAll(urlsToCache).catch(err => console.log('Some static assets failed to cache', err));
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Network First strategy
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests, like those for Google Analytics.
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // For API requests, we could do network first, falling back to cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // If we get a valid response, clone it and store it in the cache
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                return response;
            })
            .catch(() => {
                // If network fails, try to return from cache
                return caches.match(event.request);
            })
    );
});
