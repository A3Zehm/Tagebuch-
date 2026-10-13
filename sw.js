// sw.js – Service Worker: speichert die App-Dateien auf dem Handy,
// damit die App auch ohne Internet (z. B. draußen im Außendienst) startet.
//
// Ablauf bei jedem Start: Die App kommt sofort aus dem Speicher, und im Hintergrund
// wird – falls Internet da ist – die neueste Version geholt. Eine neue Version
// siehst du deshalb ab dem übernächsten Öffnen der App.
// Deine Einträge sind davon nicht betroffen (die liegen im localStorage).

const CACHE = 'tagebuch-v2';
const DATEIEN = [
  './',
  'index.html',
  'css/style.css',
  'js/daten.js',
  'js/tagebuch.js',
  'js/app.js',
  'manifest.json',
  'icons/icon.svg',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', ereignis => {
  ereignis.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(DATEIEN)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ereignis => {
  ereignis.waitUntil(
    caches.keys()
      .then(namen => Promise.all(namen.filter(name => name !== CACHE).map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ereignis => {
  const anfrage = ereignis.request;
  if (anfrage.method !== 'GET' || !anfrage.url.startsWith(self.location.origin)) return;

  const ausDemNetz = caches.open(CACHE).then(cache =>
    fetch(anfrage).then(antwort => {
      if (antwort.ok) cache.put(anfrage, antwort.clone());
      return antwort;
    })
  );

  ereignis.respondWith(
    caches.match(anfrage, { ignoreSearch: true }).then(gespeichert => gespeichert || ausDemNetz)
  );
  ereignis.waitUntil(ausDemNetz.catch(() => {}));   // offline: einfach die gespeicherte Version behalten
});
