/**
 * Service Worker — Sistema POS Miscelánea María José
 *
 * Funciones:
 * 1. Caché de assets estáticos (HTML, JS, CSS, imágenes, fuentes)
 * 2. Operación offline: sirve desde caché cuando no hay internet
 * 3. Sincronización en segundo plano cuando vuelve la conexión
 * 4. Actualización automática en segundo plano (Background Sync)
 */

const CACHE_NAME = "pos-miselanea-v2";

// Recursos críticos que siempre deben estar en caché
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/products.json",
  "/favicon.svg",
  "/icons.svg"
];

// Dominios externos que también se cachean
const CACHEABLE_ORIGINS = [
  "fonts.googleapis.com",
  "fonts.gstatic.com"
];

// ─── INSTALACIÓN ───────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] Instalando Service Worker v2...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Precargando assets estáticos en caché...");
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) =>
            console.warn(`[SW] No se pudo cachear ${url}:`, err)
          )
        )
      );
    }).then(() => {
      console.log("[SW] \u2705 Instalación completada.");
      return self.skipWaiting();
    })
  );
});

// ─── ACTIVACIÓN ──────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW] Activando nueva versión...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((oldCache) => {
            console.log(`[SW] Eliminando caché antigua: ${oldCache}`);
            return caches.delete(oldCache);
          })
      );
    }).then(() => {
      console.log("[SW] ✅ Activado. Tomando control de todas las pestañas.");
      return self.clients.claim().then(() => {
        return self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: "NEW_VERSION_AVAILABLE" });
          });
        });
      });
    })
  );
});

// ─── INTERCEPTAR PETICIONES (Fetch) ────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No interceptar peticiones de Firebase (Firestore, Auth, Storage)
  if (
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("firebase.googleapis.com") ||
    url.hostname.includes("securetoken.googleapis.com") ||
    url.hostname.includes("firebasestorage.googleapis.com")
  ) {
    return;
  }

  // No interceptar peticiones de verificación de red ni de versión de deploy
  if (
    url.searchParams.has("_network_ping") || 
    url.pathname === "/_ping" || 
    url.pathname === "/version.json"
  ) {
    return;
  }

  if (request.method !== "GET") return;

  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".ttf") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    CACHEABLE_ORIGINS.some((origin) => url.hostname.includes(origin))
  ) {
    event.respondWith(cacheFirst(request));
  } else if (
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    url.pathname.startsWith("/assets/")
  ) {
    event.respondWith(networkFirstWithFallback(request));
  } else if (url.pathname === "/products.json") {
    event.respondWith(staleWhileRevalidate(request));
  } else {
    event.respondWith(networkFirstWithFallback(request));
  }
});

// ─── ESTRATEGIAS DE CACHÉ ───────────────────────────────────────────────────
function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      if (response && response.status === 200) {
        caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      }
      return response;
    }).catch(() => new Response("Recurso no disponible offline", { status: 503 }));
  });
}

function networkFirstWithFallback(request) {
  return fetch(request).then((response) => {
    if (response && response.status === 200) {
      caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
    }
    return response;
  }).catch(() => {
    return caches.match(request).then((cached) => {
      if (cached) return cached;
      return caches.match("/index.html").then((index) => {
        if (index) return index;
        return new Response(
          `<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;color:#f1f5f9;text-align:center;padding:2rem">
            <div style="font-size:4rem;margin-bottom:1rem">📡</div>
            <h1 style="color:#f43f5e;margin-bottom:0.5rem">Sin conexión a internet</h1>
            <p style="color:#94a3b8;margin-bottom:1.5rem">El sistema POS funciona en modo offline.<br>Los datos locales están seguros.</p>
            <button onclick="location.reload()" style="background:#3b82f6;color:#fff;border:none;padding:12px 28px;border-radius:10px;font-size:1rem;cursor:pointer;font-weight:700">🔄 Reintentar</button>
          </body></html>`,
          { headers: { "Content-Type": "text/html" }, status: 503 }
        );
      });
    });
  });
}

function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then((cache) => {
    return cache.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        if (response && response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => null);
      return cached || networkFetch;
    });
  });
}

// ─── BACKGROUND SYNC ─────────────────────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending-ops") {
    console.log("[SW] \ud83d� Background Sync: sincronizando operaciones pendientes...");
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "SYNC_PENDING_OPS" });
        });
      })
    );
  }
});

// ─── MENSAJES DESDE LA APP ──────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[SW] Actualización forzada solicitada.");
    self.skipWaiting();
  }
  if (event.data && event.data.type === "GET_VERSION") {
    event.source.postMessage({ type: "SW_VERSION", version: CACHE_NAME });
  }
});

console.log(`[SW] Service Worker ${CACHE_NAME} cargado correctamente.`);
