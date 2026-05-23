// room-helpers.ts
// Responsabilité : gestion des chambres (Room) uniquement.
// Le prix (PricePerNight) est retiré — il est géré par la grille RoomClassPricing
// sur la RoomClass via POST /api/RoomClass/{roomClassId}/pricing.

import { addRoom } from "../services/room-service";

export const handleAddRoomToHotelHelper = async (
  newRoom: {
    roomNumber: string;
    roomClassId: string;
    adultsCapacity: number;
    childrenCapacity: number;
    // REMOVED: price — géré sur la RoomClass via la grille RoomClassPricing
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
    newRoom.adultsCapacity < 1 ||
    newRoom.childrenCapacity < 0 ||
    !selectedHotelId
  ) {
    alert("Please fill all room fields correctly.");
    return;
  }

  try {
    await addRoom(Number(newRoom.roomClassId), {
      number: newRoom.roomNumber,
      adultsCapacity: newRoom.adultsCapacity,
      childrenCapacity: newRoom.childrenCapacity,
      // REMOVED: pricePerNight
    });

    alert("Room added successfully!");

    if (expandedRows.has(selectedHotelId)) {
      await fetchRoomsForHotel(selectedHotelId);
    }
    setNewRoom({
      roomNumber: "",
      roomClassId: "",
      adultsCapacity: 1,
      childrenCapacity: 0,
    });
    setIsRoomDialogOpen(false);
  } catch (err) {
    console.error("Add room error:", err);
    alert("Something went wrong while adding the room.");
  }
};

// NOTE: `handleDeleteHotelHelper` est dans `hotel-helpers.ts`, pas ici.
// Use `handleDeleteHotelHelper` from `@/utils/hotel-helpers` for hotel deletion.
