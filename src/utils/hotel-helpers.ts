// utils/hotel-helpers.ts
import { addHotel, deleteHotel } from "@/services/hotel-service"
import { getOwners } from "@/services/owner-service"
import { Hotel } from "@/types/hotel"

function normalizeName(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, " ")
}

export const handleAddHotelHelper = async (
  newHotel: Omit<Hotel, "id">,
  setHotels: React.Dispatch<React.SetStateAction<Hotel[]>>,
  setNewHotel: React.Dispatch<React.SetStateAction<Omit<Hotel, "id">>>,
  setIsAddDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  if (
    !newHotel.name.trim() ||
    newHotel.starRating < 1 ||
    newHotel.starRating > 5 ||
    !newHotel.phoneNumber?.trim() ||
    !newHotel.ownerName?.trim()
  ) {
    alert("Please fill in all fields correctly.")
    return
  }

  try {
    // Lookup OwnerId à partir du OwnerName
    const owners = await getOwners()
    const wanted = normalizeName(newHotel.ownerName)

    const match = owners.find((o) => {
      const fullName = normalizeName(`${o.firstName} ${o.lastName}`)
      return fullName === wanted
    })

    if (!match) {
      alert("Owner not found. Please type the exact owner full name.")
      return
    }

    const payload: Omit<Hotel, "id"> = {
      ...newHotel,
      ownerID: match.ownerID,
    }

    const createdHotel = await addHotel(payload)
    setHotels((prev) => [...prev, createdHotel])

    setNewHotel({
      name: "",
      starRating: 0,
      description: "",
      phoneNumber: "",
      ownerName: "",
      ownerID: 0,
    } as Omit<Hotel, "id">)

    setIsAddDialogOpen(false)
  } catch (err) {
    console.error("Add hotel error:", err)
    alert(err instanceof Error ? err.message : "Something went wrong while adding the hotel.")
  }
}

export const handleDeleteHotelHelper = async (
  id: number,
  setHotels: React.Dispatch<React.SetStateAction<Hotel[]>>,
): Promise<boolean> => {
  // Optimistic update
  let previous: Hotel[] = []
  setHotels((prev) => {
    previous = prev
    return prev.filter((h) => h.id !== id)
  })

  try {
    await deleteHotel(id)
    return true
  } catch (err) {
    // rollback
    console.error("Delete hotel error:", err)
    setHotels(previous)
    alert(err instanceof Error ? err.message : "Failed to delete hotel.")
    return false
  }
}
