
import { API_BASE_URL } from "@/config/api-base";

import type { BookingPayload } from "@/types/boking";

import { emitBookingsChanged } from "@/utils/events";


// ...

/**
 * Backend: POST /api/Booking/create
 */
export async function createBooking(payload: BookingPayload): Promise<any> {
  const token = tokenOrThrow();

  const res = await fetch(`${API_BASE_URL}/Booking/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await unwrap<any>(res);

  // ✅ Notify the app that bookings changed
  emitBookingsChanged({ type: "created" });

  return data;
}


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
};

type ApiEnvelope<T> = {
  succeeded?: boolean;
  Succeeded?: boolean;
  message?: string;
  Message?: string;
  data?: T;
  Data?: T;
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
    // non-json
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

/**
 * Backend: GET /api/Booking/all_bookings_by_hotel?hotelId=1
 */
//  export async function fetchBookingsByHotel(hotelId?: number): Promise<BookingDto[]> {
//   const token = tokenOrThrow();
//    const hid = hotelId ?? getOptionalHotelId();
//    if (!hid) return [];

//    const q = new URLSearchParams({ hotelId: String(hid) });

//    const res = await fetch(`${API_BASE_URL}/Booking/all_bookings_by_hotel?${q.toString()}`, {
//      headers: { Authorization: `Bearer ${token}` },
//   });

//    return (await unwrap<BookingDto[]>(res)) || [];
//  }


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
  numbers?: string[]; // <-- vient du backend (Numbers)
  guestFirstName?: string | null;
  guestLastName?: string | null;
  guestCin?: string | null;
};

function normalizeBooking(b: ApiBookingDto): BookingDto {
  const guestName = `${b.guestFirstName ?? ""} ${b.guestLastName ?? ""}`.trim() || "Guest";
  const roomNumbers = (b.numbers && b.numbers.length > 0) ? b.numbers.join(", ") : "—";

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
  };
}

/**
 * ✅ Source unique: Backend GET /api/Booking/all
 */
// export async function fetchAllBookings(): Promise<BookingDto[]> {
//   const token = tokenOrThrow();

//   const res = await fetch(`${API_BASE_URL}/Booking/all`, {
//     headers: { Authorization: `Bearer ${token}` },
//     cache: "no-store", // 🔥 important pour éviter la réponse cachée
//   });

//   const raw = (await unwrap<ApiBookingDto[]>(res)) || [];
//   return raw.map(normalizeBooking);
// }

/**
 * (Optionnel) si tu veux filtrer côté UI pour Admin/Manager
 */
export async function fetchBookingsByHotel(hotelId?: number): Promise<BookingDto[]> {
  const all = await fetchAllBookings();
  if (!hotelId) return all;
  return all.filter((b) => b.hotelId === hotelId);
}


/**
 * ✅ Compat: ton Dashboard importait fetchAllBookings
 * On le mappe sur fetchBookingsByHotel() (hotelId pris depuis localStorage)
 */
export async function fetchAllBookings(): Promise<BookingDto[]> {
  const token = tokenOrThrow();

  // Anti-cache (au cas où ResponseCache côté backend)
  const url = `${API_BASE_URL}/Booking/all?t=${Date.now()}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const raw = (await unwrap<ApiBookingDto[]>(res)) || [];
  return raw.map(normalizeBooking);
}



/**
 * Backend: PUT /api/Booking/{bookingId}/Update_status
 * Body: BookingStatus enum (NUMBER)
 */
export async function updateBookingStatus(bookingId: number, statusId: number): Promise<void> {
  const token = tokenOrThrow();

  const res = await fetch(`${API_BASE_URL}/Booking/${bookingId}/Update_status`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(statusId),
  });

  await unwrap<void>(res);

  // ✅ Notify the app that bookings changed
  emitBookingsChanged({ type: "status-updated", bookingId, statusId });
}

const COMPLETED_STATUS_ID = 3;

export async function completeBooking(bookingId: number): Promise<void> {
  await updateBookingStatus(bookingId, COMPLETED_STATUS_ID);
}


/**
 * ✅ Annulation
 * IMPORTANT: tu dois mettre ici la vraie valeur enum "Cancelled" de ton backend.
 * Chez toi tu as déjà hésité (2 vs 3). Mets la valeur correcte.
 */
export async function cancelBooking(bookingId: number): Promise<void> {
  const CANCELLED_STATUS_ID = 2; // <-- change si ton enum Cancelled = 2
  return updateBookingStatus(bookingId, CANCELLED_STATUS_ID);
}
