/** Dispatched when read state or threads change — nav badges refresh. */
export const MESSAGING_UPDATED_EVENT = "elima:messaging-updated";

export function notifyMessagingUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MESSAGING_UPDATED_EVENT));
}
