import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  CalendarIcon,
  Check,
  CheckCircle,
  ChevronsUpDown,
  Clock,
  Loader2,
  Search,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

import type { Room, RoomClass } from "@/types/hotel"
import type { Guest } from "@/types/client"
import type { BookingPayload } from "@/types/booking"
import type { BookingDto } from "@/services/booking-service"

import { fetchAvailableRooms } from "@/services/room-service"
import { useRoomClasses } from "@/hooks/use-room-classes"
import { addGuest, fetchGuest } from "@/services/client-service"
import { createBooking } from "@/services/booking-service"
import { listCashSessions } from "@/services/cash-sessions-service"
import { createCashTransaction } from "@/services/cash-transactions-service"
import { formatHaitiLongDateTime } from "@/utils/datetime"
import { calculateCheckInOut, type BookingDurationUI } from "@/utils/booking-helpers"
import { fetchMyStaffProfile } from "@/services/staff-service"
import type { Staff } from "@/types/staff"

// ─── Constants ────────────────────────────────────────────────────────────────

/** Must match backend BookingStatus enum numeric values — do NOT change order */
const DURATION_TYPE_MAP: Record<BookingDurationUI, number> = {
  "2h": 0,
  "4h": 1,
  overnight: 2,
  "1h": 3,
  "3h": 4,
  "5h": 5,
  "6h": 6,
  "7h": 7,
  "8h": 8,
  stay: 9,
}

const PAYMENT_METHODS = [
  { value: 5, label: "Cash" },
  { value: 0, label: "Visa" },
  { value: 1, label: "MasterCard" },
  { value: 2, label: "PayPal" },
  { value: 3, label: "Bank Transfer" },
  { value: 4, label: "Moncash" },
] as const

const WIZARD_STEPS = ["Search", "Select Room", "Client Details", "Confirmation"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeParseRoles(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return raw.split(",").map((s) => s.trim()).filter(Boolean)
  }
}

function getDurationHours(duration: BookingDurationUI): number | null {
  if (duration === "overnight" || duration === "stay") return null
  const n = parseInt(duration.replace("h", ""), 10)
  return Number.isFinite(n) ? n : null
}

function durationLabel(duration: BookingDurationUI): string {
  if (duration === "stay") return "Multi-night Stay"
  if (duration === "overnight") return "Overnight (21:00 → 09:00)"
  const h = getDurationHours(duration) ?? 0
  return `${h} Hour${h > 1 ? "s" : ""}`
}

/** True when user needs to pick the check-in time (hourly + stay, not overnight) */
function needsTimePicker(duration: BookingDurationUI): boolean {
  return duration !== "overnight"
}

function formatDateTime(date: Date): string {
  return formatHaitiLongDateTime(date)
}

function formatPrice(amount: number): string {
  return `HTG ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/** Rough price estimate for the chosen duration */
function estimateRoomPrice(room: Room, duration: BookingDurationUI): { amount: number; suffix: string } {
  const base = room.pricePerNight ?? 0
  if (duration === "stay" || duration === "overnight") {
    return { amount: base, suffix: "/ night" }
  }
  const hours = getDurationHours(duration) ?? 1
  const estimated = Math.round((base / 24) * hours)
  return { amount: estimated, suffix: `for ${hours}h` }
}

/** Now formatted as "HH:MM" */
function nowAsTimeString(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="relative flex items-start justify-between mb-8">
      {/* background connector */}
      <div className="absolute top-4 left-[16px] right-[16px] h-0.5 bg-border" />
      {/* filled connector */}
      <div
        className="absolute top-4 left-[16px] h-0.5 bg-primary transition-all duration-300"
        style={{ width: `calc(${(current / (WIZARD_STEPS.length - 1)) * 100}% - 2px)` }}
      />

      {WIZARD_STEPS.map((label, index) => {
        const done = current > index
        const active = current === index
        return (
          <div key={label} className="relative flex flex-col items-center z-10">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                done && "bg-primary border-primary text-primary-foreground",
                active && "bg-background border-primary text-primary",
                !done && !active && "bg-background border-border text-muted-foreground"
              )}
            >
              {done ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span
              className={cn(
                "text-xs mt-1 text-center max-w-[72px]",
                active ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Searchable Client Picker ─────────────────────────────────────────────────

function ClientSearchPicker({
  clients,
  selectedId,
  onSelect,
}: {
  clients: Guest[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients.slice(0, 60)
    return clients.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        (c.cin ?? "").toLowerCase().includes(q)
    )
  }, [clients, query])

  const selected = clients.find((c) => String(c.id) === selectedId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected
            ? `${selected.firstName} ${selected.lastName}${selected.cin ? ` — ${selected.cin}` : ""}`
            : "Search for a client…"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-2 w-[340px]" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            autoFocus
            placeholder="Type name or CIN…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="max-h-52 overflow-y-auto space-y-0.5">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">No clients found.</p>
          ) : (
            filtered.map((c) => (
              <button
                key={String(c.id)}
                type="button"
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-muted transition-colors",
                  String(c.id) === selectedId && "bg-primary/10 font-medium text-primary"
                )}
                onClick={() => {
                  onSelect(String(c.id))
                  setOpen(false)
                  setQuery("")
                }}
              >
                {c.firstName} {c.lastName}
                {c.cin && (
                  <span className="text-muted-foreground ml-1.5 font-normal">
                    — CIN: {c.cin}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const RoomBookingPage: React.FC = () => {
  const navigate = useNavigate()

  // ── Wizard state ─────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0)
  const [stepError, setStepError] = useState<string | null>(null)

  // ── Step 0: Search form ──────────────────────────────────────────────────
  const [roomType, setRoomType] = useState("")
  const [guests, setGuests] = useState(1)
  const [date, setDate] = useState<Date>(new Date())
  const [checkInTime, setCheckInTime] = useState<string>(nowAsTimeString())
  const [stayCheckOutDate, setStayCheckOutDate] = useState<Date | undefined>(undefined)
  const [bookingDuration, setBookingDuration] = useState<BookingDurationUI>("overnight")
  const [paymentMethod, setPaymentMethod] = useState<number>(5)
  const [isSearching, setIsSearching] = useState(false)

  // ── Step 1: Room selection ───────────────────────────────────────────────
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null)
  const [selectedRoomClass, setSelectedRoomClass] = useState<RoomClass | null>(null)

  // ── Step 2: Client ───────────────────────────────────────────────────────
  const [clientTab, setClientTab] = useState<"existing" | "new">("existing")
  const [selectedClientId, setSelectedClientId] = useState("")
  const [newClient, setNewClient] = useState({ firstName: "", lastName: "", cin: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── Step 3: Confirmation ─────────────────────────────────────────────────
  const [confirmedBooking, setConfirmedBooking] = useState<BookingDto | null>(null)
  const [confirmedGuestName, setConfirmedGuestName] = useState("")
  const [hourlyNotification, setHourlyNotification] = useState("")

  // ── Data ─────────────────────────────────────────────────────────────────
  const [existingClients, setExistingClients] = useState<Guest[]>([])
  const { roomClasses, loading: loadingRoomClasses } = useRoomClasses()

  // ── Staff / hotel scope ──────────────────────────────────────────────────
  const [currentHotelId, setCurrentHotelId] = useState<number | null>(null)
  const [staffLoading, setStaffLoading] = useState(true)
  const [staffError, setStaffError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  // ── Load guests list ─────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        const clients = await fetchGuest()
        setExistingClients(clients || [])
      } catch {
        // non-blocking — guest list will just be empty
      }
    }
    void load()
  }, [])

  // ── Load staff profile (hotel scope) ─────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      try {
        const storedRole = localStorage.getItem("role")
        setUserRole(storedRole)

        const roles = safeParseRoles(localStorage.getItem("roles"))
        const isStaffUser =
          storedRole === "Staff" ||
          storedRole === "Receptionist" ||
          roles.includes("Staff") ||
          roles.includes("Receptionist")

        if (!isStaffUser) {
          setStaffLoading(false)
          return
        }

        const hotelIdFromStorage = localStorage.getItem("hotelId")
        if (hotelIdFromStorage && Number.isFinite(Number(hotelIdFromStorage))) {
          setCurrentHotelId(Number(hotelIdFromStorage))
          setStaffLoading(false)
          return
        }

        const staff: Staff | null = await fetchMyStaffProfile()
        if (staff) {
          setCurrentHotelId(staff.hotelId ?? null)
        } else {
          setCurrentHotelId(null)
        }
        setStaffError(null)
      } catch (err: unknown) {
        setStaffError(
          err instanceof Error
            ? err.message
            : "Could not load your staff profile. Please re-login."
        )
      } finally {
        setStaffLoading(false)
      }
    }
    void init()
  }, [])

  // ── Hourly booking expiry notification ───────────────────────────────────

  useEffect(() => {
    if (!confirmedBooking) return
    const hours = getDurationHours(bookingDuration)
    if (!hours) return
    const timer = setTimeout(() => {
      setHourlyNotification(`The ${hours}-hour booking has now ended.`)
    }, hours * 60 * 60 * 1000)
    return () => clearTimeout(timer)
  }, [confirmedBooking, bookingDuration])

  // ── Derived: filtered room classes by hotel ───────────────────────────────

  const filteredRoomClasses = useMemo(
    () =>
      roomClasses.filter((rc) =>
        currentHotelId == null ? true : rc.hotelId === currentHotelId
      ),
    [roomClasses, currentHotelId]
  )

  // ── Derived: rooms filtered by guest capacity ─────────────────────────────

  const capacityFilteredRooms = useMemo(
    () => availableRooms.filter((r) => (r.adultsCapacity ?? 0) >= guests),
    [availableRooms, guests]
  )

  const excludedCount = availableRooms.length - capacityFilteredRooms.length

  // ── Selected client ───────────────────────────────────────────────────────

  const selectedClient = useMemo(
    () => existingClients.find((c) => String(c.id) === selectedClientId) ?? null,
    [existingClients, selectedClientId]
  )

  // ── Validation helpers ────────────────────────────────────────────────────

  const isClientValid = useCallback((): boolean => {
    if (clientTab === "existing") return selectedClientId.trim().length > 0
    return newClient.firstName.trim().length > 0 && newClient.lastName.trim().length > 0
  }, [clientTab, selectedClientId, newClient.firstName, newClient.lastName])

  function clearStepError() {
    setStepError(null)
  }

  function goToStep(step: number) {
    clearStepError()
    setCurrentStep(step)
  }

  // ── Build booking date/time ───────────────────────────────────────────────

  function buildBookingDate(): Date {
    const base = new Date(date)
    if (needsTimePicker(bookingDuration) && checkInTime) {
      const [h, m] = checkInTime.split(":").map(Number)
      base.setHours(h, m, 0, 0)
    }
    return base
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 0 — Search
  // ─────────────────────────────────────────────────────────────────────────

  const handleSearch = async () => {
    clearStepError()

    if (!roomType) {
      setStepError("Please select a room type.")
      return
    }

    if (bookingDuration === "stay" && !stayCheckOutDate) {
      setStepError("Please select a check-out date for your stay.")
      return
    }

    if (bookingDuration === "stay" && stayCheckOutDate && stayCheckOutDate <= date) {
      setStepError("Check-out date must be after check-in date.")
      return
    }

    if ((userRole === "Staff" || userRole === "Receptionist") && currentHotelId == null) {
      setStepError(
        "Your staff profile has no hotel assigned. Please contact an administrator."
      )
      return
    }

    setIsSearching(true)
    try {
      const selectedClass = filteredRoomClasses.find((c) => c.name === roomType)
      if (!selectedClass) {
        setStepError("Selected room type was not found. Please choose another.")
        setAvailableRooms([])
        setSelectedRoomClass(null)
        return
      }

      setSelectedRoomClass(selectedClass)

      const rawRooms = await fetchAvailableRooms(selectedClass.roomClassID)

      const mappedRooms: Room[] = (rawRooms || []).map(
        (room: Record<string, unknown>): Room => ({
          roomId: Number(room.roomId ?? room.roomID ?? room.id ?? 0),
          roomClassName:
            (room.roomClassName as string) ??
            (room.roomClass as string) ??
            roomType,
          number: (room.number as string) ?? (room.roomNumber as string) ?? "",
          adultsCapacity:
            Number(room.adultsCapacity ?? 0) + Number(room.childrenCapacity ?? 0),
          hotelId: Number(
            room.hotelId ?? room.hotelID ?? selectedClass.hotelId ?? 0
          ),
          pricePerNight: Number(room.pricePerNight ?? room.price ?? 0),
        })
      )

      setAvailableRooms(mappedRooms)
      setSelectedRoom(null)
      goToStep(1)
    } catch {
      setStepError("Failed to load available rooms. Please check your connection and try again.")
    } finally {
      setIsSearching(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — Room selection
  // ─────────────────────────────────────────────────────────────────────────

  const handleRoomSelect = (roomId: number) => {
    setSelectedRoom(roomId)
    goToStep(2)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — Submit booking
  // ─────────────────────────────────────────────────────────────────────────

  const handleSubmitBooking = async () => {
    clearStepError()

    if (selectedRoom == null) {
      setStepError("No room selected. Please go back and select a room.")
      return
    }

    if (!isClientValid()) {
      setStepError(
        clientTab === "existing"
          ? "Please select an existing client."
          : "First name and last name are required for a new client."
      )
      return
    }

    if (bookingDuration === "stay" && !stayCheckOutDate) {
      setStepError("Please go back and select a check-out date.")
      return
    }

    const selectedRoomData = availableRooms.find((r) => r.roomId === selectedRoom)

    let hotelIdForRequest: number | null =
      selectedRoomData?.hotelId ?? selectedRoomClass?.hotelId ?? null

    if ((userRole === "Staff" || userRole === "Receptionist") && currentHotelId != null) {
      hotelIdForRequest = currentHotelId
    }

    if (!hotelIdForRequest) {
      setStepError("Cannot determine hotel ID. Please go back to Search and try again.")
      return
    }

    setIsSubmitting(true)
    try {
      let clientData = { firstName: "", lastName: "", cin: "" }

      if (clientTab === "existing") {
        const existing = existingClients.find(
          (c) => String(c.id) === selectedClientId
        )
        if (!existing) {
          setStepError("Selected client not found. Please re-select.")
          setIsSubmitting(false)
          return
        }
        clientData = {
          firstName: existing.firstName ?? "",
          lastName: existing.lastName ?? "",
          cin: existing.cin ?? "",
        }
      } else {
        const created = await addGuest({
          firstName: newClient.firstName,
          lastName: newClient.lastName,
          cin: newClient.cin,
        })

        const refreshed = await fetchGuest()
        setExistingClients(refreshed || [])

        clientData = {
          firstName: newClient.firstName,
          lastName: newClient.lastName,
          cin: newClient.cin,
        }

        if (created && (created as { id?: unknown }).id) {
          setClientTab("existing")
          setSelectedClientId(String((created as { id: unknown }).id))
        }
      }

      const bookingDate = buildBookingDate()
      const { checkInDateUtc, checkOutDateUtc } = calculateCheckInOut(
        bookingDate,
        bookingDuration,
        stayCheckOutDate
      )

      const bookingPayload: BookingPayload = {
        hotelId: hotelIdForRequest,
        checkInDateUtc,
        checkOutDateUtc,
        roomIds: [selectedRoom],
        paymentMethod,
        durationType: DURATION_TYPE_MAP[bookingDuration],
        guest: {
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          cin: clientData.cin,
        },
      }

      const result = await createBooking(bookingPayload)

        // ── Auto Petty Cash : si paiement Cash (valeur 5), créer une entrée IN automatiquement
        if (paymentMethod === 5) {
          try {
            const sessionsResult = await listCashSessions({ hotelId: hotelIdForRequest, page: 1, pageSize: 10 })
            const activeSession = sessionsResult.items.find((s) => !s.isClosed)
            if (activeSession) {
              const guestFullName = `${clientData.firstName} ${clientData.lastName}`.trim()
              const finalAmount = result.afterDiscountedPrice ?? result.totalPrice
              await createCashTransaction({
                hotelId: hotelIdForRequest,
                cashSessionId: activeSession.cashSessionId,
                type: 1,
                currency: activeSession.currency,
                shift: activeSession.shift,
                amount: finalAmount,
                note: `Booking ${result.confirmationNumber} — ${guestFullName}`,
                category: "Booking",
                reference: result.confirmationNumber,
              })
            }
          } catch {
            // Échec silencieux — le booking reste confirmé même si la petty cash échoue
          }
        }

        setConfirmedBooking(result)
        setConfirmedGuestName(
          `${clientData.firstName} ${clientData.lastName}`.trim()
        )
        goToStep(3)
    } catch (err: unknown) {
      setStepError(
        err instanceof Error ? err.message : "Booking failed. Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleNewBooking = () => {
    setCurrentStep(0)
    setRoomType("")
    setGuests(1)
    setDate(new Date())
    setCheckInTime(nowAsTimeString())
    setStayCheckOutDate(undefined)
    setBookingDuration("overnight")
    setPaymentMethod(0)
    setAvailableRooms([])
    setSelectedRoom(null)
    setSelectedRoomClass(null)
    setSelectedClientId("")
    setNewClient({ firstName: "", lastName: "", cin: "" })
    setClientTab("existing")
    setConfirmedBooking(null)
    setConfirmedGuestName("")
    setHourlyNotification("")
    clearStepError()
  }

  // ── Loading / error screens ───────────────────────────────────────────────

  if (loadingRoomClasses || staffLoading) {
    return (
      <div className="p-6">
        <Card className="max-w-sm mx-auto">
          <CardContent className="flex items-center justify-center gap-3 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Loading booking data…</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (staffError) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <Alert variant="destructive">
          <AlertTitle>Booking Not Available</AlertTitle>
          <AlertDescription>{staffError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Room Booking</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Walk through the steps below to create a new reservation.
        </p>
      </div>

      <StepIndicator current={currentStep} />

      {/* ══════════════ STEP 0 — SEARCH ══════════════ */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search for Available Rooms</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {stepError && (
              <Alert variant="destructive">
                <AlertTitle>Missing Information</AlertTitle>
                <AlertDescription>{stepError}</AlertDescription>
              </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Room Type */}
              <div className="space-y-2">
                <Label>
                  Room Type <span className="text-destructive">*</span>
                </Label>
                <Select value={roomType} onValueChange={setRoomType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRoomClasses.map((rc) => (
                      <SelectItem key={rc.roomClassID} value={rc.name}>
                        {rc.name} ({rc.roomType}) — {rc.hotelName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Number of Guests */}
              <div className="space-y-2">
                <Label htmlFor="guests">Number of Guests</Label>
                <Input
                  id="guests"
                  type="number"
                  min={1}
                  max={20}
                  value={guests}
                  onChange={(e) =>
                    setGuests(Math.max(1, parseInt(e.target.value) || 1))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Rooms below capacity will be excluded from results.
                </p>
              </div>

              {/* Booking Duration */}
              <div className="space-y-2">
                <Label>Booking Duration</Label>
                <Select
                  value={bookingDuration}
                  onValueChange={(val) => {
                    const next = val as BookingDurationUI
                    setBookingDuration(next)
                    if (next !== "stay") setStayCheckOutDate(undefined)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
                      Multi-night
                    </div>
                    <SelectItem value="stay">Stay (choose check-out date)</SelectItem>
                    <Separator className="my-1" />
                    <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
                      Overnight
                    </div>
                    <SelectItem value="overnight">Overnight (21:00 → 09:00)</SelectItem>
                    <Separator className="my-1" />
                    <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
                      Hourly
                    </div>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="2h">2 Hours</SelectItem>
                    <SelectItem value="3h">3 Hours</SelectItem>
                    <SelectItem value="4h">4 Hours</SelectItem>
                    <SelectItem value="5h">5 Hours</SelectItem>
                    <SelectItem value="6h">6 Hours</SelectItem>
                    <SelectItem value="7h">7 Hours</SelectItem>
                    <SelectItem value="8h">8 Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>
                  Payment Method <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={String(paymentMethod)}
                  onValueChange={(v) => setPaymentMethod(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((pm) => (
                      <SelectItem key={pm.value} value={String(pm.value)}>
                        {pm.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Check-in Date */}
              <div className="space-y-2">
                <Label>
                  Check-in Date <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? formatDateTime(date) : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => {
                        if (!d) return
                        const next = new Date(d)
                        setDate(next)
                        if (
                          bookingDuration === "stay" &&
                          stayCheckOutDate &&
                          stayCheckOutDate <= next
                        ) {
                          setStayCheckOutDate(undefined)
                        }
                      }}
                      initialFocus
                      disabled={(d) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        return d < today
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Check-in Time (hourly + stay) */}
              {needsTimePicker(bookingDuration) && (
                <div className="space-y-2">
                  <Label htmlFor="checkInTime">
                    <Clock className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    Check-in Time
                    {bookingDuration !== "stay" && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        (end time calculated automatically)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="checkInTime"
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="w-full"
                  />
                  {getDurationHours(bookingDuration) && checkInTime && (
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const [h, m] = checkInTime.split(":").map(Number)
                        const hours = getDurationHours(bookingDuration) ?? 0
                        const end = new Date()
                        end.setHours(h + hours, m, 0, 0)
                        return `Check-out at ${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`
                      })()}
                    </p>
                  )}
                </div>
              )}

              {/* Check-out Date (stay only) */}
              {bookingDuration === "stay" && (
                <div className="space-y-2">
                  <Label>
                    Check-out Date <span className="text-destructive">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !stayCheckOutDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {stayCheckOutDate
                          ? formatDateTime(stayCheckOutDate)
                          : "Select check-out date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={stayCheckOutDate}
                        onSelect={(d) => d && setStayCheckOutDate(new Date(d))}
                        initialFocus
                        disabled={(d) => {
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          if (d < today) return true
                          return d <= date
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter>
            <Button
              className="w-full"
              onClick={handleSearch}
              disabled={
                !roomType ||
                (bookingDuration === "stay" && !stayCheckOutDate) ||
                isSearching ||
                ((userRole === "Staff" || userRole === "Receptionist") &&
                  currentHotelId == null)
              }
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching…
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Available Rooms
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ══════════════ STEP 1 — SELECT ROOM ══════════════ */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select a Room</CardTitle>
            <p className="text-sm text-muted-foreground">
              {capacityFilteredRooms.length === 0 && availableRooms.length === 0
                ? "No rooms available for the selected criteria."
                : `${capacityFilteredRooms.length} room${capacityFilteredRooms.length !== 1 ? "s" : ""} available for ${guests} guest${guests > 1 ? "s" : ""}`}
              {excludedCount > 0 && (
                <span className="ml-1 text-amber-600">
                  ({excludedCount} room{excludedCount > 1 ? "s" : ""} excluded — insufficient capacity)
                </span>
              )}
            </p>
          </CardHeader>

          <CardContent>
            {stepError && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{stepError}</AlertDescription>
              </Alert>
            )}

            {capacityFilteredRooms.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground">
                  {availableRooms.length > 0
                    ? `All available rooms have insufficient capacity for ${guests} guests. Try reducing the guest count or choosing a different room type.`
                    : "No rooms are available for the selected date and type."}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => goToStep(0)}
                >
                  Modify Search
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Room</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Capacity</TableHead>
                      <TableHead className="font-semibold text-right">Price</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {capacityFilteredRooms.map((room) => {
                      const price = estimateRoomPrice(room, bookingDuration)
                      return (
                        <TableRow
                          key={room.roomId}
                          className={cn(
                            "cursor-pointer hover:bg-muted/40",
                            selectedRoom === room.roomId && "bg-primary/5"
                          )}
                          onClick={() => handleRoomSelect(room.roomId)}
                        >
                          <TableCell className="font-medium">
                            {room.number || `#${room.roomId}`}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {room.roomClassName || selectedRoomClass?.name || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {room.adultsCapacity} guest{room.adultsCapacity !== 1 ? "s" : ""}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-medium">{formatPrice(price.amount)}</div>
                            <div className="text-xs text-muted-foreground">{price.suffix}</div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={selectedRoom === room.roomId ? "default" : "outline"}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRoomSelect(room.roomId)
                              }}
                            >
                              {selectedRoom === room.roomId ? (
                                <>
                                  <Check className="mr-1 h-3.5 w-3.5" />
                                  Selected
                                </>
                              ) : (
                                "Select"
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => goToStep(0)}>
              Back to Search
            </Button>
            <Button
              onClick={() => goToStep(2)}
              disabled={selectedRoom == null}
            >
              Continue to Client Details
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ══════════════ STEP 2 — CLIENT DETAILS ══════════════ */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select an existing client or register a new one.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {stepError && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{stepError}</AlertDescription>
              </Alert>
            )}

            <Tabs
              value={clientTab}
              onValueChange={(v) => {
                clearStepError()
                setClientTab(v as "existing" | "new")
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Existing Client</TabsTrigger>
                <TabsTrigger value="new">New Client</TabsTrigger>
              </TabsList>

              {/* ── Existing client ── */}
              <TabsContent value="existing" className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label>
                    Select Client <span className="text-destructive">*</span>
                  </Label>
                  <ClientSearchPicker
                    clients={existingClients}
                    selectedId={selectedClientId}
                    onSelect={setSelectedClientId}
                  />
                  <p className="text-xs text-muted-foreground">
                    Type a name or CIN to search through{" "}
                    {existingClients.length} registered clients.
                  </p>
                </div>

                {selectedClient && (
                  <div className="rounded-md border p-4 bg-muted/40 space-y-1">
                    <p className="text-sm font-medium">
                      {selectedClient.firstName} {selectedClient.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      CIN: {selectedClient.cin || "—"}
                    </p>
                    {selectedClient.email && (
                      <p className="text-xs text-muted-foreground">
                        {selectedClient.email}
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* ── New client ── */}
              <TabsContent value="new" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="clientFirstName">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="clientFirstName"
                      placeholder="e.g. Jean"
                      value={newClient.firstName}
                      onChange={(e) =>
                        setNewClient((p) => ({ ...p, firstName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="clientLastName">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="clientLastName"
                      placeholder="e.g. Dupont"
                      value={newClient.lastName}
                      onChange={(e) =>
                        setNewClient((p) => ({ ...p, lastName: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clientCin">CIN (National ID)</Label>
                  <Input
                    id="clientCin"
                    placeholder="e.g. 001-123-456-7"
                    value={newClient.cin}
                    onChange={(e) =>
                      setNewClient((p) => ({ ...p, cin: e.target.value }))
                    }
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Booking summary recap */}
            <div className="rounded-md border p-4 bg-muted/30 space-y-2 text-sm">
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
                Booking Summary
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-muted-foreground">Room</span>
                <span className="font-medium">
                  {(() => {
                    const r = availableRooms.find((r) => r.roomId === selectedRoom)
                    return r ? `${r.number} (${r.roomClassName || selectedRoomClass?.name})` : "—"
                  })()}
                </span>
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{durationLabel(bookingDuration)}</span>
                <span className="text-muted-foreground">Check-in</span>
                <span className="font-medium">{formatDateTime(buildBookingDate())}</span>
                {bookingDuration === "stay" && stayCheckOutDate && (
                  <>
                    <span className="text-muted-foreground">Check-out</span>
                    <span className="font-medium">{formatDateTime(stayCheckOutDate)}</span>
                  </>
                )}
                <span className="text-muted-foreground">Payment</span>
                <span className="font-medium">
                  {PAYMENT_METHODS.find((p) => p.value === paymentMethod)?.label ?? "—"}
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => goToStep(1)}
              disabled={isSubmitting}
            >
              Back to Room Selection
            </Button>
            <Button
              onClick={handleSubmitBooking}
              disabled={!isClientValid() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Booking…
                </>
              ) : (
                "Confirm Booking"
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ══════════════ STEP 3 — CONFIRMATION ══════════════ */}
      {currentStep === 3 && confirmedBooking && (
        <Card>
          <CardHeader className="text-center pb-2">
            <CheckCircle className="mx-auto h-14 w-14 text-green-500 mb-3" />
            <CardTitle className="text-xl">Booking Confirmed</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              The reservation has been created successfully.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Main details */}
            <div className="rounded-md border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Booking Reference
                </span>
                <span className="font-bold text-lg tracking-wide">
                  {confirmedBooking.confirmationNumber || confirmedBooking.bookingReference || "—"}
                </span>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground">Guest</span>
                <span className="font-medium">{confirmedGuestName || confirmedBooking.guestName}</span>

                <span className="text-muted-foreground">Hotel</span>
                <span className="font-medium">
                  {confirmedBooking.hotelName ?? selectedRoomClass?.hotelName ?? "—"}
                </span>

                <span className="text-muted-foreground">Room</span>
                <span className="font-medium">
                  {(() => {
                    const r = availableRooms.find((r) => r.roomId === selectedRoom)
                    return r
                      ? `${r.number} — ${r.roomClassName || selectedRoomClass?.name}`
                      : confirmedBooking.roomNumbers || "—"
                  })()}
                </span>

                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{durationLabel(bookingDuration)}</span>

                <span className="text-muted-foreground">Check-in</span>
                <span className="font-medium">
                  {confirmedBooking.checkInDateUtc
                    ? formatDateTime(new Date(confirmedBooking.checkInDateUtc))
                    : formatDateTime(buildBookingDate())}
                </span>

                <span className="text-muted-foreground">Check-out</span>
                <span className="font-medium">
                  {confirmedBooking.checkOutDateUtc
                    ? formatDateTime(new Date(confirmedBooking.checkOutDateUtc))
                    : "—"}
                </span>

                <span className="text-muted-foreground">Guests</span>
                <span className="font-medium">{guests}</span>

                <span className="text-muted-foreground">Payment</span>
                <span className="font-medium">
                  {PAYMENT_METHODS.find((p) => p.value === paymentMethod)?.label ?? "—"}
                </span>

                <span className="text-muted-foreground">Total Price</span>
                <span className="font-semibold text-base">
                  {confirmedBooking.totalPrice != null
                    ? formatPrice(confirmedBooking.totalPrice)
                    : "—"}
                </span>
              </div>
            </div>

            {/* Hourly reminder */}
            {getDurationHours(bookingDuration) && !hourlyNotification && (
              <Alert className="border-amber-200 bg-amber-50">
                <Clock className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Hourly Booking</AlertTitle>
                <AlertDescription className="text-amber-700">
                  This is a {durationLabel(bookingDuration).toLowerCase()} booking.
                  You will be notified when the time is up.
                </AlertDescription>
              </Alert>
            )}

            {/* Expiry notification */}
            {hourlyNotification && (
              <Alert variant="destructive">
                <AlertTitle>Booking Ended</AlertTitle>
                <AlertDescription>{hourlyNotification}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() =>
                navigate(
                  `/bookings?ref=${confirmedBooking.confirmationNumber ?? confirmedBooking.bookingReference ?? ""}`
                )
              }
            >
              View in Bookings
            </Button>
            <Button className="flex-1" onClick={handleNewBooking}>
              New Booking
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

export default RoomBookingPage
