import { RoomClass } from "@/types/hotel"

const BASE_URL = "http://localhost:5004/api"

const toNumber = (v: any): number => {
  const n = typeof v === "string" ? Number(v) : v
  return typeof n === "number" && !Number.isNaN(n) ? n : 0
}

export const getRoomClasses = async (): Promise<RoomClass[]> => {
  const token = localStorage.getItem("token")

  const response = await fetch(`${BASE_URL}/RoomClass`, {
    headers: {
      Accept: "application/json",
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
    },
  })
  if (!response.ok) throw new Error("Failed to fetch room classes")

  const payload = await response.json()

  // ✅ accepte plusieurs formats possibles
  const list =
    Array.isArray(payload) ? payload
    : Array.isArray(payload?.data) ? payload.data
    : Array.isArray(payload?.result) ? payload.result
    : Array.isArray(payload?.items) ? payload.items
    : Array.isArray(payload?.$values) ? payload.$values
    : []

  // ✅ mapping pour garantir hotelId, roomClassID etc.
  return list.map((x: any) => ({
    roomClassID: toNumber(x.roomClassID ?? x.roomClassId ?? x.RoomClassID ?? x.id),
    name: x.name ?? x.Name ?? "",
    roomType: x.roomType ?? x.RoomType ?? "",
    description: x.description ?? x.Description ?? "",
    hotelName: x.hotelName ?? x.HotelName ?? "",
    hotelId: toNumber(x.hotelId ?? x.hotelID ?? x.HotelId ?? x.HotelID),
  }))
}
