import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, CheckCircle } from "lucide-react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"

const roomTypes = ["Standard", "Deluxe", "Suite"]
const availableRooms = [
    { id: 1, type: "Standard", price: 100, capacity: 2 },
    { id: 2, type: "Deluxe", price: 150, capacity: 3 },
    { id: 3, type: "Suite", price: 250, capacity: 4 },
    { id: 4, type: "Standard", price: 100, capacity: 2 },
    { id: 5, type: "Deluxe", price: 150, capacity: 3 },
]

const RoomBookingPage: React.FC = () => {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(new Date().setDate(new Date().getDate() + 1)),
    })
    const [roomType, setRoomType] = useState<string>("")
    const [guests, setGuests] = useState<number>(1)
    const [selectedRoom, setSelectedRoom] = useState<number | null>(null)
    const [bookingDetails, setBookingDetails] = useState({
        name: "",
        email: "",
        phone: "",
    })

    const handleBooking = () => {
        // Here you would typically send the booking details to your backend
        console.log("Booking submitted:", { dateRange, roomType, guests, selectedRoom, bookingDetails })
        // Reset form or show confirmation message
    }

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold mb-6">Room Booking</h2>
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Search for Rooms</CardTitle>
                        <CardDescription>Select your stay dates and preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="date-range">Date Range</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date-range"
                                        variant={"outline"}
                                        className={`w-full justify-start text-left font-normal ${!dateRange && "text-muted-foreground"}`}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(dateRange.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="room-type">Room Type</Label>
                            <Select onValueChange={setRoomType}>
                                <SelectTrigger id="room-type">
                                    <SelectValue placeholder="Select room type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roomTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="guests">Number of Guests</Label>
                            <Input
                                id="guests"
                                type="number"
                                value={guests}
                                onChange={(e) => setGuests(Number.parseInt(e.target.value))}
                                min={1}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full">Search Availability</Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Available Rooms</CardTitle>
                        <CardDescription>Select a room to book</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Room Type</TableHead>
                                    <TableHead>Capacity</TableHead>
                                    <TableHead>Price per Night</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {availableRooms.map((room) => (
                                    <TableRow key={room.id}>
                                        <TableCell>{room.type}</TableCell>
                                        <TableCell>{room.capacity} guests</TableCell>
                                        <TableCell>GHT{room.price}</TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm" onClick={() => setSelectedRoom(room.id)}>
                                                Select
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {selectedRoom && (
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Booking Details</CardTitle>
                        <CardDescription>Complete your booking</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={bookingDetails.name}
                                    onChange={(e) => setBookingDetails({ ...bookingDetails, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={bookingDetails.email}
                                    onChange={(e) => setBookingDetails({ ...bookingDetails, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    value={bookingDetails.phone}
                                    onChange={(e) => setBookingDetails({ ...bookingDetails, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleBooking} className="w-full">
                            <CheckCircle className="mr-2 h-4 w-4" /> Confirm Booking
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    )
}

export default RoomBookingPage

