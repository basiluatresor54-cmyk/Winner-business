/* Stock & Livreurs — service worker : ouverture instantanée et hors connexion */
const VERSION = 'f952b5c478';
const CACHE = 'stock-livreurs-' + VERSION;
const CORE = ['./', 'index.html', 'supabase.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'guide.html', 'conditions.html'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('stock-livreurs-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const timeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); }); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if(req.method !== 'GET' || url.origin !== location.origin) return;           // Supabase et WhatsApp : jamais en cache
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  if(isPage){
    // Page : réseau d'abord (mises à jour), sinon la copie gardée (hors connexion ou réseau trop lent)
    e.respondWith(timeout(fetch(req), 3500).then(r => { if(r && r.ok){ const c = r.clone(); caches.open(CACHE).then(x => x.put('index.html', c)); } return r; })
      .catch(() => caches.match('index.html').then(r => r || caches.match('./'))));
    return;
  }
  // Fichiers (images, supabase.js…) : copie gardée d'abord, mise à jour en arrière-plan
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if(r && r.ok){ const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
