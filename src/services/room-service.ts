export const addRoom = async (
  roomClassId: number,
  data: { number: string; pricePerNight: number }
) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`http://localhost:5004/api/RoomClass/${roomClassId}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorBody = await res.text(); // get the actual message from the backend
    console.error("Room creation failed:", errorBody); // <-- This will help
    throw new Error(`Failed to add room: ${errorBody}`);
  }
};
