"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { CalendarIcon, CheckCircle, Loader2 } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Room } from "@/types/hotel"
import { fetchAvailableRooms } from "@/services/room-service"
import { Guest } from "@/types/client"
import { useRoomClasses } from "@/hooks/use-room-classes"
import { addGuest, fetchGuest } from "@/services/client-service"
import { createBooking } from "@/services/booking-service"
import { BookingPayload } from "@/types/boking"




const formatDateTime = (date: Date): string => {
    return date.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

const RoomBookingPage: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0)
    const [isLoading, setIsLoading] = useState(false)



    const [roomType, setRoomType] = useState("")
    const [guests, setGuests] = useState(1)
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [bookingDuration, setBookingDuration] = useState<"2h" | "overnight">("overnight")
    const [availableRooms, setAvailableRooms] = useState<Room[]>([])
    const [selectedRoom, setSelectedRoom] = useState<number | null>(null)
    const [clientTab, setClientTab] = useState("existing")
    const [selectedClientId, setSelectedClientId] = useState<string>("")
    const [newClient, setNewClient] = useState({ firstName: "", lastName: "", cin: "", email: "" })
    const [bookingComplete, setBookingComplete] = useState(false)
    const [bookingReference, setBookingReference] = useState("")
    const [notification, setNotification] = useState("")
    const [existingClients, setExistingClients] = useState<Guest[]>([]);
    const { roomClasses, loading: loadingRoomClasses } = useRoomClasses();

    useEffect(() => {
        let timeout: NodeJS.Timeout
        if (bookingComplete && bookingDuration === "2h") {
            timeout = setTimeout(() => {
                setNotification("⏰ The 2-hour booking is now over.")
            }, 2 * 60 * 60 * 1000)
        }
        return () => clearTimeout(timeout)
    }, [bookingComplete, bookingDuration])


    useEffect(() => {
        const fetchClients = async () => {
            try {
                const clients = await fetchGuest();
                setExistingClients(clients)
            } catch (error) {
                console.error("Error fetching guests");
            }
        };
        fetchClients();
    }, [])


    const handleSearch = async () => {
        if (!roomType || !date) return;
        setIsLoading(true);

        try {
            const selectedClass = roomClasses.find((c) => c.name === roomType);
            if (selectedClass) {
                const rawRooms = await fetchAvailableRooms(selectedClass.roomClassID);
                const mappedRooms = rawRooms.map((room: any): Room => ({
                    roomId: room.roomId,
                    roomClassName: room.roomClassName,
                    number: room.number,
                    adultsCapacity: room.adultsCapacity + room.childrenCapacity,
                    hotelId: room.hotelId
                }));
                setAvailableRooms(mappedRooms);
                setCurrentStep(1);
            } else {
                console.warn("No matching room class found for selected type.");
                setAvailableRooms([]);
            }
        } catch (error) {
            console.error("Failed to load available rooms", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoomSelect = (roomId: number) => {
        setSelectedRoom(roomId)
        setCurrentStep(2)
    }

    const selectedClient = useMemo(
        () => existingClients.find((c) => String(c.id) === selectedClientId) ?? null,
        [existingClients, selectedClientId]
    );

    const handleClientSelect = useCallback((clientId: string) =>{
        setSelectedClientId(clientId ?? "")
    }, []);

    const isClientFormValid = useCallback((): boolean =>{
        if(clientTab === "existing") return selectedClientId.trim().length > 0;
        return newClient.email.trim().length >0;
    }, [clientTab,selectedClient]);

    const handleSubmitBooking = async () => {
        if (!selectedRoom || !date || !isClientFormValid()) {
            alert("Incomplete booking details.")
            return
        }

        const checkInDate = new Date(date);
        const checkOutDate = new Date(checkInDate);

        if (bookingDuration === "2h") {
            checkInDate.setHours(checkInDate.getHours(), 0, 0);
            checkOutDate.setHours(checkInDate.getHours() + 2, 0, 0);
        } else if (bookingDuration === "overnight") {
            checkInDate.setHours(21, 0, 0);
            checkOutDate.setDate(checkOutDate.getDate() + 1);
            checkOutDate.setHours(7, 0, 0);
        }

        const checkInDateUtc = checkInDate.toISOString();
        const checkOutDateUtc = checkOutDate.toISOString();

        try {
            let guestId: string | null = null;
            let clientData: typeof newClient;

            if (clientTab === "existing") {
                guestId = selectedClientId ?? null;
                const existing = existingClients.find(c => c.id === selectedClientId);
                clientData = existing
                    ? {
                        firstName: existing.firstName ?? "",
                        lastName: existing.lastName ?? "",
                        cin: existing.cin ?? "",
                        email: existing.email ?? ""
                    }
                    : { firstName: "", lastName: "", cin: "", email: "" };
            } else {
                const addedGuest = await addGuest({
                    firstName: newClient.firstName,
                    lastName: newClient.lastName,
                    cin: newClient.cin,
                    email: newClient.email
                });
                guestId = addedGuest.id ?? null;
                clientData = {
                    firstName: newClient.firstName ?? "",
                    lastName: newClient.lastName ?? "",
                    cin: newClient.cin ?? "",
                    email: newClient.email ?? ""
                };
            }

            const bookingPayload: BookingPayload = {
                hotelId: 1,
                checkInDateUtc,
                checkOutDateUtc,
                roomIds: [selectedRoom],
                paymentMethod: 0,
                durationType: bookingDuration === "2h" ? 1 : 2,
                guest: {
                    firstName: clientData.firstName,
                    lastName: clientData.lastName,
                    cin: clientData.cin,
                }
            };



            const result = await createBooking(bookingPayload);
            setBookingReference(result.bookingReference || `BK-${Math.floor(100000 + Math.random() * 900000)}`)
            setBookingComplete(true)
            setCurrentStep(3)
            alert("Booking completed successful")
        } catch (error) {
            console.error("Booking error:", error)
            alert("Booking failed try again.")
        }
    }


    const handleNewBooking = () => {
        setCurrentStep(0)
        setRoomType("")
        setGuests(1)
        setDate(new Date())
        setBookingDuration("overnight")
        setSelectedRoom(null)
        setSelectedClientId("")
        setNewClient({ firstName: "", lastName: "", cin: "", email: "" })
        setBookingComplete(false)
        setBookingReference("")
        setNotification("")
    }

    if (loadingRoomClasses) {
        return (
            <div className="p-6 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading room classes...</span>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Room Booking</h2>

            {/* Step Indicator */}
            <div className="flex justify-between mb-8">
                {["Search", "Select Room", "Client Details", "Confirmation"].map((step, index) => (
                    <div key={step} className="flex flex-col items-center">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= index ? "bg-blue-500 text-white" : "bg-gray-200"
                                }`}
                        >
                            {index + 1}
                        </div>
                        <span className="text-sm mt-1">{step}</span>
                    </div>
                ))}
            </div>

            {/* Step 1: Search Form */}
            {currentStep === 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Search for Available Rooms</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="roomType">Room Type</Label>
                            <Select value={roomType} onValueChange={setRoomType}>
                                <SelectTrigger id="roomType">
                                    <SelectValue placeholder="Select room type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roomClasses.map((roomClass) => (
                                        <SelectItem key={roomClass.roomClassID} value={roomClass.name}>
                                            {roomClass.name} ({roomClass.roomType}) - {roomClass.hotelName}
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
                                min={1}
                                max={10}
                                value={guests}
                                onChange={(e) => setGuests(Number.parseInt(e.target.value) || 1)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Check-in Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? formatDateTime(date) : "Select date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={(selectedDate) => {
                                            if (selectedDate) setDate(new Date(selectedDate));
                                        }}
                                        initialFocus
                                        disabled={(d) => d < new Date()}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>Booking Duration</Label>
                            <Select value={bookingDuration} onValueChange={(val) => setBookingDuration(val as "2h" | "overnight")}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose duration" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2h">2 Hours</SelectItem>
                                    <SelectItem value="overnight">Overnight</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter>

                        <Button onClick={handleSearch} disabled={!roomType || !date || isLoading} className="w-full">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Searching...
                                </>
                            ) : (
                                "Search Available Rooms"
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* Step 2: Room Selection - Now as a List */}
            {currentStep === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Available Rooms</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Select a room from the list below for {guests} guest{guests > 1 ? "s" : ""}
                        </p>
                    </CardHeader>
                    <CardContent>
                        {availableRooms.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">No rooms available matching your criteria.</p>
                                <Button variant="outline" onClick={() => setCurrentStep(0)} className="mt-4">
                                    Modify Search
                                </Button>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Room Number</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Capacity</TableHead>
                                            {/* <TableHead>Amenities</TableHead> */}
                                            <TableHead>Price</TableHead>
                                            <TableHead>Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {availableRooms.map((room) => (
                                            <TableRow key={room.roomId} className={cn(selectedRoom === room.roomId && "bg-muted/50")}>
                                                <TableCell className="font-medium">{room.number}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{room.roomClassName}</Badge>
                                                </TableCell>
                                                <TableCell>{room.adultsCapacity} guests</TableCell>
                                                {/* <TableCell className="max-w-[200px] truncate">{room.amenities.join(", ")}</TableCell> */}
                                                <TableCell className="font-medium">HTG {room.pricePerNight}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        onClick={() => handleRoomSelect(room.roomId)}
                                                        size="sm"
                                                        variant={selectedRoom === room.roomId ? "default" : "outline"}
                                                    >
                                                        {selectedRoom === room.roomId ? "Selected" : "Select"}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={() => setCurrentStep(0)}>
                            Back to Search
                        </Button>
                        <Button onClick={() => selectedRoom && setCurrentStep(2)} disabled={!selectedRoom}>
                            Continue to Client Details
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* Step 3: Client Details */}
            {currentStep === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Client Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={clientTab} onValueChange={setClientTab}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="existing">Existing Client</TabsTrigger>
                                <TabsTrigger value="new">New Client</TabsTrigger>
                            </TabsList>

                            <TabsContent value="existing" className="space-y-4 pt-4">
                                <div>
                                    <Label>Select Client</Label>
                                    <Select onValueChange={handleClientSelect}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose existing client" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {existingClients.map((client) => (
                                                <SelectItem key={client.id} value={client.id ?? ""}>
                                                    {client.firstName} - {client.email}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedClientId && (
                                    <div className="border rounded-md p-4 bg-muted/50">
                                        <h4 className="font-medium mb-2">Selected Client</h4>
                                        {(() => {
                                            const client = existingClients.find((c) => c.id === selectedClientId)
                                            return client ? (
                                                <div className="space-y-1">
                                                    <p>
                                                        <span className="font-medium">Name:</span> {client.firstName}
                                                    </p>
                                                    <p>
                                                        <span className="font-medium">CIN:</span> {client.cin}
                                                    </p>
                                                    <p>
                                                        <span className="font-medium">Email:</span> {client.email}
                                                    </p>
                                                </div>
                                            ) : null
                                        })()}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="new" className="space-y-4 pt-4">
                                <div>
                                    <Label htmlFor="clientName">First Name</Label>
                                    <Input
                                        id="clientName"
                                        placeholder="First Name"
                                        value={newClient.firstName}
                                        onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="clientName">Last Name</Label>
                                    <Input
                                        id="clientName"
                                        placeholder="Last Name"
                                        value={newClient.lastName}
                                        onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="clientCin">Cin</Label>
                                    <Input
                                        id="clientCin"
                                        placeholder="Cin"
                                        value={newClient.cin}
                                        onChange={(e) => setNewClient({ ...newClient, cin: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="clientEmail">Email</Label>
                                    <Input
                                        id="clientEmail"
                                        type="email"
                                        placeholder="Email Address"
                                        value={newClient.email}
                                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={() => setCurrentStep(1)}>
                            Back to Room Selection
                        </Button>
                        <Button onClick={handleSubmitBooking} disabled={!isClientFormValid()}>
                            Complete Booking
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* Step 4: Booking Confirmation */}
            {currentStep === 3 && bookingComplete && (
                <Card>
                    <CardHeader className="text-center">
                        <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-2" />
                        <CardTitle>Booking Confirmed!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border rounded-md p-4 bg-muted/50">
                            <h4 className="font-medium mb-2">Booking Details</h4>
                            <div className="space-y-2">
                                <p>
                                    <span className="font-medium">Booking Reference:</span> {bookingReference}
                                </p>
                                <p>
                                    <span className="font-medium">Room:</span> {(() => {
                                        const room = availableRooms.find((r) => r.roomId === selectedRoom)
                                        return room ? `${room.number} (${room.roomClassName})` : ""
                                    })()}
                                </p>
                                <p>
                                    <span className="font-medium">Date:</span> {date ? formatDateTime(date) : ""}
                                </p>
                                <p>
                                    <span className="font-medium">Duration:</span> {bookingDuration === "2h" ? "2 Hours" : "Overnight"}
                                </p>
                                <p>
                                    <span className="font-medium">Guests:</span> {guests}
                                </p>
                                <p>
                                    <span className="font-medium">Client:</span>{" "}
                                    {clientTab === "existing"
                                        ? existingClients.find((c) => c.id === selectedClientId)?.firstName + " " + existingClients.find((c) => c.id === selectedClientId)?.lastName
                                        : newClient.firstName + " " + newClient.lastName}
                                </p>
                            </div>
                        </div>

                        {bookingDuration === "2h" && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                                <p className="text-yellow-800 text-sm">
                                    This is a 2-hour booking. A notification will appear when the time is up.
                                </p>
                            </div>
                        )}

                        {notification && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                                <p className="text-red-800">{notification}</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button onClick={handleNewBooking} className="w-full">
                            Make Another Booking
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    )
}

export default RoomBookingPage
