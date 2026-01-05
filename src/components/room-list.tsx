import React, { useEffect, useMemo, useState } from "react";
import DataTable, { TableColumn } from "react-data-table-component";
import { getRoomsByHotelId } from "@/services/room-service";
import { Room } from "@/types/hotel";

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
        setError(null);
        const data = await getRoomsByHotelId(hotelId);
        setRooms(data || []);
      } catch (err: any) {
        setError(err?.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [hotelId]);

  const columns: TableColumn<Room>[] = useMemo(
    () => [
      {
        name: "Room Number",
        selector: (row) => String(row.number ?? ""),
        sortable: true,
      },
      {
        name: "Class",
        selector: (row) => row.roomClassName || "N/A",
        sortable: true,
      },
      {
        name: "Adults",
        selector: (row) => Number(row.adultsCapacity ?? 0),
        sortable: true,
      },
      {
        name: "Children",
        selector: (row) => Number(row.childrenCapacity ?? 0),
        sortable: true,
      },
      {
        name: "Price",
        selector: (row) => Number(row.pricePerNight ?? 0),
        sortable: true,
        cell: (row) => `$${Number(row.pricePerNight ?? 0)}`,
      },
      {
        name: "Created",
        selector: (row) => row.createdAtUtc ? row.createdAtUtc : "",
        sortable: true,
        cell: (row) =>
          row.createdAtUtc ? new Date(row.createdAtUtc).toLocaleString() : "—",
      },
    ],
    []
  );

  if (loading) return <p>Loading rooms...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div className="mt-4">
      <DataTable
        columns={columns}
        data={rooms}
        pagination
        highlightOnHover
        striped
        dense
      />
    </div>
  );
};

export default RoomList;
