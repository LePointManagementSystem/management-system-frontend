import React, { useState, useEffect } from "react"
import {
    Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from "@/components/ui/card"
import {
    Button
} from "@/components/ui/button"
import {
    Input
} from "@/components/ui/input"
import {
    Label
} from "@/components/ui/label"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle } from "lucide-react"

type Room = {
    id: number
    type: string
    price: number
    capacity: number
}

type Client = {
    id: number
    name: string
    email: string
    phone: string
}

const roomTypes = ["Standard", "Deluxe", "Suite"]
const availableRooms: Room[] = [
    { id: 1, type: "Standard", price: 100, capacity: 2 },
    { id: 2, type: "Deluxe", price: 150, capacity: 3 },
    { id: 3, type: "Suite", price: 250, capacity: 4 }
]

const existingClients: Client[] = [
    { id: 1, name: "Alice Doe", email: "alice@example.com", phone: "1234567890" },
    { id: 2, name: "Bob Smith", email: "bob@example.com", phone: "0987654321" }
]

const RoomBookingPage: React.FC = () => {
    const [roomType, setRoomType] = useState("")
    const [guests, setGuests] = useState(1)
    const [selectedRoom, setSelectedRoom] = useState<number | null>(null)
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
    const [newClient, setNewClient] = useState({ name: "", email: "", phone: "" })
    const [bookingDuration, setBookingDuration] = useState<"2h" | "overnight">("2h")
    const [notification, setNotification] = useState("")

    useEffect(() => {
        let timeout: NodeJS.Timeout
        if (bookingDuration === "2h" && selectedRoom && selectedClientId !== null) {
            timeout = setTimeout(() => {
                setNotification("⏰ The 2-hour booking for the client is now over.")
            }, 2 * 60 * 60 * 1000)

            // For demo/testing: use 10 sec instead of 2 hours
            // timeout = setTimeout(() => {
            //   setNotification("⏰ The 2-hour booking for the client is now over.")
            // }, 10000)
        }
        return () => clearTimeout(timeout)
    }, [bookingDuration, selectedRoom, selectedClientId])

    const filteredRooms = availableRooms.filter(
        room => (!roomType || room.type === roomType) && guests <= room.capacity
    )

    const handleBooking = () => {
        if (!selectedRoom) return alert("Select a room")
        if (!bookingDuration) return alert("Choose booking duration")

        if (selectedClientId === null) {
            if (!newClient.name || !newClient.email || !newClient.phone)
                return alert("Fill all client details")

            console.log("Booking for NEW client:", newClient)
        } else {
            const client = existingClients.find(c => c.id === selectedClientId)
            console.log("Booking for EXISTING client:", client)
        }

        console.log("Room booked:", {
            roomId: selectedRoom,
            guests,
            duration: bookingDuration
        })
    }

    const isBookingDisabled =
        !selectedRoom ||
        (selectedClientId === null &&
            (!newClient.name || !newClient.email || !newClient.phone))

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold mb-6">Room Booking</h2>

            <Card>
                <CardHeader>
                    <CardTitle>Search for Rooms</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Room Type</Label>
                        <Select onValueChange={setRoomType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select room type" />
                            </SelectTrigger>
                            <SelectContent>
                                {roomTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Number of Guests</Label>
                        <Input
                            type="number"
                            min={1}
                            value={guests}
                            onChange={(e) => setGuests(parseInt(e.target.value))}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Available Rooms</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRooms.map(room => (
                                <TableRow key={room.id}>
                                    <TableCell>{room.type}</TableCell>
                                    <TableCell>HTG {room.price}</TableCell>
                                    <TableCell>
                                        <Button onClick={() => setSelectedRoom(room.id)} size="sm">
                                            Select
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {selectedRoom && (
                <Card>
                    <CardHeader>
                        <CardTitle>Client Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Select Existing Client</Label>
                            <Select onValueChange={(val) => setSelectedClientId(Number(val))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose existing client" />
                                </SelectTrigger>
                                <SelectContent>
                                    {existingClients.map(client => (
                                        <SelectItem key={client.id} value={client.id.toString()}>
                                            {client.name} - {client.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Or Add New Client</Label>
                            <Input
                                placeholder="Name"
                                value={newClient.name}
                                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                            />
                            <Input
                                placeholder="Email"
                                type="email"
                                value={newClient.email}
                                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                            />
                            <Input
                                placeholder="Phone"
                                value={newClient.phone}
                                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {selectedRoom && (
                <Card>
                    <CardHeader>
                        <CardTitle>Booking Options</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Label>Booking Duration</Label>
                        <Select onValueChange={(val) => setBookingDuration(val as "2h" | "overnight")}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose duration" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2h">2 Hours</SelectItem>
                                <SelectItem value="overnight">Overnight</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                    <CardFooter>
                        <Button
                            onClick={handleBooking}
                            disabled={isBookingDisabled}
                            className="w-full"
                        >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Confirm Booking
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {notification && (
                <div className="mt-6 p-4 bg-yellow-100 border border-yellow-300 rounded">
                    {notification}
                </div>
            )}
        </div>
    )
}

export default RoomBookingPage
