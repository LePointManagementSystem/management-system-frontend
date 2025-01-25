import { useState } from 'react';
import DataTable from 'react-data-table-component';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoomManagement } from '@/components/room-management';

interface Room {
  id: number;
  number: string;
  type: string;
  capacity: number;
  price: number;
  status: 'available' | 'occupied' | 'maintenance';
}

interface Hotel {
  id: number;
  name: string;
  address: string;
  rooms: Room[];
  rating: number;
}

const HotelManagementPage = () => {
  const [hotels, setHotels] = useState<Hotel[]>([
    {
      id: 1,
      name: "Le Point Hotel",
      address: "123 Main St, City",
      rooms: [
        { id: 1, number: "101", type: "Standard", capacity: 2, price: 100, status: 'available' },
        { id: 2, number: "102", type: "Deluxe", capacity: 3, price: 150, status: 'occupied' },
      ],
      rating: 4.5,
    },
    {
      id: 2,
      name: "Rosa Rosa",
      address: "456 Oak Ave, Town",
      rooms: [
        { id: 3, number: "201", type: "Suite", capacity: 4, price: 200, status: 'available' },
        { id: 4, number: "202", type: "Standard", capacity: 2, price: 90, status: 'maintenance' },
      ],
      rating: 3.8,
    },
  ]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newHotel, setNewHotel] = useState<Omit<Hotel, 'id'>>({ name: '', address: '', rooms: [], rating: 0 });
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [isRoomManagementOpen, setIsRoomManagementOpen] = useState(false);

  const handleAddHotel = () => {
    setHotels([...hotels, { ...newHotel, id: hotels.length + 1 }]);
    setNewHotel({ name: '', address: '', rooms: [], rating: 0 });
    setIsAddDialogOpen(false);
  };

  const handleDeleteHotel = (id: number) => {
    setHotels(hotels.filter(hotel => hotel.id !== id));
  };

  const columns = [
    {
      name: 'Name',
      selector: (row: Hotel) => row.name,
      sortable: true,
    },
    {
      name: 'Address',
      selector: (row: Hotel) => row.address,
      sortable: true,
    },
    {
      name: 'Rooms',
      selector: (row: Hotel) => row.rooms.length.toString(),
      sortable: true,
    },
    {
      name: 'Rating',
      selector: (row: Hotel) => row.rating.toString(),
      sortable: true,
    },
    {
      name: 'Actions',
      cell: (row: Hotel) => (
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={() => setSelectedHotel(row)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleDeleteHotel(row.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedHotel(row);
              setIsRoomManagementOpen(true);
            }}
          >
            Manage Rooms
          </Button>
        </div>
      ),
    },
  ];

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
        pagination
        responsive
        highlightOnHover
        striped
        selectableRows
      />
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Hotel</DialogTitle>
            <DialogDescription>
              Enter the details of the new hotel. Click save when you're done.
            </DialogDescription>
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
              <Label htmlFor="address" className="text-right">
                Address
              </Label>
              <Input
                id="address"
                value={newHotel.address}
                onChange={(e) => setNewHotel({ ...newHotel, address: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rating" className="text-right">
                Rating
              </Label>
              <Input
                id="rating"
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={newHotel.rating}
                onChange={(e) => setNewHotel({ ...newHotel, rating: parseFloat(e.target.value) })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddHotel}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isRoomManagementOpen} onOpenChange={setIsRoomManagementOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedHotel?.name} - Room Management</DialogTitle>
          </DialogHeader>
          {selectedHotel && (
            <RoomManagement
              rooms={selectedHotel.rooms}
              onAddRoom={(newRoom) => {}}
              onUpdateRoom={(updatedRoom) => {}}
              onDeleteRoom={(roomId) => {}}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HotelManagementPage;
