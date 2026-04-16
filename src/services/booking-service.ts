import type { BookingPayload } from "@/types/boking";
import { emitBookingsChanged } from "@/utils/events";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type BookingDto = {
  bookingId: number;
  hotelId: number;
  userName: string;
  confirmationNumber: string;
  totalPrice: number;
  bookingDateUtc: string;
  paymentMethod: string;
  checkInDateUtc: string;
  checkOutDateUtc: string;
  durationType: string;
  status: string;
  guestName: string;
  roomNumbers: string;

  // Cancellation audit (optional)
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
  userName?: string;
  confirmationNumber: string;
  totalPrice: number;
  bookingDateUtc: string;
  paymentMethod: string;
  afterDiscountedPrice?: number | null;
  hotelName?: string;
  checkInDateUtc: string;
  checkOutDateUtc: string;
  status: string;
  numbers?: string[]; // vient du backend (Numbers)
  guestFirstName?: string | null;
  guestLastName?: string | null;
  guestCin?: string | null;

  // Cancellation audit (camelCase if backend uses JsonNamingPolicy.CamelCase)
  cancellationReason?: string | null;
  cancelledAtUtc?: string | null;
  cancelledByUserId?: string | null;
};

function tokenOrThrow(): string {
  const t = localStorage.getItem("token");
  if (!t) throw new Error("Not authenticated. Please log in again.");
  return t;
}

function getOptionalHotelId(): number | null {
  const raw = localStorage.getItem("hotelId");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function unwrap<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: any = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // réponse non JSON
  }

  if (!res.ok) {
    const msg = json?.message || json?.Message || text || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  if (json && typeof json === "object") {
    const env = json as ApiEnvelope<T>;
    if (env.Data !== undefined) return env.Data as T;
    if (env.data !== undefined) return env.data as T;
  }

  return json as T;
}

function normalizeBooking(b: ApiBookingDto): BookingDto {
  const guestName = `${b.guestFirstName ?? ""} ${b.guestLastName ?? ""}`.trim() || "Guest";
  const roomNumbers = b.numbers && b.numbers.length > 0 ? b.numbers.join(", ") : "—";

  return {
    bookingId: b.bookingId,
    hotelId: b.hotelId,
    userName: b.userName ?? "",
    confirmationNumber: b.confirmationNumber,
    totalPrice: b.totalPrice,
    bookingDateUtc: b.bookingDateUtc,
    paymentMethod: b.paymentMethod,
    checkInDateUtc: b.checkInDateUtc,
    checkOutDateUtc: b.checkOutDateUtc,
    durationType: (b as any).durationType ?? "",
    status: b.status,
    guestName,
    roomNumbers,

    cancellationReason: b.cancellationReason ?? null,
    cancelledAtUtc: b.cancelledAtUtc ?? null,
    cancelledByUserId: b.cancelledByUserId ?? null,
  };
}

/**
 * Backend: POST /api/Booking/create
 */
export async function createBooking(payload: BookingPayload): Promise<any> {
  const token = tokenOrThrow();

  const res = await fetch(`${BASE_URL}/Booking/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await unwrap<any>(res);

  emitBookingsChanged({ type: "created" });
  return data;
}

/**
 * Backend: GET /api/Booking/all
 */
export async function fetchAllBookings(): Promise<BookingDto[]> {
  const token = tokenOrThrow();

  // anti-cache côté front (au cas où backend cache)
  const url = `${BASE_URL}/Booking/all?t=${Date.now()}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const raw = (await unwrap<ApiBookingDto[]>(res)) || [];
  return raw.map(normalizeBooking);
}

/**
 * Filtrage côté UI par hôtel (optionnel)
 */
export async function fetchBookingsByHotel(hotelId?: number): Promise<BookingDto[]> {
  const all = await fetchAllBookings();
  const hid = hotelId ?? getOptionalHotelId();
  if (!hid) return all;
  return all.filter((b) => b.hotelId === hid);
}

/**
 * Backend: PUT /api/Booking/{bookingId}/Update_status
 * Body: BookingStatus enum (NUMBER)
 */
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

const COMPLETED_STATUS_ID = 3;

export async function completeBooking(bookingId: number): Promise<void> {
  await updateBookingStatus(bookingId, COMPLETED_STATUS_ID);
}

/**
 * ✅ Annulation (backend 21)
 * Backend: PUT /api/Booking/{id}/cancel
 * Body: { reason: string }
 *
 * IMPORTANT: on n'utilise PAS le fallback "update-status Cancelled"
 * car côté backend ça peut supprimer le booking si pas corrigé.
 */
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
