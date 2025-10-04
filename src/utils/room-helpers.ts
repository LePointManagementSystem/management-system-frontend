// src/utils/roomHelpers.ts
import { addRoom } from "../services/room-service";

interface NewRoomData {
  roomNumber: string;
  roomClassId: string;
  price: number;
  adultsCapacity: number;
  childrenCapacity: number;
}

export const handleAddRoomToHotelHelper = async (
  newRoom: NewRoomData,
  selectedHotelId: number | null,
  expandedRows: Set<number>,
  fetchRoomsForHotel: (hotelId: number) => Promise<void>,
  setNewRoom: React.Dispatch<React.SetStateAction<NewRoomData>>,
  setIsRoomDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  if (
    !newRoom.roomNumber.trim() ||
    newRoom.roomClassId === '' ||
    newRoom.price <= 0 ||
    newRoom.adultsCapacity < 0 ||
    newRoom.childrenCapacity < 0 ||
    !selectedHotelId
  ) {
    alert("Please fill all room fields correctly.");
    return;
  }

  try {
    await addRoom({
      number: newRoom.roomNumber,
      adultsCapacity: newRoom.adultsCapacity,
      childrenCapacity: newRoom.childrenCapacity,
      pricePerNight: newRoom.price,
      hotelId: selectedHotelId,
      roomClassId: Number(newRoom.roomClassId),
    });

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
