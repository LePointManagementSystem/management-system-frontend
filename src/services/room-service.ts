import { AvailableRoom, Room } from "@/types/hotel";

const API_BASE = 'http://localhost:5004/api';

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
  const res = await fetch(`${API_BASE}/RoomClass/${roomClassId}/rooms`, {
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
  const response = await fetch(`${API_BASE}/Hotel/${hotelId}/rooms`, {
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

  if (!result || !Array.isArray(result.data.result)) {
    throw new Error('Invalid response format: expected object with `data` as array');
  }

  return result.data.result;
};



export const fetchAvailableRooms = async (
  roomClassId: number
): Promise<AvailableRoom[]> => {
  const res = await fetch(
    `${API_BASE}/Room/available-without-bookings?roomClassId=${roomClassId}`,
    {
      headers: {
        'Accept': 'application/json',
      },
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to fetch available rooms: ${error}`);
  }

  const result = await res.json();

  if (!result.succeeded) {
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
  

  const res = await fetch(`${API_BASE}/Room/${roomId}`, {
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
  const res = await fetch(`${API_BASE}/Room/${roomId}`, {
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

