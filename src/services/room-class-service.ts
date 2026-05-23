import { RoomClass } from "@/types/hotel"

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const toNumber = (v: any): number => {
  const n = typeof v === "string" ? Number(v) : v
  return typeof n === "number" && !Number.isNaN(n) ? n : 0
}

function getAuthHeaders(): HeadersInit {
  const token = sessionStorage.getItem("token")
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Room Classes CRUD
// ─────────────────────────────────────────────────────────────────────────────

export const getRoomClasses = async (): Promise<RoomClass[]> => {
  const token = sessionStorage.getItem("token")

  const response = await fetch(`${BASE_URL}/RoomClass`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!response.ok) throw new Error("Failed to fetch room classes")

  const payload = await response.json()

  const list =
    Array.isArray(payload) ? payload
    : Array.isArray(payload?.data) ? payload.data
    : Array.isArray(payload?.result) ? payload.result
    : Array.isArray(payload?.items) ? payload.items
    : Array.isArray(payload?.$values) ? payload.$values
    : []

  return list.map((x: any) => ({
    roomClassID: toNumber(x.roomClassID ?? x.roomClassId ?? x.RoomClassID ?? x.id),
    name: x.name ?? x.Name ?? "",
    roomType: x.roomType ?? x.RoomType ?? "",
    description: x.description ?? x.Description ?? "",
    hotelName: x.hotelName ?? x.HotelName ?? "",
    hotelId: toNumber(x.hotelId ?? x.hotelID ?? x.HotelId ?? x.HotelID),
  }))
}

export interface CreateRoomClassPayload {
  name: string
  /** Entier correspondant à l'enum backend : Standard=0, Deluxe=1, Suite=2, BeachFront=3 */
  roomType: number
  description?: string
  hotelId: number
}

export const createRoomClass = async (
  payload: CreateRoomClassPayload
): Promise<{ roomClassID: number }> => {
  const response = await fetch(`${BASE_URL}/RoomClass`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(text || `Failed to create room class (${response.status})`)
  }

  const data = await response.json()
  const id = toNumber(
    data?.roomClassID ?? data?.roomClassId ?? data?.id ?? data?.data?.roomClassID ?? data?.data?.id
  )
  return { roomClassID: id }
}

export interface UpdateRoomClassPayload {
  name: string
  roomType: number
  description?: string
  hotelId: number
}

export const updateRoomClass = async (
  roomClassId: number,
  payload: UpdateRoomClassPayload
): Promise<void> => {
  const response = await fetch(`${BASE_URL}/RoomClass/${roomClassId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(text || `Failed to update room class (${response.status})`)
  }
}

export const deleteRoomClass = async (roomClassId: number): Promise<void> => {
  const response = await fetch(`${BASE_URL}/RoomClass/${roomClassId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(text || `Failed to delete room class (${response.status})`)
  }
}

export const addAmenityToRoomClass = async (
  roomClassId: number,
  amenity: string
): Promise<void> => {
  const token = sessionStorage.getItem("token")

  const response = await fetch(`${BASE_URL}/RoomClass/${roomClassId}/addamenity`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ amenity }),
  })

  if (!response.ok) {
    console.warn(`Failed to add amenity "${amenity}" to class ${roomClassId}: ${response.status}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pricing — grille de tarification par catégorie
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Correspondance avec l'enum backend BookingDurationType :
 *   Hours2=0, Hours4=1, Overnight=2, Hours1=3, Hours3=4,
 *   Hours5=5, Hours6=6, Hours7=7, Hours8=8, Stay=9
 */
export const DURATION_TYPE_OPTIONS = [
  { value: 3,  label: "1 heure" },
  { value: 0,  label: "2 heures" },
  { value: 4,  label: "3 heures" },
  { value: 1,  label: "4 heures" },
  { value: 5,  label: "5 heures" },
  { value: 6,  label: "6 heures" },
  { value: 7,  label: "7 heures" },
  { value: 8,  label: "8 heures" },
  { value: 2,  label: "Nuit (Overnight)" },
  { value: 9,  label: "Séjour (Stay 24h)" },
] as const

/**
 * Correspondance avec l'enum backend CurrencyCode :
 *   HTG=1, USD=2
 */
export const CURRENCY_OPTIONS = [
  { value: 1, label: "HTG" },
  { value: 2, label: "USD" },
] as const

export interface RoomClassPricingDto {
  pricingId: number
  roomClassID: number
  durationType: string   // ex: "Hours2", "Overnight", "Stay"
  price: number
  currency: string       // "HTG" ou "USD"
}

export interface RoomClassPricingRequest {
  durationType: number   // valeur entière de l'enum BookingDurationType
  price: number
  currency: number       // valeur entière de l'enum CurrencyCode (HTG=1, USD=2)
}

/**
 * Récupère la grille de tarification d'une catégorie.
 * Retourne un tableau vide si aucun prix n'est encore configuré.
 */
export const getRoomClassPricings = async (
  roomClassId: number
): Promise<RoomClassPricingDto[]> => {
  const response = await fetch(`${BASE_URL}/RoomClass/${roomClassId}/pricing`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(text || `Failed to fetch pricing (${response.status})`)
  }

  const payload = await response.json()

  const list =
    Array.isArray(payload) ? payload
    : Array.isArray(payload?.data) ? payload.data
    : Array.isArray(payload?.result) ? payload.result
    : []

  return list.map((x: any) => ({
    pricingId:   toNumber(x.pricingId   ?? x.PricingId),
    roomClassID: toNumber(x.roomClassID ?? x.RoomClassID),
    durationType: x.durationType ?? x.DurationType ?? "",
    price:       toNumber(x.price ?? x.Price),
    currency:    x.currency ?? x.Currency ?? "HTG",
  }))
}

/**
 * Remplace toute la grille de prix d'une catégorie (PUT atomique).
 * Envoyer la liste complète des durées souhaitées —
 * les durées absentes seront supprimées.
 */
export const setRoomClassPricings = async (
  roomClassId: number,
  pricings: RoomClassPricingRequest[]
): Promise<RoomClassPricingDto[]> => {
  const response = await fetch(`${BASE_URL}/RoomClass/${roomClassId}/pricing`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(pricings),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(text || `Failed to save pricing (${response.status})`)
  }

  const payload = await response.json()

  const list =
    Array.isArray(payload) ? payload
    : Array.isArray(payload?.data) ? payload.data
    : Array.isArray(payload?.result) ? payload.result
    : []

  return list.map((x: any) => ({
    pricingId:   toNumber(x.pricingId   ?? x.PricingId),
    roomClassID: toNumber(x.roomClassID ?? x.RoomClassID),
    durationType: x.durationType ?? x.DurationType ?? "",
    price:       toNumber(x.price ?? x.Price),
    currency:    x.currency ?? x.Currency ?? "HTG",
  }))
}