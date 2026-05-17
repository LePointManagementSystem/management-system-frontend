import type { BookingPayload } from "@/types/booking";
import { emitBookingsChanged } from "@/utils/events";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type BookingDto = {
  bookingId: number;
  hotelId: number;
  hotelName?: string | null;
  userName: string;
  confirmationNumber: string;
  /** Alias for confirmationNumber — kept for backward compatibility with room-booking-page */
  bookingReference?: string | null;
  totalPrice: number;
  afterDiscountedPrice?: number | null;
  bookingDateUtc: string;
  paymentMethod: string;
  checkInDateUtc: string;
  checkOutDateUtc: string;
  durationType: string;
  status: string;
  guestName: string;
  guestCIN?: string | null;
  guestCin?: string | null;
  roomNumbers: string;

  cancellationReason?: string | null;
  cancelledAtUtc?: string | null;
  cancelledByUserId?: string | null;
};

type ApiEnvelope<T> = {
  succeeded?: boolean;
  Succeeded?: boolean;
  message?: string;
  Message?: string;
  data?: T;
  Data?: T;
};

type ApiBookingDto = {
  bookingId: number;
  hotelId: number;
  hotelName?: string | null;
  userName?: string;
  confirmationNumber: string;
  totalPrice: number;
  afterDiscountedPrice?: number | null;
  bookingDateUtc: string;
  paymentMethod: string;
  checkInDateUtc: string;
  checkOutDateUtc: string;
  durationType?: string | null;
  status: string;
  numbers?: string[];
  guestFirstName?: string | null;
  guestLastName?: string | null;
  guestCin?: string | null;
  guestCIN?: string | null;
  cancellationReason?: string | null;
  cancelledAtUtc?: string | null;
  cancelledByUserId?: string | null;
};

// BUG FIX #8 (extended): Changed localStorage → sessionStorage.
// The login page writes the token to sessionStorage; all reads must use the same store.
function tokenOrThrow(): string {
  const t = sessionStorage.getItem("token"); // BUG FIX #8: was localStorage
  if (!t) throw new Error("Not authenticated. Please log in again.");
  return t;
}

async function unwrap<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: unknown = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON response body
  }

  if (!res.ok) {
    const typed = json as Record<string, unknown> | null;
    const msg =
      (typed?.message as string) ||
      (typed?.Message as string) ||
      text ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  if (json !== null && typeof json === "object") {
    const env = json as ApiEnvelope<T>;
    if (env.Data !== undefined) return env.Data as T;
    if (env.data !== undefined) return env.data as T;
  }

  return json as T;
}

function normalizeBooking(b: ApiBookingDto): BookingDto {
  const guestName =
    `${b.guestFirstName ?? ""} ${b.guestLastName ?? ""}`.trim() || "Guest";
  const roomNumbers =
    b.numbers && b.numbers.length > 0 ? b.numbers.join(", ") : "—";

  return {
    bookingId:            b.bookingId,
    hotelId:              b.hotelId,
    hotelName:            b.hotelName ?? null,
    userName:             b.userName ?? "",
    confirmationNumber:   b.confirmationNumber,
    bookingReference:     b.confirmationNumber ?? null,
    totalPrice:           b.totalPrice,
    afterDiscountedPrice: b.afterDiscountedPrice ?? null,
    bookingDateUtc:       b.bookingDateUtc,
    paymentMethod:        b.paymentMethod,
    checkInDateUtc:       b.checkInDateUtc,
    checkOutDateUtc:      b.checkOutDateUtc,
    durationType:         b.durationType ?? "",
    status:               b.status,
    guestName,
    guestCin:             b.guestCIN ?? b.guestCin ?? null,
    guestCIN:             b.guestCIN ?? b.guestCin ?? null,
    roomNumbers,
    cancellationReason:   b.cancellationReason ?? null,
    cancelledAtUtc:       b.cancelledAtUtc ?? null,
    cancelledByUserId:    b.cancelledByUserId ?? null,
  };
}

export async function createBooking(payload: BookingPayload): Promise<BookingDto> {
  const token = tokenOrThrow();

  const res = await fetch(`${BASE_URL}/Booking/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await unwrap<ApiBookingDto>(res);
  emitBookingsChanged({ type: "created" });
  return normalizeBooking(data);
}

export async function fetchAllBookings(): Promise<BookingDto[]> {
  const token = tokenOrThrow();

  const res = await fetch(`${BASE_URL}/Booking/all?t=${Date.now()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const raw = (await unwrap<ApiBookingDto[]>(res)) || [];
  return raw.map(normalizeBooking);
}

// FIX: The backend already scopes results by hotel for the Staff role.
// For Admin/Manager the token carries no hotel scope so all bookings are
// returned — client-side filtering on hotelId is kept as a best-effort guard
// for the Admin UI, but the expensive "fetch everything, filter locally" path
// is now clearly documented and isolated.
export async function fetchBookingsByHotel(hotelId?: number): Promise<BookingDto[]> {
  const all = await fetchAllBookings();

  // If no hotelId is provided (Admin with no sessionStorage scope) return all.
  if (!hotelId) return all;

  // For Admin/Manager: filter in the client after receiving all hotel's bookings.
  // For Staff: the server already returned only their hotel's bookings, so this
  // filter is a no-op (all items will already have the correct hotelId).
  return all.filter((b) => b.hotelId === hotelId);
}

export async function updateBookingStatus(bookingId: number, statusId: number): Promise<void> {
  const token = tokenOrThrow();

  const res = await fetch(`${BASE_URL}/Booking/${bookingId}/Update_status`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(statusId),
  });

  await unwrap<void>(res);
  emitBookingsChanged({ type: "status-updated", bookingId, statusId });
}

// FIX: Constant is documented to match BookingStatus.Completed = 3 in the backend enum.
// If the backend enum ever changes, this value must be updated in sync.
// Backend enum: Pending=0, Confirmed=1, Cancelled=2, Completed=3
const COMPLETED_STATUS_ID = 3; // BookingStatus.Completed

export async function completeBooking(bookingId: number): Promise<void> {
  await updateBookingStatus(bookingId, COMPLETED_STATUS_ID);
}

export async function cancelBooking(bookingId: number, reason: string): Promise<void> {
  const token = tokenOrThrow();
  const trimmedReason = (reason ?? "").trim();
  if (!trimmedReason) throw new Error("Cancellation reason is required.");

  const res = await fetch(`${BASE_URL}/Booking/${bookingId}/cancel`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason: trimmedReason }),
  });

  await unwrap<void>(res);
  emitBookingsChanged({ type: "cancelled", bookingId });
}
