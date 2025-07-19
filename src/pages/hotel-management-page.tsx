import { useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';
import { Plus, Edit, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { addHotel, getHotels, deleteHotel } from '@/services/hotel-service';
import { Hotel, Room, RoomClass } from '@/types/hotel';
import { addRoom } from '@/services/room-service';
import { getRoomClasses } from '@/services/room-class-service';

const HotelManagementPage = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedHotelId, setSelectedHotelId] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [roomsData, setRoomsData] = useState<Record<number, Room[]>>({})
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [roomClasses, setRoomClasses] = useState<RoomClass[]>([]);

  const [newHotel, setNewHotel] = useState<Omit<Hotel, 'id'>>({
    name: '',
    starRating: 0,
    description: '',
    phoneNumber: '',
    ownerID: 0,
  });

  const [newRoom, setNewRoom] = useState<{
    roomNumber: string;
    roomClassId: number | '';
    price: number;
    adultsCapacity: number;
    childrenCapacity: number;
  }>({
    roomNumber: '',
    roomClassId: '',
    price: 0,
    adultsCapacity: 0,
    childrenCapacity: 0,
  });

  type RoomField =
    | {
      label: string;
      id: 'roomNumber' | 'adultsCapacity' | 'childrenCapacity' | 'price';
      type: 'text' | 'number';
      value: string | number;
      onChange: (val: string | number) => void;
    }
    | {
      label: string;
      id: 'roomClassId';
      type: 'select';
      value: number | '';
      onChange: (val: number | '') => void;
    };

  const roomFields: RoomField[] = [
    {
      label: 'Room Number',
      id: 'roomNumber',
      type: 'text',
      value: newRoom.roomNumber,
      onChange: (val) => setNewRoom({ ...newRoom, roomNumber: val as string }),
    },
    {
      label: 'Room Class',
      id: 'roomClassId',
      type: 'select',
      value: newRoom.roomClassId,
      onChange: (val) => setNewRoom({ ...newRoom, roomClassId: val }),
    },
    {
      label: 'Price',
      id: 'price',
      type: 'number',
      value: newRoom.price,
      onChange: (val) => setNewRoom({ ...newRoom, price: val as number }),
    },
    {
      label: 'Adults Capacity',
      id: 'adultsCapacity',
      type: 'number',
      value: newRoom.adultsCapacity,
      onChange: (val) => setNewRoom({ ...newRoom, adultsCapacity: val as number }),
    },
    {
      label: 'Children Capacity',
      id: 'childrenCapacity',
      type: 'number',
      value: newRoom.childrenCapacity,
      onChange: (val) => setNewRoom({ ...newRoom, childrenCapacity: val as number }),
    },
  ];

  const handleAddHotel = async () => {
    if (
      !newHotel.name.trim() ||
      newHotel.starRating < 1 ||
      newHotel.starRating > 5 ||
      !newHotel.phoneNumber ||
      newHotel.ownerID <= 0
    ) {
      alert('Please fill in all fields correctly.');
      return;
    }

    try {
      const createdHotel = await addHotel(newHotel);
      setHotels((prev) => [...prev, createdHotel]);
      setNewHotel({ name: '', starRating: 0, description: '', phoneNumber: '', ownerID: 0 });
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error('Add hotel error:', err);
      alert('Something went wrong while adding the hotel.');
    }
  };

  const handleAddRoom = (hotelId: number) => {
    setSelectedHotelId(hotelId);
    setIsRoomDialogOpen(true);
  };

  const handleAddRoomToHotel = async () => {
    if (
      !newRoom.roomNumber.trim() ||
      newRoom.roomClassId === '' ||
      newRoom.price <= 0 ||
      newRoom.adultsCapacity < 0 ||
      newRoom.childrenCapacity < 0 ||
      !selectedHotelId
    ) {
      alert('Please fill all room fields correctly.');
      return;
    }

    try {
      await addRoom(
        Number(newRoom.roomClassId),
        {
          number: newRoom.roomNumber,
          adultsCapacity: newRoom.adultsCapacity,
          childrenCapacity: newRoom.childrenCapacity,
          pricePerNight: newRoom.price,
        }
      );

      alert('Room added successfully!');
      setNewRoom({
        roomNumber: '',
        roomClassId: '',
        price: 0,
        adultsCapacity: 0,
        childrenCapacity: 0,
      });
      setIsRoomDialogOpen(false);
    } catch (err) {
      console.error('Add room error:', err);
      alert('Something went wrong while adding the room.');
    }
  };

  const handleDeleteHotel = async (id: number) => {
    await deleteHotel(id);
    setHotels(hotels.filter((hotel) => hotel.id !== id));
  };

  const handleToggleExpand = async (hotelId: number) => {
    const newExpandedRows = new Set(expandedRows)

    if (expandedRows.has(hotelId)) {
      newExpandedRows.delete(hotelId)
    } else {
      newExpandedRows.add(hotelId)
      // Fetch rooms if not already loaded
      if (!roomsData[hotelId]) {
        await fetchRoomsForHotel(hotelId)
      }
    }

    setExpandedRows(newExpandedRows)
  }

  const RoomsExpandedComponent = ({ data }: { data: Hotel }) => {
    const rooms = roomsData[data.id] || []

    if (rooms.length === 0) {
      return (
        <div className="p-4 bg-gray-50">
          <p className="text-gray-500 text-center">No rooms found for this hotel.</p>
        </div>
      )
    }

    return (
      <div className="p-4 bg-gray-50">
        <h4 className="font-semibold mb-3">Rooms in {data.name}</h4>
        <div className="bg-white rounded-lg border">
          <div className="grid grid-cols-6 gap-4 p-3 bg-gray-100 font-medium text-sm border-b">
            <div>Room Number</div>
            <div>Class</div>
            <div>Price/Night</div>
            <div>Adults</div>
            <div>Children</div>
            <div>Created</div>
          </div>
          {rooms.map((room, index) => (
            <div
              key={room.roomId}
              className={`grid grid-cols-6 gap-4 p-3 text-sm ${
                index !== rooms.length - 1 ? "border-b" : ""
              } hover:bg-gray-50`}
            >
              <div className="font-medium">{room.number}</div>
              <div>
                <Badge variant="outline" className="text-xs">
                  {room.roomClassName}
                </Badge>
              </div>
              <div className="font-medium">${room.pricePerNight}</div>
              <div>{room.adultsCapacity}</div>
              <div>{room.childrenCapacity}</div>
              <div className="text-gray-500">{formatDate(room.createdAtUtc)}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const columns = [
    {
      name: 'Name',
      selector: (row: Hotel) => row.name,
      sortable: true,
    },
    {
      name: 'Star Rating',
      selector: (row: Hotel) => row.starRating.toString(),
      sortable: true,
    },
    {
      name: 'Description',
      selector: (row: Hotel) => row.description,
      wrap: true,
    },
    {
      name: 'Phone',
      selector: (row: Hotel) => row.phoneNumber,
    },
    {
      name: 'Owner ID',
      selector: (row: Hotel) => row.ownerID.toString(),
    },
    {
      name: 'Actions',
      cell: (row: Hotel) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleAddRoom(row.id)}
            title="Add Room"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleDeleteHotel(row.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const data = await getHotels();
        setHotels(data || []);
      } catch (err) {
        console.error('Error fetching hotels:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, []);

  useEffect(() => {
    const fetchRoomClasses = async () => {
      try {
        const roomClasses = await getRoomClasses();
        setRoomClasses(roomClasses);
      } catch (err) {
        console.error('Failed to fetch room classes:', err);
      }
    };

    fetchRoomClasses();
  }, []);

  const handleRoomDialogClose = (open: boolean) => {
    setIsRoomDialogOpen(open);
    if (!open) {
      setSelectedHotelId(null);
      setNewRoom({
        roomNumber: '',
        roomClassId: '',
        price: 0,
        adultsCapacity: 0,
        childrenCapacity: 0,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Hotel Management</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Hotel
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={hotels}
        progressPending={loading}
        pagination
        responsive
        highlightOnHover
        striped
        expandableRows
        expandableRowsComponent={RoomsExpandedComponent}
        expandableRowExpanded={(row) => expandedRows.has(row.id)}
        onRowExpandToggled={(expanded, row) => handleToggleExpand(row.id)}
      />

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Add New Hotel</DialogTitle>
            <DialogDescription>Fill out the details below to register a new hotel.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newHotel.name}
                onChange={(e) => setNewHotel({ ...newHotel, name: e.target.value })}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="starRating" className="text-right">
                Star Rating
              </Label>
              <Input
                id="starRating"
                type="number"
                min="1"
                max="5"
                value={newHotel.starRating}
                onChange={(e) => setNewHotel({ ...newHotel, starRating: parseInt(e.target.value) || 0 })}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={newHotel.description}
                onChange={(e) => setNewHotel({ ...newHotel, description: e.target.value })}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phoneNumber" className="text-right">
                Phone
              </Label>
              <Input
                id="phoneNumber"
                value={newHotel.phoneNumber}
                onChange={(e) => setNewHotel({ ...newHotel, phoneNumber: e.target.value })}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ownerID" className="text-right">
                Owner ID
              </Label>
              <Input
                id="ownerID"
                type="number"
                value={newHotel.ownerID}
                onChange={(e) => setNewHotel({ ...newHotel, ownerID: parseInt(e.target.value) || 0 })}
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleAddHotel}>Save Hotel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoomDialogOpen} onOpenChange={handleRoomDialogClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Room</DialogTitle>
            <DialogDescription>Add a room to hotel ID #{selectedHotelId}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {roomFields.map((field) => (
              <div key={field.id} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={field.id} className="text-right">
                  {field.label}
                </Label>

                {field.type === 'select' ? (
                  <select
                    id={field.id}
                    value={field.value}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="col-span-3 border rounded px-3 py-2"
                  >
                    <option value="">Select room class</option>
                    {Array.isArray(roomClasses) &&
                      roomClasses.map((cls) => (
                        <option key={cls.roomClassID} value={cls.roomClassID}>
                          {cls.name}
                        </option>
                      ))}
                  </select>
                ) : (
                  <Input
                    id={field.id}
                    type={field.type}
                    value={field.value}
                    onChange={(e) => {
                      if (field.type === 'number') {
                        field.onChange(parseFloat(e.target.value) || 0);
                      } else {
                        field.onChange(e.target.value);
                      }
                    }}
                    className="col-span-3"
                  />
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button onClick={handleAddRoomToHotel}>Save Room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HotelManagementPage;
