// roomHelpers.ts
import { Hotel } from "@/types/hotel";
import { addRoom } from "../services/room-service";
import { deleteHotel } from "@/services/hotel-service";

export const handleAddRoomToHotelHelper = async (
  newRoom: {
    roomNumber: string;
    roomClassId: string;
    price: number;
    adultsCapacity: number;
    childrenCapacity: number;
  },
  selectedHotelId: number | null,
  expandedRows: Set<number>,
  fetchRoomsForHotel: (hotelId: number) => Promise<void>,
  setNewRoom: React.Dispatch<React.SetStateAction<any>>,
  setIsRoomDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  if (
    !newRoom.roomNumber.trim() ||
    newRoom.roomClassId === "" ||
    newRoom.price <= 0 ||
    newRoom.adultsCapacity < 0 ||
    newRoom.childrenCapacity < 0 ||
    !selectedHotelId
  ) {
    alert("Please fill all room fields correctly.");
    return;
  }

  try {
    await addRoom(
      Number(newRoom.roomClassId),
      {
        number: newRoom.roomNumber,
        adultsCapacity: newRoom.adultsCapacity,
        childrenCapacity: newRoom.childrenCapacity,
        pricePerNight: newRoom.price,
      }
    );

    alert("Room added successfully!");

    if (expandedRows.has(selectedHotelId)) {
      await fetchRoomsForHotel(selectedHotelId);
    }

    setNewRoom({
      roomNumber: "",
      roomClassId: "",
      price: 0,
      adultsCapacity: 0,
      childrenCapacity: 0,
    });
    setIsRoomDialogOpen(false);
  } catch (err) {
    console.error("Add room error:", err);
    alert("Something went wrong while adding the room.");
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