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
    !newHotel.phoneNumber ||
    newHotel.ownerID <= 0
  ) {
    alert("Please fill in all fields correctly.");
    return;
  }

  try {
    const createdHotel = await addHotel(newHotel);
    setHotels((prev) => [...prev, createdHotel]);
    setNewHotel({ name: "", starRating: 0, description: "", phoneNumber: "", ownerID: 0 });
    setIsAddDialogOpen(false);
  } catch (err) {
    console.error("Add hotel error:", err);
    alert("Something went wrong while adding the hotel.");
  }
};

export const handleDeleteHotelHelper = async (
  id: number,
  setHotels: React.Dispatch<React.SetStateAction<Hotel[]>>,
  hotels: Hotel[]
) => {
  await deleteHotel(id);
  setHotels(hotels.filter((hotel) => hotel.id !== id));
};
