const CACHE_NAME = "odot-app-v1";

self.addEventListener("install", (event) => {
  // Add caching during install
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll([
          "/",
          "/manifest.json",
          "/icon-192.png", // App icon referenced in manifest
          "/icon-512.png", // App icon referenced in manifest
        ]);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  console.log("Push event received:", event);

  if (!event.data) {
    console.log("Push event but no data");
    return;
  }

  let notificationData;
  try {
    notificationData = event.data.json();
  } catch (e) {
    console.error("Error parsing push data:", e);
    notificationData = {
      title: "New Notification",
      body: event.data.text() || "You have a new notification",
    };
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || "/logo.svg",
    badge: notificationData.badge || "/logo.svg",
    data: notificationData.data || {},
    actions: [
      {
        action: "view",
        title: "View",
        icon: "/logo.svg",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || "ODOT",
      options,
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  let url = "/";
  if (event.notification.data.todoId) {
    url = `/todos/${event.notification.data.todoId}`;
  }

  // Handle notification click
  const urlToOpen = new URL(url).href;

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window/tab open with our app
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }

        // If no window/tab is open, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      }),
  );
});

self.addEventListener("notificationclose", (event) => {
  console.log("Notification closed:", event);
});

// Handle background sync (optional)
self.addEventListener("sync", (event) => {
  console.log("Background sync:", event);
});

// Handle message from main thread
self.addEventListener("message", (event) => {
  console.log("Message received in SW:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  // Only cache GET requests
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return (
          response ||
          fetch(event.request).then((fetchResponse) => {
            // Cache JS/CSS assets and other static resources
            if (
              fetchResponse.ok &&
              (event.request.url.includes("/assets/") ||
                event.request.url.endsWith(".js") ||
                event.request.url.endsWith(".css") ||
                event.request.url.endsWith(".svg") ||
                event.request.url.endsWith(".png") ||
                event.request.url.endsWith(".jpg"))
            ) {
              const responseClone = fetchResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return fetchResponse;
          })
        );
      })
      .catch(() => {
        // Fallback for offline - return cached main page for navigation requests
        if (event.request.mode === "navigate") {
          return caches.match("/");
        }
      }),
  );
});
