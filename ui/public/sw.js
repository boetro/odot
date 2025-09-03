const CACHE_NAME = "odot-app-v2";

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
