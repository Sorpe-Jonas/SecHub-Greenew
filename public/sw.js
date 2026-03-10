const CACHE_NAME = "sechub-v2";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];
const ACTIVE_TIMER_TAG = "sechub-active-timer";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }

          return Promise.resolve();
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const { request } = event;
  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/") || Response.error()),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (!response.ok) {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return response;
      });
    }),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;

  if (!data || typeof data !== "object") {
    return;
  }

  if (data.type === "SHOW_ACTIVE_TIMER") {
    const seconds = Number(data.seconds || 0);
    const hours = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const remainingSeconds = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    const timerLabel = `${hours}:${minutes}:${remainingSeconds}`;
    const ticketLabel = data.ticketLabel ? `Ticket: ${data.ticketLabel}` : "Sem ticket vinculado";

    event.waitUntil(
      self.registration.showNotification("TimeSheet ativo", {
        tag: ACTIVE_TIMER_TAG,
        renotify: false,
        requireInteraction: true,
        body: `${timerLabel} · ${ticketLabel}`,
        icon: "/icon.svg",
        badge: "/icon.svg",
        data: {
          href: "/timesheet",
        },
      }),
    );
    return;
  }

  if (data.type === "CLOSE_ACTIVE_TIMER") {
    event.waitUntil(
      self.registration.getNotifications({ tag: ACTIVE_TIMER_TAG }).then((notifications) => {
        notifications.forEach((notification) => notification.close());
      }),
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate("/timesheet");
          return client.focus();
        }
      }

      return self.clients.openWindow("/timesheet");
    }),
  );
});
