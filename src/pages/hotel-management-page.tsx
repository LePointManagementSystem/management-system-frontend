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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Hotel {
  id: number;
  name: string;
  starRating: number;
  description: string;
  phoneNumber: string;
  ownerID: number;
}

const HotelManagementPage = () => {
  const [hotels, setHotels] = useState<Hotel[]>([
    {
      id: 1,
      name: "Le Point Hotel",
      starRating: 4,
      description: "Modern hotel in the heart of the city.",
      phoneNumber: "+509 1234 5678",
      ownerID: 101,
    },
    {
      id: 2,
      name: "Rosa Rosa",
      starRating: 3,
      description: "Charming countryside escape.",
      phoneNumber: "+509 9876 5432",
      ownerID: 102,
    },
  ]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newHotel, setNewHotel] = useState<Omit<Hotel, 'id'>>({
    name: '',
    starRating: 0,
    description: '',
    phoneNumber: '',
    ownerID: 0,
  });

  const handleAddHotel = () => {
    const nextID = hotels.length > 0 ? Math.max(...hotels.map(h => h.id)) + 1 : 1;
    setHotels([...hotels, { ...newHotel, id: nextID }]);
    setNewHotel({ name: '', starRating: 0, description: '', phoneNumber: '', ownerID: 0 });
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
      />

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Add New Hotel</DialogTitle>
            <DialogDescription>
              Fill out the details below to register a new hotel.
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
              <Label htmlFor="starRating" className="text-right">
                Star Rating
              </Label>
              <Input
                id="starRating"
                type="number"
                min="0"
                max="5"
                value={newHotel.starRating}
                onChange={(e) => setNewHotel({ ...newHotel, starRating: parseInt(e.target.value) })}
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
                onChange={(e) => setNewHotel({ ...newHotel, ownerID: parseInt(e.target.value) })}
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleAddHotel}>Save Hotel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HotelManagementPage;
