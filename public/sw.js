// Bump this on any app-shell change so old caches get cleared on activate.
const CACHE_VERSION = 'v2';
const CACHE_NAME = `vdv-crm-${CACHE_VERSION}`;

const APP_SHELL = [
  '/index.html',
  '/login.html',
  '/customers.html',
  '/customer-detail.html',
  '/loans.html',
  '/loan-detail.html',
  '/loan-new.html',
  '/overdue.html',
  '/emi-calculator.html',
  '/reports.html',
  '/activity.html',
  '/settings.html',
  '/manifest.json',
  '/assets/css/style.css',
  '/assets/js/api.js',
  '/assets/js/format.js',
  '/assets/js/nav.js',
  '/assets/js/modal.js',
  '/assets/js/customer-form.js',
  '/assets/js/emi-calc.js',
  '/assets/js/sw-register.js',
  '/assets/js/pages/dashboard.js',
  '/assets/js/pages/customers.js',
  '/assets/js/pages/customer-detail.js',
  '/assets/js/pages/loans.js',
  '/assets/js/pages/loan-detail.js',
  '/assets/js/pages/loan-new.js',
  '/assets/js/pages/overdue.js',
  '/assets/js/pages/emi-calculator.js',
  '/assets/js/pages/reports.js',
  '/assets/js/pages/activity.js',
  '/assets/js/pages/settings.js',
  '/assets/js/pages/login.js',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-512-maskable.png',
  '/assets/icons/apple-touch-icon.png',
  '/assets/icons/favicon-32.png',
  '/assets/icons/favicon-64.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // Best-effort: one missing/renamed file shouldn't fail the whole install.
      .then((cache) => Promise.all(APP_SHELL.map((url) => cache.add(url).catch((err) => console.warn('sw: precache skip', url, err.message)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Loan/customer/payment data must always be live — never served from cache.
  if (url.pathname.startsWith('/api/')) return;

  // Network-first: an online user always gets what was just deployed: the
  // cache is only a fallback for when the network request itself fails.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => {
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('/index.html');
        return undefined;
      }))
  );
});
