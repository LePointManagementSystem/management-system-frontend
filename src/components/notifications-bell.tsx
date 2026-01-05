// (ex: src/components/NotificationsBell.tsx) — adapte le path selon ton projet
import { useEffect, useState } from "react"
import { Bell, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { NotificationDto } from "@/types/notification"
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notification-service"

const HAITI_TIMEZONE = "America/Port-au-Prince"

function parseUtcDateFromLooseString(value: string): Date | null {
  // Supports:
  // - ISO strings
  // - "YYYY-MM-DD HH:mm:ssZ" (seen in notification messages)
  // - "YYYY-MM-DD HH:mm:ss" (assumed UTC)
  const trimmed = value.trim()
  if (!trimmed) return null

  // Convert "2026-01-04 01:00:00Z" => "2026-01-04T01:00:00Z"
  // Convert "2026-01-04 01:00:00"  => "2026-01-04T01:00:00Z" (assume UTC)
  const looksLikeLoose = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(Z)?$/i.test(trimmed)
  const normalized = looksLikeLoose
    ? trimmed.replace(" ", "T").replace(/(?<!Z)$/i, "Z")
    : trimmed

  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDateTimeHaiti(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: HAITI_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function shortCode(code: string | null | undefined): string {
  if (!code) return ""
  return code.length <= 8 ? code : `${code.slice(0, 8)}…`
}

function formatNotificationMessage(n: NotificationDto): { title: string; message: string } {
  const title = (n.title || "Notification").trim()
  const raw = (n.message || "").trim()
  if (!raw) return { title, message: "" }

  // Example (confirmed):
  // Booking <uuid> for <Guest> - Rooms #333. Check-in: 2026-01-04 02:00:00Z, Check-out: 2026-01-04 04:00:00Z (Hours2).
  // Example (completed):
  // Booking <uuid> completed (time up). Rooms #050.

  const bookingMatch = raw.match(/\bBooking\s+([0-9a-fA-F-]{8,})\b/)
  const bookingCode = bookingMatch?.[1]

  const guestMatch = raw.match(/\bfor\s+(.+?)\s+-\s+Rooms?\b/i)
  const guest = guestMatch?.[1]?.trim()

  const roomsMatch = raw.match(/\bRooms?\s+#+\s*([0-9#,\s]+)/i)
  const roomsRaw = roomsMatch?.[1]
  const rooms = roomsRaw
    ? roomsRaw
        .split(/[,\s]+/)
        .map((r) => r.trim())
        .filter(Boolean)
    : []

  const checkMatch = raw.match(/Check-in:\s*([^,]+),\s*Check-out:\s*([^\s]+\s*[^\(]*?)\s*(\([^\)]+\))?\.?$/i)
  const checkInStr = checkMatch?.[1]?.trim()
  const checkOutStr = checkMatch?.[2]?.trim()
  const duration = checkMatch?.[3]?.trim() // includes parentheses

  const checkIn = checkInStr ? parseUtcDateFromLooseString(checkInStr) : null
  const checkOut = checkOutStr ? parseUtcDateFromLooseString(checkOutStr) : null

  const roomsLabel =
    rooms.length === 0
      ? ""
      : rooms.length === 1
        ? `Room ${rooms[0].replace(/^0+/, "") || rooms[0]}`
        : `Rooms ${rooms.map((r) => r.replace(/^0+/, "") || r).join(", ")}`

  // Humanize by notification type/title (keep English)
  if (/booking\s+confirmed/i.test(title) || /confirmed/i.test(title)) {
    const parts: string[] = ["Reservation confirmed"]
    if (guest) parts.push(`for ${guest}`)
    if (roomsLabel) parts.push(`(${roomsLabel})`)
    const header = parts.join(" ")

    const timePart =
      checkIn && checkOut
        ? `Check-in: ${formatDateTimeHaiti(checkIn)} · Check-out: ${formatDateTimeHaiti(checkOut)}`
        : null

    const bookingPart = bookingCode ? `Booking: ${shortCode(bookingCode)}` : null

    const message = [timePart, duration?.replace(/[()]/g, "") ? `Type: ${duration.replace(/[()]/g, "")}` : null, bookingPart]
      .filter(Boolean)
      .join(" · ")

    return { title, message: message ? `${header}. ${message}` : header }
  }

  if (/booking\s+completed/i.test(title) || /completed/i.test(title)) {
    const base = roomsLabel ? `Reservation completed (${roomsLabel})` : "Reservation completed"
    const bookingPart = bookingCode ? `Booking: ${shortCode(bookingCode)}` : null
    return { title, message: bookingPart ? `${base}. ${bookingPart}` : base }
  }

  // Fallback: if we can at least convert embedded dates to Haiti timezone
  if (checkIn && checkOut) {
    const msg = `Check-in: ${formatDateTimeHaiti(checkIn)} · Check-out: ${formatDateTimeHaiti(checkOut)}${duration ? ` · Type: ${duration.replace(/[()]/g, "")}` : ""}`
    return { title, message: bookingCode ? `${msg} · Booking: ${shortCode(bookingCode)}` : msg }
  }

  return { title, message: raw }
}

function timeAgo(isoUtc: string): string {
  const d = new Date(isoUtc)
  const diffMs = Date.now() - d.getTime()
  const s = Math.max(0, Math.floor(diffMs / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  return `${days}d`
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<NotificationDto[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  const hasAuth = () => {
    // Pour Staff, le backend peut dériver le HotelId depuis le token/claims.
    // Donc on exige seulement le token.
    return !!localStorage.getItem("token")
  }

  const refreshCount = async () => {
    if (!hasAuth()) return
    try {
      const c = await fetchUnreadCount()
      setUnreadCount(c)
    } catch {
      // silence
    }
  }

  const refreshList = async () => {
    if (!hasAuth()) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchNotifications({ includeRead: true, page: 1, pageSize: 25 })
      setItems(data)
    } catch (e: any) {
      setError(e?.message ?? "Failed to load notifications")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshCount()
    const t = window.setInterval(refreshCount, 15000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (open) {
      refreshList()
      refreshCount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onMarkOne = async (n: NotificationDto) => {
    if (n.isRead) return
    try {
      await markNotificationAsRead(n.notificationId)
      setItems((prev) =>
        prev.map((x) =>
          x.notificationId === n.notificationId
            ? { ...x, isRead: true, readAtUtc: new Date().toISOString() }
            : x,
        ),
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // silence
    }
  }

  const onMarkAll = async () => {
    try {
      await markAllNotificationsAsRead()
      const now = new Date().toISOString()
      setItems((prev) => prev.map((x) => (x.isRead ? x : { ...x, isRead: true, readAtUtc: now })))
      setUnreadCount(0)
    } catch {
      // silence
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 rounded-full bg-red-500 text-white text-[10px] leading-none px-1.5 py-1 min-w-[18px] text-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="p-3 flex items-center justify-between">
          <div className="font-semibold">Notifications</div>
          <Button variant="ghost" size="sm" onClick={onMarkAll} disabled={unreadCount === 0}>
            <Check className="h-4 w-4 mr-2" />
            Tout lire
          </Button>
        </div>

        <Separator />

        <div className="max-h-[420px] overflow-auto">
          {loading && (
            <div className="p-4 text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement...
            </div>
          )}

          {!loading && error && <div className="p-4 text-sm text-red-500">{error}</div>}

          {!loading && !error && items.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">Aucune notification.</div>
          )}

          {!loading &&
            !error &&
            items.map((n) => (
              <div
                key={n.notificationId}
                className={cn("p-3 cursor-pointer hover:bg-muted/50", !n.isRead && "bg-muted/30")}
                onClick={() => onMarkOne(n)}
              >
                {(() => {
                  const fm = formatNotificationMessage(n)
                  return (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{fm.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 break-words">{fm.message}</div>
                    <div className="text-[11px] text-muted-foreground mt-2">
                      {timeAgo(n.createdAtUtc)} · {n.isRead ? "Lu" : "Non lu"}
                    </div>
                  </div>

                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        onMarkOne(n)
                      }}
                      title="Marquer comme lu"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                  )
                })()}
              </div>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
