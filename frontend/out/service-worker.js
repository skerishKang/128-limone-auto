const CACHE_NAME = 'limone-auto-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// 안전한 캐시 추가 함수
async function cacheResources(cache) {
  const cachePromises = urlsToCache.map(async (url) => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        console.log(`[SW] Cached: ${url}`);
      } else {
        console.log(`[SW] Skipped (not found): ${url}`);
      }
    } catch (error) {
      console.log(`[SW] Failed to cache: ${url}`, error.message);
    }
  });
  await Promise.allSettled(cachePromises);
}

// 서비스 워커 설치
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cacheResources(cache);
      })
  );
});

// 네트워크 요청 인터셉트
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에 있으면 반환
        if (response) {
          return response;
        }
        // 없으면 네트워크에서 가져오기
        return fetch(event.request);
      }
    )
  );
});

// 캐시 업데이트
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
});
