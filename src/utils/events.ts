export const BOOKINGS_CHANGED_EVENT = "bookings:changed";

export function emitBookingsChanged(detail?: unknown) {
  window.dispatchEvent(new CustomEvent(BOOKINGS_CHANGED_EVENT, { detail }));
}

export function onBookingsChanged(handler: () => void) {
  const listener = () => handler();
  window.addEventListener(BOOKINGS_CHANGED_EVENT, listener);
  return () => window.removeEventListener(BOOKINGS_CHANGED_EVENT, listener);
}
