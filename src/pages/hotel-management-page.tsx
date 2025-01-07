import { useState } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RoomManagement } from '@/components/room-management'


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
      rating: 4.5
    },
    {
      id: 2,
      name: "Rosa Rosa",
      address: "456 Oak Ave, Town",
      rooms: [
        { id: 3, number: "201", type: "Suite", capacity: 4, price: 200, status: 'available' },
        { id: 4, number: "202", type: "Standard", capacity: 2, price: 90, status: 'maintenance' },
      ],
      rating: 3.8
    },
  ])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentHotel, setCurrentHotel] = useState<Hotel | null>(null)
  const [newHotel, setNewHotel] = useState<Omit<Hotel, 'id'>>({ name: '', address: '', rooms: [], rating: 0 })
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [isRoomManagementOpen, setIsRoomManagementOpen] = useState(false);

  const handleAddHotel = () => {
    setHotels([...hotels, { ...newHotel, id: hotels.length + 1 }])
    setNewHotel({ name: '', address: '', rooms: [], rating: 0 })
    setIsAddDialogOpen(false)
  }

  const handleEditHotel = () => {
    if (currentHotel) {
      setHotels(hotels.map(hotel => hotel.id === currentHotel.id ? currentHotel : hotel))
      setIsEditDialogOpen(false)
    }
  }

  const handleDeleteHotel = (id: number) => {
    setHotels(hotels.filter(hotel => hotel.id !== id))
  }

  const handleAddRoom = (hotelId: number, newRoom: Omit<Room, 'id'>) => {
    setHotels(hotels.map(hotel => {
      if (hotel.id === hotelId) {
        return {
          ...hotel,
          rooms: [...hotel.rooms, { ...newRoom, id: Math.max(0, ...hotel.rooms.map(r => r.id)) + 1 }]
        };
      }
      return hotel;
    }));
  };

  const handleUpdateRoom = (hotelId: number, updatedRoom: Room) => {
    setHotels(hotels.map(hotel => {
      if (hotel.id === hotelId) {
        return {
          ...hotel,
          rooms: hotel.rooms.map(room => room.id === updatedRoom.id ? updatedRoom : room)
        };
      }
      return hotel;
    }));
  };

  const handleDeleteRoom = (hotelId: number, roomId: number) => {
    setHotels(hotels.map(hotel => {
      if (hotel.id === hotelId) {
        return {
          ...hotel,
          rooms: hotel.rooms.filter(room => room.id !== roomId)
        };
      }
      return hotel;
    }));
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Hotel Management</CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Hotel</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Hotel</DialogTitle>
                <DialogDescription>
                  Enter the details of the new hotel here. Click save when you're done.
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
                  <Label htmlFor="rooms" className="text-right">
                    Rooms
                  </Label>
                  {/*This section needs to be updated to handle an array of rooms*/}
                  {/*Previous code was removed because it's not relevant to the updated structure*/}
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
                <Button type="submit" onClick={handleAddHotel}>Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Rooms</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hotels.map((hotel) => (
                <TableRow key={hotel.id}>
                  <TableCell className="font-medium">{hotel.name}</TableCell>
                  <TableCell>{hotel.address}</TableCell>
                  <TableCell>{hotel.rooms.length}</TableCell> {/* Display number of rooms */}
                  <TableCell>{hotel.rating}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => setCurrentHotel(hotel)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Edit Hotel</DialogTitle>
                            <DialogDescription>
                              Make changes to the hotel information here. Click save when you're done.
                            </DialogDescription>
                          </DialogHeader>
                          {currentHotel && (
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-name" className="text-right">
                                  Name
                                </Label>
                                <Input
                                  id="edit-name"
                                  value={currentHotel.name}
                                  onChange={(e) => setCurrentHotel({ ...currentHotel, name: e.target.value })}
                                  className="col-span-3"
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-address" className="text-right">
                                  Address
                                </Label>
                                <Input
                                  id="edit-address"
                                  value={currentHotel.address}
                                  onChange={(e) => setCurrentHotel({ ...currentHotel, address: e.target.value })}
                                  className="col-span-3"
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-rooms" className="text-right">
                                  Rooms
                                </Label>
                                {/*This section needs to be updated to handle an array of rooms*/}
                                {/*Previous code was removed because it's not relevant to the updated structure*/}
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-rating" className="text-right">
                                  Rating
                                </Label>
                                <Input
                                  id="edit-rating"
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="5"
                                  value={currentHotel.rating}
                                  onChange={(e) => setCurrentHotel({ ...currentHotel, rating: parseFloat(e.target.value) })}
                                  className="col-span-3"
                                />
                              </div>
                            </div>
                          )}
                          <DialogFooter>
                            <Button type="submit" onClick={handleEditHotel}>Save changes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button variant="outline" size="icon" onClick={() => handleDeleteHotel(hotel.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setSelectedHotel(hotel);
                        setIsRoomManagementOpen(true);
                      }}>
                        Manage Rooms
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isRoomManagementOpen} onOpenChange={setIsRoomManagementOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedHotel?.name} - Room Management</DialogTitle>
          </DialogHeader>
          {selectedHotel && (
            <RoomManagement
              rooms={selectedHotel.rooms}
              onAddRoom={(newRoom) => handleAddRoom(selectedHotel.id, newRoom)}
              onUpdateRoom={(updatedRoom) => handleUpdateRoom(selectedHotel.id, updatedRoom)}
              onDeleteRoom={(roomId) => handleDeleteRoom(selectedHotel.id, roomId)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default HotelManagementPage

