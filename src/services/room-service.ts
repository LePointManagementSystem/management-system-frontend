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
  const res = await fetch(`http://localhost:5004/${roomClassId}/RoomClass/1/rooms`, {
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
