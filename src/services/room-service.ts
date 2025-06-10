export const addRoom = async (room: {
  hotelId: number;
  roomNumber: string;
  type: string;
  price: number;
}) => {
  const response = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(room),
  });

  if (!response.ok) throw new Error('Failed to add room');
  return await response.json();
};


