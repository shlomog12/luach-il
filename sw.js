const CACHE = 'luach-v5';
const ASSETS = [
  './', './index.html', './manifest.json', './icon.svg', './privacy.html',
  './icon-180.png', './icon-192.png', './icon-512.png', './favicon-32.png',
  './styles/main.css',
  './src/main.js',
  './src/config/constants.js', './src/config/locations.js',
  './src/services/HebrewCalendarService.js', './src/services/ZmanimService.js',
  './src/services/ElevationService.js', './src/services/GoogleAuthService.js',
  './src/services/GoogleCalendarService.js',
  './src/state/ViewModeStore.js', './src/state/LocationStore.js',
  './src/state/ZmanimDisclosureStore.js', './src/state/EventsStore.js',
  './src/state/CalendarNavigationStore.js',
  './src/components/ModeToggle.js', './src/components/NavControls.js',
  './src/components/CalendarGrid.js', './src/components/DayDetailPanel.js',
  './src/components/EventsListPanel.js', './src/components/LocationDialog.js',
  './src/components/JumpToDatePanel.js', './src/components/AuthStatusBar.js',
  './src/utils/dateFormat.js', './src/utils/safeStorage.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first for everything (so calendar/API calls always hit the network);
// fall back to cache only for the app shell when offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // never intercept Google API calls
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
