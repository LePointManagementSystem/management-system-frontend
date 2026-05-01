import React, { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { getRoomsByHotelId } from "@/services/room-service"
import type { Room } from "@/types/hotel"

type Props = {
  hotelId: number
}

function formatHtg(amount: number): string {
  return `HTG ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
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

const RoomList: React.FC<Props> = ({ hotelId }) => {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    <div className="rounded-md border mt-1">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Room No.</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Adults</TableHead>
            <TableHead>Children</TableHead>
            <TableHead className="text-right">Price / Night</TableHead>
            <TableHead>Added</TableHead>
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
              <TableCell className="text-right font-medium">
                {room.pricePerNight != null
                  ? formatHtg(room.pricePerNight)
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(room.createdAtUtc)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default RoomList
