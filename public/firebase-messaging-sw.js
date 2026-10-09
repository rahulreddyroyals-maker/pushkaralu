/* Firebase Cloud Messaging service worker (web push).
 * The Firebase web config is public; it is passed in the registration URL
 * (see src/lib/firebase/messaging.ts) so no secret or build step is needed here.
 * Pinned compat build — bump deliberately. */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

const params = new URL(self.location.href).searchParams;
firebase.initializeApp({
  apiKey: params.get("apiKey"),
  projectId: params.get("projectId"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
});
// Initialising messaging lets the SDK display "notification" payloads when the site is in the background.
firebase.messaging();

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && (event.notification.data.link || (event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.data && event.notification.data.FCM_MSG.data.link))) || "/notifications";
  // Only ever open paths on this site — never an arbitrary URL from a payload.
  const path = typeof link === "string" && link.startsWith("/") && !link.startsWith("//") ? link : "/notifications";
  event.waitUntil(clients.openWindow(new URL(path, self.location.origin).href));
});
