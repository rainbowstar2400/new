self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "リマインド", {
      body: payload.body ?? "通知があります",
      data: { taskId: payload.taskId ?? "" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const taskId = event.notification.data?.taskId;
  const target = taskId ? `/?taskId=${encodeURIComponent(taskId)}` : "/";
  event.waitUntil(clients.openWindow(target));
});
