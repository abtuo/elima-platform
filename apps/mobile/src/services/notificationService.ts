import type { TimetableEvent } from "@/types/school";

export async function enableCourseNotifications() {
  if (!("Notification" in window)) return "unsupported" as const;
  return Notification.requestPermission();
}

export async function notifyUpcomingCourses(events: TimetableEvent[]) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const now = new Date();
  if (now.getHours() > 8 && now.getHours() < 18) return;
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const courses = events.filter((event) => new Date(event.startsAt).toDateString() === tomorrow.toDateString());
  if (!courses.length) return;
  const key = `elima-courses-reminder-${tomorrow.toISOString().slice(0, 10)}`;
  if (localStorage.getItem(key)) return;
  const title = courses.length === 1 ? "Votre cours de demain" : `Vos ${courses.length} cours de demain`;
  const body = courses.slice(0, 3).map((event) => `${new Date(event.startsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · ${event.subject}`).join("\n");
  const registration = await navigator.serviceWorker?.ready;
  if (registration) await registration.showNotification(title, { body, icon: "/icons/elima-app.png", badge: "/icons/elima-app.png", tag: key });
  else new Notification(title, { body, icon: "/icons/elima-app.png", tag: key });
  localStorage.setItem(key, "sent");
}
