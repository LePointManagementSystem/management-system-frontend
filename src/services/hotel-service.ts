import type { Hotel, Room, Amenity, Image, RoomClass } from "@/types/hotel"

const BASE_URL = import.meta.env.VITE_API_BASE_URL

// ─── Auth helper ──────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ─── Generic fetch with auth ──────────────────────────────────────────────────

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...authHeaders(),
      ...options.headers,
    },
    ...options,
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
      (json as Record<string, string>)?.error ||
      raw ||
      `API error (${res.status})`
    throw new Error(msg)
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
    ownerID: Number(h.ownerID ?? h.ownerId ?? 0),
  }
}

export const getHotels = async (): Promise<Hotel[]> => {
  const raw = await fetchJson<unknown>(`${BASE_URL}/City/1/hotels`)
  const list = (raw as Record<string, unknown>)?.data ?? raw
  if (!Array.isArray(list)) throw new Error("Invalid hotels response format")
  return (list as Record<string, unknown>[])
    .map(normalizeHotel)
    .filter((h) => h.id > 0)
}

export const addHotel = async (hotel: Omit<Hotel, "id">): Promise<Hotel> => {
  const raw = await fetchJson<unknown>(`${BASE_URL}/City/1/hotels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(hotel),
  })
  const data = (raw as Record<string, unknown>)?.data ?? raw
  return normalizeHotel(data as Record<string, unknown>)
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

// ─── Rooms ────────────────────────────────────────────────────────────────────

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
