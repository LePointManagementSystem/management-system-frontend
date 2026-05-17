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

// FIX: fonction manquante — permet de modifier le nom, le type et la description
// d'une catégorie existante. Le backend (PUT /api/RoomClass/{id}) existait déjà,
// mais aucun service frontend ne l'appelait.
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

// FIX: fonction manquante — supprime une catégorie de chambre.
// Le backend renvoie 409 si la catégorie contient encore des chambres ;
// dans ce cas l'erreur est propagée à l'UI qui affiche un message explicite.
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
