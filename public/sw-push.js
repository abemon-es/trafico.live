/**
 * trafico.live — Web Push Service Worker
 *
 * Handles incoming push notifications and sends them to the user.
 * Registered from PushPermissionPrompt.tsx.
 *
 * NOTE: Push notifications require HTTPS in production.
 * On localhost without a dev certificate, subscription will fail silently —
 * test on staging (HTTPS) before verifying this flow.
 *
 * VAPID public key must be set in NEXT_PUBLIC_VAPID_PUBLIC_KEY env var.
 */

"use strict";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

/**
 * Push event — fired when the server sends a push notification via Web Push API.
 * Payload JSON shape:
 * {
 *   title: string,
 *   body: string,
 *   icon?: string,   // defaults to /icon-192.png
 *   badge?: string,  // defaults to /badge-72.png
 *   tag?: string,    // notification grouping key
 *   url?: string,    // URL to open on click
 *   data?: object,   // arbitrary data forwarded to notificationclick
 * }
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "trafico.live", body: event.data.text() };
  }

  const {
    title = "trafico.live",
    body = "Nueva alerta de tráfico",
    icon = "/icon-192.png",
    badge = "/badge-72.png",
    tag = "trafico-alert",
    url = "/alertas",
    data = {},
  } = payload;

  const options = {
    body,
    icon,
    badge,
    tag,
    requireInteraction: false,
    data: { url, ...data },
    actions: [
      { action: "open", title: "Ver" },
      { action: "dismiss", title: "Cerrar" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Notification click — open or focus the target URL.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url ?? "/alertas";
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing window if already open on the target URL
        for (const client of windowClients) {
          if (client.url === absoluteUrl && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(absoluteUrl);
        }
      })
  );
});
