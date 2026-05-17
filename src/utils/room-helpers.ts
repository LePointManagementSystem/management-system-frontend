// BUG FIX: Removed duplicate `handleDeleteHotelHelper` export and its
// associated `deleteHotel` import.
//
// The original file exported `handleDeleteHotelHelper` which was also exported
// by `hotel-helpers.ts`. Having two different implementations of the same
// function with the same name across the codebase creates ambiguity: callers
// may accidentally import the wrong version, and the two implementations
// behaved differently (this one had no optimistic rollback; hotel-helpers.ts
// did). The canonical, correct implementation lives in `hotel-helpers.ts`.
//
// This file's responsibility is room management only.

import { addRoom } from "../services/room-service";
// BUG FIX: removed `import { deleteHotel } from "@/services/hotel-service"`
// — deleteHotel belongs in hotel-helpers.ts, not here.

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

// BUG FIX: `handleDeleteHotelHelper` removed from this file.
// Use `handleDeleteHotelHelper` from `@/utils/hotel-helpers` instead.
// That version includes proper optimistic rollback on failure.
