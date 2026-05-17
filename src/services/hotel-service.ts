// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX — 401 sur toutes les requêtes POST/PUT dans hotel-service.ts
//
// PROBLÈME (fetchJson original) :
//
//   const res = await fetch(url, {
//     headers: {
//       Accept: "application/json",
//       ...authHeaders(),       // ← { Authorization: "Bearer xxx" }
//       ...options.headers,     // ← { "Content-Type": "application/json" }
//     },
//     ...options,               // ← BUG : options contient AUSSI { headers: {...} }
//                               //   Ce ...options ÉCRASE la clé `headers` construite
//                               //   ci-dessus, supprimant Authorization !
//   })
//
// POURQUOI les GET fonctionnent :
//   Les appels GET ne passent pas de `headers` dans options → ...options ne contient
//   pas de clé `headers` → le header Authorization est préservé.
//
// POURQUOI les POST/PUT échouent :
//   addHotel / updateHotel / addHotelAmenity passent tous :
//     options = { method: "POST", headers: { "Content-Type": "..." }, body: ... }
//   Quand ...options est étalé, il réécrit `headers` avec { "Content-Type" seulement },
//   effaçant complètement Authorization → le serveur reçoit une requête sans token → 401.
//
// CORRECTION :
//   Destructurer `headers` hors de `options` avant de les étaler séparément,
//   empêchant toute collision de clé.
// ─────────────────────────────────────────────────────────────────────────────

import type { Hotel, Room, Amenity, Image, RoomClass } from "@/types/hotel"

const BASE_URL = import.meta.env.VITE_API_BASE_URL

// ─── Auth helper ──────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("token") // BUG FIX #8: was localStorage
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ─── Generic fetch with auth ──────────────────────────────────────────────────
// BUG FIX: Destructure `headers` from `options` before spreading `...restOptions`.
// The original code did `...options` at the end of the fetch config, which
// overwrote the merged `headers` object whenever `options.headers` was set,
// silently dropping the Authorization header and causing 401 on POST/PUT.

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  // BUG FIX: separate `headers` from the rest of `options` to prevent
  // the `...options` spread from overwriting the merged headers object.
  const { headers: optHeaders, ...restOptions } = options

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...authHeaders(),
      ...(optHeaders as Record<string, string> | undefined),
    },
    ...restOptions, // BUG FIX: spread restOptions (WITHOUT headers) — no overwrite
  })

  const raw = await res.text()
  let json: unknown = null
  try {
    json = raw ? JSON.parse(raw) : null
  } catch {
    // non-JSON body
  }

  if (!res.ok) {
    const msg =
      (json as Record<string, string>)?.message ||
      (json as Record<string, string>)?.Message ||
      (json as Record<string, string>)?.error ||
      raw ||
      `API error (${res.status})`
    throw new Error(msg)
  }

  // Unwrap API envelope { succeeded, data: T } if present
  const envelope = json as Record<string, unknown> | null
  if (envelope && typeof envelope === "object") {
    if ("data" in envelope) return envelope.data as T
    if ("Data" in envelope) return envelope.Data as T
  }

  return json as T
}

// ─── Hotels ───────────────────────────────────────────────────────────────────

function normalizeHotel(h: Record<string, unknown>): Hotel {
  return {
    id: Number(h.id ?? h.hotelId ?? h.hotelID ?? 0),
    name: (h.name as string) ?? "Unnamed Hotel",
    starRating: Number(h.starRating ?? 0),
    description: (h.description as string) ?? "",
    phoneNumber: (h.phoneNumber as string) ?? "",
    ownerName: (h.ownerName as string) ?? "Unknown Owner",
    ownerID: Number(h.ownerID ?? h.ownerId ?? h.OwnerId ?? 0),
  }
}

export const getHotels = async (): Promise<Hotel[]> => {
  const raw = await fetchJson<unknown>(`${BASE_URL}/Hotel`)
  // fetchJson already unwraps the envelope — raw is the data array
  const list = Array.isArray(raw)
    ? raw
    : (raw as Record<string, unknown>)?.data ?? raw
  if (!Array.isArray(list)) {
    if (list && typeof list === "object")
      return [normalizeHotel(list as Record<string, unknown>)].filter((h) => h.id > 0)
    throw new Error("Invalid hotels response format")
  }
  return (list as Record<string, unknown>[]).map(normalizeHotel).filter((h) => h.id > 0)
}

// Pour créer un hôtel, on passe par POST /City/{cityId}/hotels.
// BUG FIX: avant le correctif, le header Authorization était supprimé par
// le spread de `options` dans fetchJson → le serveur répondait 401.
export const addHotel = async (
  hotel: Omit<Hotel, "id"> & { cityId?: number }
): Promise<Hotel> => {
  const cityId = hotel.cityId ?? 1
  const raw = await fetchJson<unknown>(`${BASE_URL}/City/${cityId}/hotels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(hotel),
  })
  const data = (raw as Record<string, unknown>)?.data ?? raw
  return normalizeHotel((data ?? {}) as Record<string, unknown>)
}

export const updateHotel = async (
  id: number,
  hotel: Partial<Omit<Hotel, "id">>
): Promise<Hotel> => {
  const raw = await fetchJson<unknown>(`${BASE_URL}/Hotel/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(hotel),
  })
  const data = (raw as Record<string, unknown>)?.data ?? raw
  return normalizeHotel((data ?? {}) as Record<string, unknown>)
}

export const deleteHotel = async (id: number): Promise<void> => {
  await fetchJson<unknown>(`${BASE_URL}/Hotel/${id}`, { method: "DELETE" })
}

// ─── Single hotel ─────────────────────────────────────────────────────────────

export const getHotelById = (id: number): Promise<Hotel> =>
  fetchJson(`${BASE_URL}/Hotel/${id}`)

export const getHotelRooms = (hotelId: number): Promise<Room[]> =>
  fetchJson(`${BASE_URL}/Hotel/${hotelId}/rooms`)

// ─── Amenities ────────────────────────────────────────────────────────────────

export const getHotelAmenities = (hotelId: number): Promise<Amenity[]> =>
  fetchJson(`${BASE_URL}/Hotel/${hotelId}/amenities`)

export const addHotelAmenity = (
  hotelId: number,
  amenity: Amenity
): Promise<void> =>
  fetchJson(`${BASE_URL}/Hotel/${hotelId}/amenities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(amenity),
  })

export const removeHotelAmenity = (
  hotelId: number,
  amenityId: number
): Promise<void> =>
  fetchJson(`${BASE_URL}/Hotel/${hotelId}/amenities/${amenityId}`, {
    method: "DELETE",
  })

// ─── Images ───────────────────────────────────────────────────────────────────

export const getHotelImages = (hotelId: number): Promise<Image[]> =>
  fetchJson(`${BASE_URL}/Hotel/${hotelId}/images`)

// ─── Room Classes ─────────────────────────────────────────────────────────────

export const getHotelRoomClasses = (hotelId: number): Promise<RoomClass[]> =>
  fetchJson(`${BASE_URL}/Hotel/${hotelId}/roomclasses`)
