import React, { useEffect, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Hotel,
  Layers,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

import type { Hotel as HotelType, RoomClass } from "@/types/hotel"
import type { Owner } from "@/services/owner-service"

import { getHotels, addHotel, updateHotel, deleteHotel } from "@/services/hotel-service"
import { addRoom } from "@/services/room-service"
import {
  getRoomClasses,
  createRoomClass,
  updateRoomClass,
  deleteRoomClass,
  type UpdateRoomClassPayload,
} from "@/services/room-class-service"
import { getOwners } from "@/services/owner-service"
import {
  handleAddHotelHelper,
  handleDeleteHotelHelper,
} from "@/utils/hotel-helpers"

import RoomList from "@/components/room-list"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="text-base leading-none tracking-tight" aria-label={`${rating} stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? "text-amber-400" : "text-gray-200"}>
          ★
        </span>
      ))}
    </span>
  )
}

function StarSelect({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger>
        <SelectValue placeholder="Select rating…" />
      </SelectTrigger>
      <SelectContent>
        {[1, 2, 3, 4, 5].map((n) => (
          <SelectItem key={n} value={String(n)}>
            <span>
              {"★".repeat(n)}{"☆".repeat(5 - n)}&nbsp; {n} Star{n > 1 ? "s" : ""}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_HOTEL_FORM = {
  name: "",
  starRating: 3,
  description: "",
  phoneNumber: "",
  ownerID: "",
}

const EMPTY_ROOM_FORM = {
  roomNumber: "",
  roomClassId: "",
  pricePerNight: 0,
  adultsCapacity: 1,
  childrenCapacity: 0,
}

// Room type options — doit correspondre à l'enum backend RoomType
// Standard=0, Deluxe=1, Suite=2, BeachFront=3
const ROOM_TYPE_OPTIONS = [
  { value: "0", label: "Standard" },
  { value: "1", label: "Deluxe" },
  { value: "2", label: "Suite" },
  { value: "3", label: "BeachFront" },
] as const

const ROOM_TYPE_DESCRIPTIONS: Record<string, string> = {
  "0": "Standard room with essential comfort.",
  "1": "Deluxe room with upgraded amenities.",
  "2": "Spacious suite with a separate living area.",
  "3": "Beachfront room with panoramic sea views.",
}

const EMPTY_ROOM_CLASS_FORM = {
  name: "",
  roomType: "0",
  description: "",
  hotelId: "",
}

// ─── Component ────────────────────────────────────────────────────────────────

const HotelManagementPage: React.FC = () => {
  // ── Data ───────────────────────────────────────────────────────────────────
  const [hotels, setHotels] = useState<HotelType[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [roomClasses, setRoomClasses] = useState<RoomClass[]>([])
  const [loadingHotels, setLoadingHotels] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"hotels" | "categories">("hotels")

  // ── Expand (hotel rows) ────────────────────────────────────────────────────
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  // ── Add Hotel dialog ───────────────────────────────────────────────────────
  const [addHotelOpen, setAddHotelOpen] = useState(false)
  const [addHotelForm, setAddHotelForm] = useState({ ...EMPTY_HOTEL_FORM })
  const [addHotelError, setAddHotelError] = useState<string | null>(null)
  const [addHotelSubmitting, setAddHotelSubmitting] = useState(false)

  // ── Edit Hotel dialog ──────────────────────────────────────────────────────
  const [editHotelOpen, setEditHotelOpen] = useState(false)
  const [editHotelTarget, setEditHotelTarget] = useState<HotelType | null>(null)
  const [editHotelForm, setEditHotelForm] = useState({ ...EMPTY_HOTEL_FORM })
  const [editHotelError, setEditHotelError] = useState<string | null>(null)
  const [editHotelSubmitting, setEditHotelSubmitting] = useState(false)

  // ── Delete Hotel dialog ────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<HotelType | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ── Add Room dialog ────────────────────────────────────────────────────────
  const [addRoomOpen, setAddRoomOpen] = useState(false)
  const [addRoomHotelId, setAddRoomHotelId] = useState<number | null>(null)
  const [addRoomForm, setAddRoomForm] = useState({ ...EMPTY_ROOM_FORM })
  const [addRoomError, setAddRoomError] = useState<string | null>(null)
  const [addRoomSubmitting, setAddRoomSubmitting] = useState(false)

  // ── Add Room Category dialog ───────────────────────────────────────────────
  const [addRoomClassOpen, setAddRoomClassOpen] = useState(false)
  const [addRoomClassForm, setAddRoomClassForm] = useState({ ...EMPTY_ROOM_CLASS_FORM })
  const [addRoomClassError, setAddRoomClassError] = useState<string | null>(null)
  const [addRoomClassSubmitting, setAddRoomClassSubmitting] = useState(false)

  // FIX: Edit Room Category dialog (manquait entièrement)
  const [editRoomClassOpen, setEditRoomClassOpen] = useState(false)
  const [editRoomClassTarget, setEditRoomClassTarget] = useState<RoomClass | null>(null)
  const [editRoomClassForm, setEditRoomClassForm] = useState({ ...EMPTY_ROOM_CLASS_FORM })
  const [editRoomClassError, setEditRoomClassError] = useState<string | null>(null)
  const [editRoomClassSubmitting, setEditRoomClassSubmitting] = useState(false)

  // FIX: Delete Room Category dialog (manquait entièrement)
  const [deleteRoomClassTarget, setDeleteRoomClassTarget] = useState<RoomClass | null>(null)
  const [deleteRoomClassSubmitting, setDeleteRoomClassSubmitting] = useState(false)
  const [deleteRoomClassError, setDeleteRoomClassError] = useState<string | null>(null)

  // ── Auto-dismiss success banner ────────────────────────────────────────────
  useEffect(() => {
    if (!successBanner) return
    const t = setTimeout(() => setSuccessBanner(null), 4_000)
    return () => clearTimeout(t)
  }, [successBanner])

  // ── Load hotels ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingHotels(true)
      setLoadError(null)
      try {
        const data = await getHotels()
        setHotels(data)
      } catch (err: unknown) {
        setLoadError(err instanceof Error ? err.message : "Failed to load hotels.")
      } finally {
        setLoadingHotels(false)
      }
    }
    void load()
  }, [])

  // ── Load owners & room classes ─────────────────────────────────────────────
  const reloadRoomClasses = () => {
    void getRoomClasses()
      .then(setRoomClasses)
      .catch(() => { /* non-blocking */ })
  }

  useEffect(() => {
    void getOwners().then(setOwners).catch(() => { /* non-blocking */ })
    reloadRoomClasses()
  }, [])

  // ── Expand toggle ──────────────────────────────────────────────────────────
  const handleToggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Add Hotel
  // ─────────────────────────────────────────────────────────────────────────
  const handleOpenAddHotel = () => {
    setAddHotelForm({ ...EMPTY_HOTEL_FORM })
    setAddHotelError(null)
    setAddHotelOpen(true)
  }

  const handleSubmitAddHotel = async () => {
    setAddHotelError(null)

    if (!addHotelForm.name.trim()) { setAddHotelError("Hotel name is required."); return }
    if (addHotelForm.starRating < 1 || addHotelForm.starRating > 5) { setAddHotelError("Star rating must be between 1 and 5."); return }
    if (!addHotelForm.phoneNumber.trim()) { setAddHotelError("Phone number is required."); return }
    if (!addHotelForm.ownerID) { setAddHotelError("Please select an owner."); return }

    const ownerRecord = owners.find((o) => String(o.ownerID) === addHotelForm.ownerID)

    setAddHotelSubmitting(true)
    try {
      await handleAddHotelHelper(
        {
          name: addHotelForm.name.trim(),
          starRating: addHotelForm.starRating,
          description: addHotelForm.description.trim(),
          phoneNumber: addHotelForm.phoneNumber.trim(),
          ownerName: ownerRecord ? `${ownerRecord.firstName} ${ownerRecord.lastName}` : "",
          ownerID: Number(addHotelForm.ownerID),
        },
        setHotels
      )
      setAddHotelOpen(false)
      setSuccessBanner(`Hotel "${addHotelForm.name}" added successfully.`)
    } catch (err: unknown) {
      setAddHotelError(err instanceof Error ? err.message : "Failed to add hotel.")
    } finally {
      setAddHotelSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Edit Hotel
  // ─────────────────────────────────────────────────────────────────────────
  const handleOpenEditHotel = (hotel: HotelType) => {
    setEditHotelTarget(hotel)
    setEditHotelForm({
      name: hotel.name,
      starRating: hotel.starRating ?? 3,
      description: hotel.description ?? "",
      phoneNumber: hotel.phoneNumber ?? "",
      ownerID: hotel.ownerID ? String(hotel.ownerID) : "",
    })
    setEditHotelError(null)
    setEditHotelOpen(true)
  }

  const handleSubmitEditHotel = async () => {
    if (!editHotelTarget) return
    setEditHotelError(null)

    if (!editHotelForm.name.trim()) { setEditHotelError("Hotel name is required."); return }
    if (!editHotelForm.phoneNumber.trim()) { setEditHotelError("Phone number is required."); return }

    const ownerRecord = owners.find((o) => String(o.ownerID) === editHotelForm.ownerID)
    const payload: Partial<Omit<HotelType, "id">> = {
      name: editHotelForm.name.trim(),
      starRating: editHotelForm.starRating,
      description: editHotelForm.description.trim(),
      phoneNumber: editHotelForm.phoneNumber.trim(),
      ownerName: ownerRecord
        ? `${ownerRecord.firstName} ${ownerRecord.lastName}`
        : editHotelTarget.ownerName,
      ownerID: editHotelForm.ownerID ? Number(editHotelForm.ownerID) : editHotelTarget.ownerID,
    }

    setEditHotelSubmitting(true)
    try {
      const result = await updateHotel(editHotelTarget.id, payload)
      setHotels((prev) =>
        prev.map((h) =>
          h.id === editHotelTarget.id
            ? result.id > 0 ? result : { ...h, ...payload }
            : h
        )
      )
      setEditHotelOpen(false)
      setSuccessBanner(`Hotel "${editHotelForm.name}" updated successfully.`)
    } catch (err: unknown) {
      setEditHotelError(err instanceof Error ? err.message : "Failed to update hotel.")
    } finally {
      setEditHotelSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Delete Hotel
  // ─────────────────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setDeleteSubmitting(true)
    try {
      await handleDeleteHotelHelper(deleteTarget.id, setHotels)
      setSuccessBanner(`Hotel "${deleteTarget.name}" deleted.`)
      setDeleteTarget(null)
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete hotel.")
    } finally {
      setDeleteSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Add Room
  // ─────────────────────────────────────────────────────────────────────────
  const handleOpenAddRoom = (hotelId: number) => {
    setAddRoomHotelId(hotelId)
    setAddRoomForm({ ...EMPTY_ROOM_FORM })
    setAddRoomError(null)
    setAddRoomOpen(true)
  }

  const handleSubmitAddRoom = async () => {
    setAddRoomError(null)

    if (!addRoomForm.roomNumber.trim()) { setAddRoomError("Room number is required."); return }
    if (!addRoomForm.roomClassId) { setAddRoomError("Please select a room class."); return }
    if (addRoomForm.pricePerNight <= 0) { setAddRoomError("Price per night must be greater than 0."); return }
    if (addRoomForm.adultsCapacity < 1) { setAddRoomError("Adults capacity must be at least 1."); return }

    setAddRoomSubmitting(true)
    try {
      await addRoom(Number(addRoomForm.roomClassId), {
        number: addRoomForm.roomNumber.trim(),
        adultsCapacity: addRoomForm.adultsCapacity,
        childrenCapacity: addRoomForm.childrenCapacity,
        pricePerNight: addRoomForm.pricePerNight,
      })

      // Refresh the expanded hotel's room list
      if (addRoomHotelId && expandedIds.has(addRoomHotelId)) {
        setExpandedIds((prev) => {
          const next = new Set(prev)
          next.delete(addRoomHotelId!)
          return next
        })
        requestAnimationFrame(() => {
          setExpandedIds((prev) => new Set([...prev, addRoomHotelId!]))
        })
      }

      setAddRoomOpen(false)
      const hotel = hotels.find((h) => h.id === addRoomHotelId)
      setSuccessBanner(`Room ${addRoomForm.roomNumber} added${hotel ? ` to ${hotel.name}` : ""}.`)
    } catch (err: unknown) {
      setAddRoomError(err instanceof Error ? err.message : "Failed to add room.")
    } finally {
      setAddRoomSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Add Room Category
  // ─────────────────────────────────────────────────────────────────────────
  const handleOpenAddRoomClass = () => {
    setAddRoomClassForm({ ...EMPTY_ROOM_CLASS_FORM })
    setAddRoomClassError(null)
    setAddRoomClassOpen(true)
  }

  const handleSubmitAddRoomClass = async () => {
    setAddRoomClassError(null)

    if (!addRoomClassForm.name.trim()) { setAddRoomClassError("Category name is required."); return }
    if (!addRoomClassForm.hotelId) { setAddRoomClassError("Please select a hotel."); return }

    const roomTypeInt = parseInt(addRoomClassForm.roomType, 10)
    if (isNaN(roomTypeInt) || roomTypeInt < 0 || roomTypeInt > 3) {
      setAddRoomClassError("Invalid room type selected.")
      return
    }

    setAddRoomClassSubmitting(true)
    try {
      await createRoomClass({
        name: addRoomClassForm.name.trim(),
        roomType: roomTypeInt,
        description: addRoomClassForm.description.trim() || undefined,
        hotelId: Number(addRoomClassForm.hotelId),
      })

      reloadRoomClasses()
      setAddRoomClassOpen(false)
      setSuccessBanner(`Category "${addRoomClassForm.name.trim()}" created successfully.`)
    } catch (err: unknown) {
      setAddRoomClassError(err instanceof Error ? err.message : "Failed to create room category.")
    } finally {
      setAddRoomClassSubmitting(false)
    }
  }

  // FIX: Edit Room Category — fonctions manquantes
  const handleOpenEditRoomClass = (rc: RoomClass) => {
    setEditRoomClassTarget(rc)
    // Convertit le label "Standard" en "0", "Deluxe" en "1", etc.
    const typeEntry = ROOM_TYPE_OPTIONS.find(
      (o) => o.label.toLowerCase() === (rc.roomType ?? "").toLowerCase()
    )
    setEditRoomClassForm({
      name: rc.name ?? "",
      roomType: typeEntry ? typeEntry.value : "0",
      description: rc.description ?? "",
      hotelId: String(rc.hotelId),
    })
    setEditRoomClassError(null)
    setEditRoomClassOpen(true)
  }

  const handleSubmitEditRoomClass = async () => {
    if (!editRoomClassTarget) return
    setEditRoomClassError(null)

    if (!editRoomClassForm.name.trim()) { setEditRoomClassError("Category name is required."); return }

    const roomTypeInt = parseInt(editRoomClassForm.roomType, 10)
    if (isNaN(roomTypeInt) || roomTypeInt < 0 || roomTypeInt > 3) {
      setEditRoomClassError("Invalid room type selected.")
      return
    }

    const payload: UpdateRoomClassPayload = {
      name: editRoomClassForm.name.trim(),
      roomType: roomTypeInt,
      description: editRoomClassForm.description.trim() || undefined,
      hotelId: editRoomClassTarget.hotelId,
    }

    setEditRoomClassSubmitting(true)
    try {
      await updateRoomClass(editRoomClassTarget.roomClassID, payload)

      // Mise à jour de l'état local sans refetch complet
      setRoomClasses((prev) =>
        prev.map((rc) =>
          rc.roomClassID === editRoomClassTarget.roomClassID
            ? {
                ...rc,
                name: payload.name,
                roomType: ROOM_TYPE_OPTIONS.find((o) => Number(o.value) === roomTypeInt)?.label ?? rc.roomType,
                description: payload.description ?? "",
              }
            : rc
        )
      )

      setEditRoomClassOpen(false)
      setSuccessBanner(`Category "${payload.name}" updated successfully.`)
    } catch (err: unknown) {
      setEditRoomClassError(err instanceof Error ? err.message : "Failed to update room category.")
    } finally {
      setEditRoomClassSubmitting(false)
    }
  }

  // FIX: Delete Room Category — fonctions manquantes
  const handleConfirmDeleteRoomClass = async () => {
    if (!deleteRoomClassTarget) return
    setDeleteRoomClassError(null)
    setDeleteRoomClassSubmitting(true)
    try {
      await deleteRoomClass(deleteRoomClassTarget.roomClassID)
      setRoomClasses((prev) =>
        prev.filter((rc) => rc.roomClassID !== deleteRoomClassTarget.roomClassID)
      )
      setDeleteRoomClassTarget(null)
      setSuccessBanner(`Category "${deleteRoomClassTarget.name}" deleted.`)
    } catch (err: unknown) {
      // Le backend renvoie 409 si la catégorie a encore des chambres
      setDeleteRoomClassError(
        err instanceof Error ? err.message : "Failed to delete room category."
      )
    } finally {
      setDeleteRoomClassSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Hotel className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight">Hotel Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleOpenAddRoomClass}>
            <Plus className="mr-2 h-4 w-4" />
            Room Category
          </Button>
          <Button onClick={handleOpenAddHotel}>
            <Plus className="mr-2 h-4 w-4" />
            Add Hotel
          </Button>
        </div>
      </div>

      {/* Success banner */}
      {successBanner && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successBanner}</AlertDescription>
        </Alert>
      )}

      {/* Load error */}
      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Failed to load hotels</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {/* FIX: Tabs — permet de basculer entre la liste des hôtels et la liste des catégories.
           Avant ce fix, les catégories créées n'étaient visibles nulle part dans l'UI. */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "hotels" | "categories")}>
        <TabsList>
          <TabsTrigger value="hotels">
            <Hotel className="mr-2 h-4 w-4" />
            Hotels
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Layers className="mr-2 h-4 w-4" />
            Room Categories
            {roomClasses.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {roomClasses.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB: HOTELS ─── */}
        <TabsContent value="hotels">
          {loadingHotels ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : hotels.length === 0 && !loadError ? (
            <div className="rounded-md border py-16 text-center">
              <Hotel className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No hotels registered yet.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleOpenAddHotel}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add your first hotel
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Name</TableHead>
                    <TableHead>Stars</TableHead>
                    <TableHead className="hidden md:table-cell max-w-[200px]">Description</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">Owner</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {hotels.map((hotel) => {
                    const isExpanded = expandedIds.has(hotel.id)
                    return (
                      <React.Fragment key={hotel.id}>
                        <TableRow className="group">
                          <TableCell className="py-2 px-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleToggleExpand(hotel.id)}
                              title={isExpanded ? "Hide rooms" : "Show rooms"}
                            >
                              {isExpanded
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                          </TableCell>

                          <TableCell className="font-medium">{hotel.name}</TableCell>
                          <TableCell><StarDisplay rating={hotel.starRating ?? 0} /></TableCell>
                          <TableCell className="hidden md:table-cell max-w-[200px]">
                            <span className="truncate block text-sm text-muted-foreground" title={hotel.description}>
                              {hotel.description || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{hotel.phoneNumber || "—"}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {hotel.ownerName || "—"}
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Add room"
                                onClick={() => handleOpenAddRoom(hotel.id)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit hotel"
                                onClick={() => handleOpenEditHotel(hotel)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Delete hotel"
                                onClick={() => { setDeleteError(null); setDeleteTarget(hotel) }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={7} className="py-0 px-0 border-b">
                              <div className="bg-muted/30 px-6 py-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Rooms — {hotel.name}
                                  </p>
                                  <Button variant="outline" size="sm" onClick={() => handleOpenAddRoom(hotel.id)}>
                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                    Add Room
                                  </Button>
                                </div>
                                <RoomList hotelId={hotel.id} />
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* FIX: TAB: ROOM CATEGORIES — page dédiée manquante, ajoutée ici */}
        <TabsContent value="categories">
          {roomClasses.length === 0 ? (
            <div className="rounded-md border py-16 text-center">
              <Layers className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No room categories created yet.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleOpenAddRoomClass}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create your first category
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Hotel</TableHead>
                    <TableHead className="hidden md:table-cell max-w-[240px]">Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roomClasses.map((rc) => (
                    <TableRow key={rc.roomClassID}>
                      <TableCell className="font-medium">{rc.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rc.roomType}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rc.hotelName || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[240px]">
                        <span className="truncate block text-sm text-muted-foreground" title={rc.description}>
                          {rc.description || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {/* FIX: bouton Edit manquant */}
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit category"
                            onClick={() => handleOpenEditRoomClass(rc)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {/* FIX: bouton Delete manquant */}
                          <Button variant="ghost" size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete category"
                            onClick={() => { setDeleteRoomClassError(null); setDeleteRoomClassTarget(rc) }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ══════════════ DIALOG: ADD HOTEL ══════════════ */}
      <Dialog open={addHotelOpen} onOpenChange={setAddHotelOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Add New Hotel</DialogTitle>
            <DialogDescription>Fill in the details below to register a new hotel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {addHotelError && <Alert variant="destructive"><AlertDescription>{addHotelError}</AlertDescription></Alert>}
            <div className="space-y-1.5">
              <Label htmlFor="ah-name">Hotel Name <span className="text-destructive">*</span></Label>
              <Input id="ah-name" placeholder="e.g. Grand Palace Hotel" value={addHotelForm.name}
                onChange={(e) => setAddHotelForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Star Rating <span className="text-destructive">*</span></Label>
                <StarSelect value={addHotelForm.starRating} onChange={(v) => setAddHotelForm((p) => ({ ...p, starRating: v }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ah-phone">Phone Number <span className="text-destructive">*</span></Label>
                <Input id="ah-phone" placeholder="e.g. +509 3000-0000" value={addHotelForm.phoneNumber}
                  onChange={(e) => setAddHotelForm((p) => ({ ...p, phoneNumber: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Owner <span className="text-destructive">*</span></Label>
              {owners.length === 0
                ? <p className="text-xs text-muted-foreground">Loading owners…</p>
                : <Select value={addHotelForm.ownerID} onValueChange={(v) => setAddHotelForm((p) => ({ ...p, ownerID: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select an owner…" /></SelectTrigger>
                    <SelectContent>
                      {owners.map((o) => (
                        <SelectItem key={o.ownerID} value={String(o.ownerID)}>
                          {o.firstName} {o.lastName}
                          {o.email && <span className="text-muted-foreground ml-1.5 text-xs">— {o.email}</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              }
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ah-desc">Description</Label>
              <Textarea id="ah-desc" rows={3} placeholder="Optional description…" value={addHotelForm.description}
                onChange={(e) => setAddHotelForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddHotelOpen(false)} disabled={addHotelSubmitting}>Cancel</Button>
            <Button onClick={handleSubmitAddHotel} disabled={addHotelSubmitting}>
              {addHotelSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save Hotel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════ DIALOG: EDIT HOTEL ══════════════ */}
      <Dialog open={editHotelOpen} onOpenChange={setEditHotelOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Edit Hotel</DialogTitle>
            <DialogDescription>Update the details for <strong>{editHotelTarget?.name ?? "this hotel"}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editHotelError && <Alert variant="destructive"><AlertDescription>{editHotelError}</AlertDescription></Alert>}
            <div className="space-y-1.5">
              <Label htmlFor="eh-name">Hotel Name <span className="text-destructive">*</span></Label>
              <Input id="eh-name" value={editHotelForm.name}
                onChange={(e) => setEditHotelForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Star Rating</Label>
                <StarSelect value={editHotelForm.starRating} onChange={(v) => setEditHotelForm((p) => ({ ...p, starRating: v }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eh-phone">Phone Number <span className="text-destructive">*</span></Label>
                <Input id="eh-phone" value={editHotelForm.phoneNumber}
                  onChange={(e) => setEditHotelForm((p) => ({ ...p, phoneNumber: e.target.value }))} />
              </div>
            </div>
            {owners.length > 0 && (
              <div className="space-y-1.5">
                <Label>Owner</Label>
                <Select value={editHotelForm.ownerID} onValueChange={(v) => setEditHotelForm((p) => ({ ...p, ownerID: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select an owner…" /></SelectTrigger>
                  <SelectContent>
                    {owners.map((o) => (
                      <SelectItem key={o.ownerID} value={String(o.ownerID)}>
                        {o.firstName} {o.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="eh-desc">Description</Label>
              <Textarea id="eh-desc" rows={3} value={editHotelForm.description}
                onChange={(e) => setEditHotelForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditHotelOpen(false)} disabled={editHotelSubmitting}>Cancel</Button>
            <Button onClick={handleSubmitEditHotel} disabled={editHotelSubmitting}>
              {editHotelSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════ DIALOG: DELETE HOTEL ══════════════ */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Hotel</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <Alert variant="destructive"><AlertDescription>{deleteError}</AlertDescription></Alert>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteSubmitting}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteSubmitting}>
              {deleteSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════ DIALOG: ADD ROOM ══════════════ */}
      <Dialog open={addRoomOpen} onOpenChange={setAddRoomOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Room</DialogTitle>
            <DialogDescription>
              Add a new room to <strong>{hotels.find((h) => h.id === addRoomHotelId)?.name ?? "the hotel"}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {addRoomError && <Alert variant="destructive"><AlertDescription>{addRoomError}</AlertDescription></Alert>}
            <div className="space-y-1.5">
              <Label htmlFor="ar-number">Room Number <span className="text-destructive">*</span></Label>
              <Input id="ar-number" placeholder="e.g. 101" value={addRoomForm.roomNumber}
                onChange={(e) => setAddRoomForm((p) => ({ ...p, roomNumber: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Room Class <span className="text-destructive">*</span></Label>
              {roomClasses.filter((rc) => rc.hotelId === addRoomHotelId).length === 0
                ? <p className="text-xs text-muted-foreground">No room classes for this hotel. Create one first.</p>
                : <Select value={addRoomForm.roomClassId} onValueChange={(v) => setAddRoomForm((p) => ({ ...p, roomClassId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select a room class…" /></SelectTrigger>
                    <SelectContent>
                      {roomClasses.filter((rc) => rc.hotelId === addRoomHotelId).map((rc) => (
                        <SelectItem key={rc.roomClassID} value={String(rc.roomClassID)}>
                          {rc.name} — {rc.roomType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              }
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ar-price">Price / Night <span className="text-destructive">*</span></Label>
                <Input id="ar-price" type="number" min={1} value={addRoomForm.pricePerNight}
                  onChange={(e) => setAddRoomForm((p) => ({ ...p, pricePerNight: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ar-adults">Adults <span className="text-destructive">*</span></Label>
                <Input id="ar-adults" type="number" min={1} max={20} value={addRoomForm.adultsCapacity}
                  onChange={(e) => setAddRoomForm((p) => ({ ...p, adultsCapacity: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ar-children">Children</Label>
                <Input id="ar-children" type="number" min={0} max={20} value={addRoomForm.childrenCapacity}
                  onChange={(e) => setAddRoomForm((p) => ({ ...p, childrenCapacity: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRoomOpen(false)} disabled={addRoomSubmitting}>Cancel</Button>
            <Button onClick={handleSubmitAddRoom} disabled={addRoomSubmitting}>
              {addRoomSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════ DIALOG: ADD ROOM CATEGORY ══════════════ */}
      <Dialog open={addRoomClassOpen} onOpenChange={setAddRoomClassOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Room Category</DialogTitle>
            <DialogDescription>
              Create a new room category to assign to individual rooms in a hotel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {addRoomClassError && <Alert variant="destructive"><AlertDescription>{addRoomClassError}</AlertDescription></Alert>}
            <div className="space-y-1.5">
              <Label htmlFor="arc-name">Category Name <span className="text-destructive">*</span></Label>
              <Input id="arc-name" placeholder="e.g. Deluxe Sea View" value={addRoomClassForm.name}
                onChange={(e) => setAddRoomClassForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Room Type <span className="text-destructive">*</span></Label>
              <Select value={addRoomClassForm.roomType} onValueChange={(v) => setAddRoomClassForm((p) => ({ ...p, roomType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROOM_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addRoomClassForm.roomType && (
                <p className="text-xs text-muted-foreground mt-1">
                  {ROOM_TYPE_DESCRIPTIONS[addRoomClassForm.roomType]}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Hotel <span className="text-destructive">*</span></Label>
              {hotels.length === 0
                ? <p className="text-xs text-muted-foreground">No hotels available.</p>
                : <Select value={addRoomClassForm.hotelId} onValueChange={(v) => setAddRoomClassForm((p) => ({ ...p, hotelId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select a hotel…" /></SelectTrigger>
                    <SelectContent>
                      {hotels.map((h) => <SelectItem key={h.id} value={String(h.id)}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
              }
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arc-desc">Description</Label>
              <Textarea id="arc-desc" rows={2} placeholder="Optional description…" value={addRoomClassForm.description}
                onChange={(e) => setAddRoomClassForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRoomClassOpen(false)} disabled={addRoomClassSubmitting}>Cancel</Button>
            <Button onClick={handleSubmitAddRoomClass} disabled={addRoomClassSubmitting}>
              {addRoomClassSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FIX: DIALOG: EDIT ROOM CATEGORY — manquait entièrement */}
      <Dialog open={editRoomClassOpen} onOpenChange={setEditRoomClassOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Room Category</DialogTitle>
            <DialogDescription>
              Update the details for <strong>{editRoomClassTarget?.name ?? "this category"}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editRoomClassError && <Alert variant="destructive"><AlertDescription>{editRoomClassError}</AlertDescription></Alert>}
            <div className="space-y-1.5">
              <Label htmlFor="erc-name">Category Name <span className="text-destructive">*</span></Label>
              <Input id="erc-name" value={editRoomClassForm.name}
                onChange={(e) => setEditRoomClassForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Room Type <span className="text-destructive">*</span></Label>
              <Select value={editRoomClassForm.roomType} onValueChange={(v) => setEditRoomClassForm((p) => ({ ...p, roomType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROOM_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editRoomClassForm.roomType && (
                <p className="text-xs text-muted-foreground mt-1">
                  {ROOM_TYPE_DESCRIPTIONS[editRoomClassForm.roomType]}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="erc-desc">Description</Label>
              <Textarea id="erc-desc" rows={2} value={editRoomClassForm.description}
                onChange={(e) => setEditRoomClassForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoomClassOpen(false)} disabled={editRoomClassSubmitting}>Cancel</Button>
            <Button onClick={handleSubmitEditRoomClass} disabled={editRoomClassSubmitting}>
              {editRoomClassSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FIX: DIALOG: DELETE ROOM CATEGORY — manquait entièrement */}
      <Dialog open={!!deleteRoomClassTarget} onOpenChange={(open) => { if (!open) setDeleteRoomClassTarget(null) }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Room Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteRoomClassTarget?.name}</strong>?
              <span className="text-amber-600 text-sm mt-1 block">
                ⚠ This action cannot be undone. Categories that still have rooms assigned cannot be deleted.
              </span>
            </DialogDescription>
          </DialogHeader>
          {deleteRoomClassError && (
            <Alert variant="destructive">
              <AlertDescription>{deleteRoomClassError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRoomClassTarget(null)} disabled={deleteRoomClassSubmitting}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDeleteRoomClass} disabled={deleteRoomClassSubmitting}>
              {deleteRoomClassSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : "Delete Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

export default HotelManagementPage
