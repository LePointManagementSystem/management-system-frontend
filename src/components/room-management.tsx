import React, { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import ClientSearch from './client-search'

interface Room {
    id: number;
    number: string;
    type: string;
    capacity: number;
    price: number;
    status: 'available' | 'occupied' | 'maintenance';
    client?: {
        id: string;
        name: string;
        email: string;
        phone: string;
    };
}

interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
}

interface RoomManagementProps {
    rooms: Room[];
    onAddRoom: (room: Omit<Room, 'id'>) => void;
    onUpdateRoom: (room: Room) => void;
    onDeleteRoom: (id: number) => void;
}

export const RoomManagement: React.FC<RoomManagementProps> = ({
    rooms,
    onAddRoom,
    onUpdateRoom,
    onDeleteRoom,
}) => {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [newRoom, setNewRoom] = useState<Omit<Room, 'id'>>({
        number: '',
        type: 'Standard',
        capacity: 2,
        price: 0,
        status: 'available',
    });
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);

    const handleAddRoom = () => {
        onAddRoom(newRoom);
        setNewRoom({
            number: '',
            type: 'Standard',
            capacity: 2,
            price: 0,
            status: 'available',
        });
        setIsAddDialogOpen(false);
    };

    const handleEditRoom = () => {
        if (currentRoom) {
            onUpdateRoom({
                ...currentRoom,
                client: selectedClient || undefined,
            });
            setIsEditDialogOpen(false);
            setSelectedClient(null);
        }
    };

    const handleClientSelect = (client: Client) => {
        setSelectedClient(client);
        if (currentRoom) {
            setCurrentRoom({ ...currentRoom, client, status: 'occupied' });
        }
        setIsClientSearchOpen(false);
        setIsEditDialogOpen(false);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold">Room Management</h3>
                <div className="space-x-2">
                    <Dialog open={isClientSearchOpen} onOpenChange={setIsClientSearchOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">Search Clients</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>Search or Add Clients</DialogTitle>
                                <DialogDescription>
                                    Search for existing clients or add a new client to assign to a room.
                                </DialogDescription>
                            </DialogHeader>
                            <ClientSearch onClientSelect={handleClientSelect} />
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2 h-4 w-4" /> Add Room</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add New Room</DialogTitle>
                                <DialogDescription>
                                    Enter the details of the new room here. Click save when you're done.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="room-number" className="text-right">
                                        Room Number
                                    </Label>
                                    <Input
                                        id="room-number"
                                        value={newRoom.number}
                                        onChange={(e) => setNewRoom({ ...newRoom, number: e.target.value })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="room-type" className="text-right">
                                        Type
                                    </Label>
                                    <Select
                                        onValueChange={(value) => setNewRoom({ ...newRoom, type: value })}
                                        defaultValue={newRoom.type}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select room type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Standard">Standard</SelectItem>
                                            <SelectItem value="Deluxe">Deluxe</SelectItem>
                                            <SelectItem value="Suite">Suite</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="room-capacity" className="text-right">
                                        Capacity
                                    </Label>
                                    <Input
                                        id="room-capacity"
                                        type="number"
                                        value={newRoom.capacity}
                                        onChange={(e) => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="room-price" className="text-right">
                                        Price
                                    </Label>
                                    <Input
                                        id="room-price"
                                        type="number"
                                        value={newRoom.price}
                                        onChange={(e) => setNewRoom({ ...newRoom, price: parseFloat(e.target.value) })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="room-status" className="text-right">
                                        Status
                                    </Label>
                                    <Select
                                        onValueChange={(value: 'available' | 'occupied' | 'maintenance') => setNewRoom({ ...newRoom, status: value })}
                                        defaultValue={newRoom.status}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select room status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="available">Available</SelectItem>
                                            <SelectItem value="occupied">Occupied</SelectItem>
                                            <SelectItem value="maintenance">Maintenance</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" onClick={handleAddRoom}>Add Room</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Room Number</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rooms.map((room) => (
                        <TableRow key={room.id}>
                            <TableCell>{room.number}</TableCell>
                            <TableCell>{room.type}</TableCell>
                            <TableCell>{room.capacity}</TableCell>
                            <TableCell>GHT{room.price}</TableCell>
                            <TableCell>{room.status}</TableCell>
                            <TableCell>{room.client ? room.client.name : 'N/A'}</TableCell>
                            <TableCell>
                                <div className="flex space-x-2">
                                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="icon" onClick={() => setCurrentRoom(room)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                            <DialogHeader>
                                                <DialogTitle>Edit Room</DialogTitle>
                                                <DialogDescription>
                                                    Make changes to the room information here. Click save when you're done.
                                                </DialogDescription>
                                            </DialogHeader>
                                            {currentRoom && (
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-room-number" className="text-right">
                                                            Room Number
                                                        </Label>
                                                        <Input
                                                            id="edit-room-number"
                                                            value={currentRoom.number}
                                                            onChange={(e) => setCurrentRoom({ ...currentRoom, number: e.target.value })}
                                                            className="col-span-3"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-room-type" className="text-right">
                                                            Type
                                                        </Label>
                                                        <Select
                                                            onValueChange={(value) => setCurrentRoom({ ...currentRoom, type: value })}
                                                            defaultValue={currentRoom.type}
                                                        >
                                                            <SelectTrigger className="col-span-3">
                                                                <SelectValue placeholder="Select room type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Standard">Standard</SelectItem>
                                                                <SelectItem value="Deluxe">Deluxe</SelectItem>
                                                                <SelectItem value="Suite">Suite</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-room-capacity" className="text-right">
                                                            Capacity
                                                        </Label>
                                                        <Input
                                                            id="edit-room-capacity"
                                                            type="number"
                                                            value={currentRoom.capacity}
                                                            onChange={(e) => setCurrentRoom({ ...currentRoom, capacity: parseInt(e.target.value) })}
                                                            className="col-span-3"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-room-price" className="text-right">
                                                            Price
                                                        </Label>
                                                        <Input
                                                            id="edit-room-price"
                                                            type="number"
                                                            value={currentRoom.price}
                                                            onChange={(e) => setCurrentRoom({ ...currentRoom, price: parseFloat(e.target.value) })}
                                                            className="col-span-3"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-room-status" className="text-right">
                                                            Status
                                                        </Label>
                                                        <Select
                                                            onValueChange={(value: 'available' | 'occupied' | 'maintenance') => setCurrentRoom({ ...currentRoom, status: value })}
                                                            defaultValue={currentRoom.status}
                                                        >
                                                            <SelectTrigger className="col-span-3">
                                                                <SelectValue placeholder="Select room status" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="available">Available</SelectItem>
                                                                <SelectItem value="occupied">Occupied</SelectItem>
                                                                <SelectItem value="maintenance">Maintenance</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label className="text-right">Client</Label>
                                                        <div className="col-span-3">
                                                            {currentRoom.client ? (
                                                                <div className="flex justify-between items-center">
                                                                    <span>{currentRoom.client.name}</span>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setCurrentRoom({ ...currentRoom, client: undefined, status: 'available' });
                                                                            setSelectedClient(null);
                                                                        }}
                                                                    >
                                                                        Remove
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={() => setIsClientSearchOpen(true)}
                                                                >
                                                                    Assign Client
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <DialogFooter>
                                                <Button type="submit" onClick={handleEditRoom}>Save changes</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                    <Button variant="outline" size="icon" onClick={() => onDeleteRoom(room.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default RoomManagement;

