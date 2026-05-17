import { AvailableRoom, Room } from "@/types/hotel";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// BUG FIX #8: Changed localStorage → sessionStorage.
// The login page writes the token to sessionStorage; all reads must match.
function getAuthHeader(): string {
  const token = sessionStorage.getItem("token");
  if (!token) throw new Error("User is not authenticated. Token not found.");
  return `Bearer ${token}`;
}

export const addRoom = async (
  roomClassId: number,
  roomData: {
    number: string;
    adultsCapacity: number;
    childrenCapacity: number;
    pricePerNight: number;
  }
) => {
  const res = await fetch(`${BASE_URL}/RoomClass/${roomClassId}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(roomData),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to add room: ${errorBody}`);
  }
};

export const getRoomsByHotelId = async (hotelId: number): Promise<Room[]> => {
  const token = sessionStorage.getItem("token"); // BUG FIX #8
  const response = await fetch(`${BASE_URL}/Hotel/${hotelId}/rooms`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errJson = JSON.parse(errorText);
      throw new Error(errJson?.message || errJson?.error || errorText);
    } catch {
      throw new Error(`Failed to fetch rooms: ${errorText}`);
    }
  }

  const result = await response.json();

  if (Array.isArray(result)) {
    return result as Room[];
  }

  const data = result?.data ?? result?.Data;

  if (!Array.isArray(data)) {
    if (data === null || data === undefined) return [];
    throw new Error("Invalid response format: expected data to be an array");
  }

  return data as Room[];
};

// BUG FIX #4 (frontend): The backend now returns 200 + empty array instead of 404.
// As an extra defensive layer we also treat a 404 response as an empty array here,
// so that an older backend version doesn't crash the booking flow.
export const fetchAvailableRooms = async (
  roomClassId: number
): Promise<AvailableRoom[]> => {
  const token = sessionStorage.getItem("token"); // BUG FIX #8
  if (!token) throw new Error("User is not authenticated.");

  const res = await fetch(
    `${BASE_URL}/Room/available-without-bookings?roomClassId=${roomClassId}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // BUG FIX #4 (frontend): Treat 404 as "no rooms available" rather than an error.
  if (res.status === 404) {
    return [];
  }

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to fetch available rooms: ${error}`);
  }

  const result = await res.json();

  if (result.succeeded === false) {
    // Backend signalled a business-level failure; treat as empty rather than crashing.
    return [];
  }

  const rooms = result?.data ?? result?.Data ?? result;
  if (!Array.isArray(rooms)) {
    return [];
  }
  return rooms;
};

export const updateRoom = async (
  roomId: number,
  updatedRoomData: {
    number?: string;
    adultsCapacity?: number;
    childrenCapacity?: number;
    pricePerNight?: number;
  }
) => {
  const res = await fetch(`${BASE_URL}/Room/${roomId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(updatedRoomData),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to update room: ${error}`);
  }
};

export const deleteRoom = async (roomId: number) => {
  const res = await fetch(`${BASE_URL}/Room/${roomId}`, {
    method: "DELETE",
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to delete room: ${error}`);
  }
};
