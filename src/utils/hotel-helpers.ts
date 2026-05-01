// utils/hotel-helpers.ts
import type { Dispatch, SetStateAction } from "react"
import { addHotel, deleteHotel } from "@/services/hotel-service"
import type { Hotel } from "@/types/hotel"

/**
 * Add a new hotel and update local state.
 * Throws on failure — let the caller display the error inline.
 */
export async function handleAddHotelHelper(
  payload: Omit<Hotel, "id">,
  setHotels: Dispatch<SetStateAction<Hotel[]>>
): Promise<Hotel> {
  const created = await addHotel(payload)
  setHotels((prev) => [...prev, created])
  return created
}

/**
 * Optimistically delete a hotel and roll back if the API call fails.
 * Throws on failure — let the caller display the error inline.
 */
export async function handleDeleteHotelHelper(
  id: number,
  setHotels: Dispatch<SetStateAction<Hotel[]>>
): Promise<void> {
  let snapshot: Hotel[] = []

  setHotels((prev) => {
    snapshot = prev
    return prev.filter((h) => h.id !== id)
  })

  try {
    await deleteHotel(id)
  } catch (err) {
    setHotels(snapshot)
    throw err
  }
}
