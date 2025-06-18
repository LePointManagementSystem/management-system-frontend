const API_BASE = 'http://localhost:5004/api';


export const addRoom = async (
   roomClassId: number,
  roomData: {
    number: string;
    adultsCapacity: number;
    childrenCapacity: number;
    pricePerNight: number;
  }
) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/RoomClass/${roomClassId}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(roomData),
  });

  if (!res.ok) {
    const errorBody = await res.text(); 
    console.error("Room creation failed:", errorBody); 
    throw new Error(`Failed to add room: ${errorBody}`);
  }
};

export const getRoomsByHotel = async (hotelId: number) => {
  const response = await fetch(`${API_BASE}/Room/hotel/${hotelId}`);
  if (!response.ok) throw new Error("Failed to fetch rooms");
  return await response.json();
};



type AvailableRoom = {
  roomId: number;
  roomClassName: string;
  number: string;
  adultsCapacity: number;
  childrenCapacity: number;
  pricePerNight: number;
  createdAtUtc: string;
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

