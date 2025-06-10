export const addRoom = async (
  roomClassId: number,
  room: {
    hotelId: number;
    roomNumber: string;
    type?: string;
    price: number;
  }
) => {
  const response = await fetch(
    `http://localhost:5004/api/RoomClass/${roomClassId}/rooms`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(room),
    }
  );

  if (!response.ok) throw new Error("Failed to add room");
  return await response.json();
};
