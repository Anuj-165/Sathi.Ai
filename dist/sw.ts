const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE_NAME = 'sathi-tactical-v3';

const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

sw.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  sw.skipWaiting();
});

sw.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil((async () => {
    if ('navigationPreload' in sw.registration) {
      await sw.registration.navigationPreload.enable();
    }

    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
  })());
});

sw.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ✅ HARD BYPASS (AI + large files)
  if (
    url.hostname.includes('huggingface.co') ||
    url.pathname.match(/\.(gguf|bin|wasm|onnx|tar\.gz)$/) ||
    url.pathname.includes('web-llamacpp')
  ) {
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    try {
      const networkResponse = await fetch(event.request);

      const requestUrl = event.request.url;

      const isStaticAsset =
        requestUrl.endsWith('.js') ||
        requestUrl.endsWith('.css') ||
        requestUrl.endsWith('.html') ||
        requestUrl.endsWith('.png') ||
        requestUrl.endsWith('.jpg') ||
        requestUrl.endsWith('.svg');

      if (isStaticAsset && networkResponse.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, networkResponse.clone());
      }

      return networkResponse;

    } catch (err) {
      if (event.request.mode === 'navigate') {
        const offlinePage = await caches.match('/offline.html');
        if (offlinePage) return offlinePage;
      }

      return new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  })());
});