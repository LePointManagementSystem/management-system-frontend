import React, { useEffect, useState } from 'react';
import { getRoomsByHotelId } from '@/services/room-service';
import { Room } from '@/types/hotel';

type RoomListProps = {
  hotelId: number;
};

const RoomList: React.FC<RoomListProps> = ({ hotelId }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const data = await getRoomsByHotelId(hotelId);
        setRooms(data);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [hotelId]);

  if (loading) return <p>Loading rooms...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Rooms for Hotel #{hotelId}</h2>
      <ul className="space-y-4">
        {rooms.map((room) => (
          <li key={room.roomId} className="p-4 border rounded shadow-sm">
            <p><strong>Room Number:</strong> {room.number}</p>
            <p><strong>Class:</strong> {room.roomClassName || 'N/A'}</p>
            <p><strong>Adults:</strong> {room.adultsCapacity}</p>
            <p><strong>Children:</strong> {room.childrenCapacity}</p>
            <p><strong>Price:</strong> ${room.pricePerNight}</p>
            <p className="text-sm text-gray-500"><strong>Created:</strong> {new Date(room.createdAtUtc).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RoomList;
