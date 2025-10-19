// utils/hotel-helpers.ts
import { addHotel, deleteHotel } from "@/services/hotel-service";
import { Hotel } from "@/types/hotel";

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
    !("ownerName" in newHotel) ||
    !newHotel.ownerName?.trim()
  ) {
    alert("Please fill in all fields correctly.");
    return;
  }

  try {
    const createdHotel = await addHotel(newHotel);
    setHotels((prev) => [...prev, createdHotel]);
    setNewHotel({ name: "", starRating: 0, description: "", phoneNumber: "", ownerName: "" } as Omit<Hotel, "id">);
    setIsAddDialogOpen(false);
  } catch (err) {
    console.error("Add hotel error:", err);
    alert("Something went wrong while adding the hotel.");
  }
};

export const handleDeleteHotelHelper = async (
  id: number,
  setHotels: React.Dispatch<React.SetStateAction<Hotel[]>>,
  hotels?: Hotel[]
) => {
  try {
    await deleteHotel(id);
    setHotels((prev) => prev.filter((hotel) => hotel.id !== id ));
  }
  catch (err) {
    console.error("Delete hotel error:", err);
    alert("Failed to delete the hotel.");
  }

};
