import React, { useEffect, useState } from 'react';
import DataTable from 'react-data-table-component';
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

  const columns = [
    {
      name: 'Room Number',
      selector: (row: Room) => row.number,
      sortable: true,
    },
    {
      name: 'Class',
      selector: (row: Room) => row.roomClassName || 'N/A',
      sortable: true,
    },
    {
      name: 'Adults',
      selector: (row: Room) => row.adultsCapacity,
    },
    {
      name: 'Children',
      selector: (row: Room) => row.childrenCapacity,
    },
    {
      name: 'Price',
      selector: (row: Room) => `$${row.pricePerNight}`,
      sortable: true,
    },
    {
      name: 'Created',
      selector: (row: Room) =>
        new Date(row.createdAtUtc).toLocaleString(),
      sortable: true,
    },
  ];

  if (loading) return <p>Loading rooms...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div className="mt-4">
      {/* <h2 className="text-xl font-semibold mb-4">Rooms for Hotel #{hotelId}</h2> */}
      <DataTable
        columns={columns}
        data={rooms}
        pagination
        highlightOnHover
        striped
        dense
        defaultSortFieldId={1}
      />
    </div>
  );
};

export default RoomList;
