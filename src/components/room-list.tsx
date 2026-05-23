import React, { useEffect, useState } from "react"
import { Loader2, Pencil, Trash2 } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { getRoomsByHotelId, updateRoom, deleteRoom } from "@/services/room-service"
import type { Room } from "@/types/hotel"

type Props = {
  hotelId: number
  onRoomChanged?: () => void
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return "—"
  }
}

const RoomList: React.FC<Props> = ({ hotelId, onRoomChanged }) => {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Edit dialog ──────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false)
  const [editRoom, setEditRoom] = useState<Room | null>(null)
  const [editForm, setEditForm] = useState({
    number: "",
    adultsCapacity: 1,
    childrenCapacity: 0,
    // REMOVED: pricePerNight — le prix est géré par la grille RoomClassPricing.
  })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // ── Delete dialog ────────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getRoomsByHotelId(hotelId)
        if (mounted) setRooms(data || [])
      } catch (err: unknown) {
        if (mounted)
          setError(
            err instanceof Error ? err.message : "Failed to load rooms."
          )
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [hotelId])

  // ── Open edit dialog ─────────────────────────────────────────────────────
  const handleOpenEdit = (room: Room) => {
    setEditRoom(room)
    setEditForm({
      number: room.number ?? "",
      adultsCapacity: room.adultsCapacity ?? 1,
      childrenCapacity: room.childrenCapacity ?? 0,
    })
    setEditError(null)
    setEditOpen(true)
  }

  // ── Submit edit ──────────────────────────────────────────────────────────
  const handleSubmitEdit = async () => {
    if (!editRoom) return
    setEditError(null)

    if (!editForm.number.trim()) {
      setEditError("Room number is required.")
      return
    }
    if (editForm.adultsCapacity < 1) {
      setEditError("Adults capacity must be at least 1.")
      return
    }

    setEditSubmitting(true)
    try {
      await updateRoom(editRoom.roomId, {
        number: editForm.number.trim(),
        adultsCapacity: editForm.adultsCapacity,
        childrenCapacity: editForm.childrenCapacity,
      })

      setRooms((prev) =>
        prev.map((r) =>
          r.roomId === editRoom.roomId
            ? { ...r, ...editForm }
            : r
        )
      )
      setEditOpen(false)
      onRoomChanged?.()
    } catch (err: unknown) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update room."
      )
    } finally {
      setEditSubmitting(false)
    }
  }

  // ── Open delete dialog ───────────────────────────────────────────────────
  const handleOpenDelete = (room: Room) => {
    setDeleteTarget(room)
    setDeleteError(null)
    setDeleteOpen(true)
  }

  // ── Confirm delete ───────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setDeleteSubmitting(true)
    try {
      await deleteRoom(deleteTarget.roomId)
      setRooms((prev) => prev.filter((r) => r.roomId !== deleteTarget.roomId))
      setDeleteOpen(false)
      setDeleteTarget(null)
      onRoomChanged?.()
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete room."
      )
    } finally {
      setDeleteSubmitting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading rooms…
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-2">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (rooms.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No rooms registered for this hotel yet.
      </p>
    )
  }

  return (
    <>
      <div className="rounded-md border mt-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room No.</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Adults</TableHead>
              <TableHead>Children</TableHead>
              {/* REMOVED: "Price / Night" — le prix est sur la grille RoomClassPricing */}
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room) => (
              <TableRow key={room.roomId}>
                <TableCell className="font-medium">
                  {room.number || `#${room.roomId}`}
                </TableCell>
                <TableCell>
                  {room.roomClassName ? (
                    <Badge variant="outline">{room.roomClassName}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>{room.adultsCapacity ?? "—"}</TableCell>
                <TableCell>{room.childrenCapacity ?? "—"}</TableCell>
                {/* REMOVED: price cell */}
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(room.createdAtUtc)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Edit room"
                      onClick={() => handleOpenEdit(room)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Delete room"
                      onClick={() => handleOpenDelete(room)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ══════ DIALOG: EDIT ROOM ══════ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Edit Room</DialogTitle>
            <DialogDescription>
              Modify the details of room{" "}
              <strong>{editRoom?.number || `#${editRoom?.roomId}`}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editError && (
              <Alert variant="destructive">
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="er-num">
                Room Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="er-num"
                value={editForm.number}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, number: e.target.value }))
                }
              />
            </div>

            {/* REMOVED: Price / Night field — géré sur la catégorie */}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="er-adults">
                  Adults <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="er-adults"
                  type="number"
                  min={1}
                  max={20}
                  value={editForm.adultsCapacity}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      adultsCapacity: parseInt(e.target.value) || 1,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="er-children">Children</Label>
                <Input
                  id="er-children"
                  type="number"
                  min={0}
                  max={20}
                  value={editForm.childrenCapacity}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      childrenCapacity: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={editSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitEdit} disabled={editSubmitting}>
              {editSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════ DIALOG: DELETE ROOM ══════ */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Room</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete room{" "}
              <strong>{deleteTarget?.number || `#${deleteTarget?.roomId}`}</strong>?
              <br />
              <span className="text-amber-600 text-sm mt-1 block">
                ⚠ This action cannot be undone. Rooms with active reservations cannot be deleted.
              </span>
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <Alert variant="destructive">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete Room"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default RoomList
