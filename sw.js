// حصر كميات QOB - عامل الخدمة
// الاستراتيجية:
// - الصفحة الرئيسية والمانيفست: من الإنترنت أولاً، ثم من الكاش عند عدم وجود اتصال.
// - الأيقونات ومكتبات Firebase والتصدير (cdnjs وgstatic): من الكاش أولاً.
// - واجهات Firebase نفسها تذهب إلى الشبكة دائماً ولا تُخزَّن.
// عند كل نشر لنسخة جديدة غيّر رقم الكاش أدناه (مثلاً qty-v18).
const C = 'qty-v18';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
const CDN = ['www.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('qty-') && k !== C).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));

function keep(req, res) {
  if (res && (res.ok || res.type === 'opaque')) {
    const copy = res.clone();
    caches.open(C).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (CDN.includes(u.hostname)) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => keep(r, res))));
    return;
  }
  if (u.origin !== self.location.origin) return; // واجهات Firebase وغيرها: الشبكة مباشرة
  const shell = r.mode === 'navigate' || /(\/|\.html|\.webmanifest)$/.test(u.pathname);
  if (shell) {
    e.respondWith(fetch(r).then(res => keep(r, res)).catch(() => caches.match(r).then(m => m || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => keep(r, res))));
});
