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
  console.log(roomClassId)
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

export const fetchAvailableRooms = async (roomClassId: number) => {
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

  return res.json();
};
