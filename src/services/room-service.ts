import { AvailableRoom, Room } from "@/types/hotel";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getAuthHeader(): string {
  const token = localStorage.getItem("token");
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
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
    },
    body: JSON.stringify(roomData),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to add room: ${errorBody}`);
  }
};

export const getRoomsByHotelId = async (hotelId: number): Promise<Room[]> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/Hotel/${hotelId}/rooms`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch rooms: ${errorText}`);
  }

  const result = await response.json();

  const root = result?.data ?? result;
  const roomsCandidate = 
    root?.result ??
    root?.data ??
    root?.rooms ??
    root;

  if (!Array.isArray(roomsCandidate)) {
    console.error("Unexpected rooms response:", result);
    throw new Error('Invalid response format: expected object with `data` as array');
  }

  return roomsCandidate as Room[];
};



export const fetchAvailableRooms = async (
  roomClassId: number
): Promise<AvailableRoom[]> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("User is not authenticated.");

  const res = await fetch(
    `${BASE_URL}/Room/available-without-bookings?roomClassId=${roomClassId}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`, // ✅ ICI
      },
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to fetch available rooms: ${error}`);
  }

  const result = await res.json();

  // adapte selon ton API: parfois c'est "succeeded", parfois "isSuccess"
  if (result.succeeded === false) {
    throw new Error(`API error: ${result.message}`);
  }

  return result.data;
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
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
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
    method: 'DELETE',
    headers: {
      'Authorization': getAuthHeader(),
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to delete room: ${error}`);
  }
};

