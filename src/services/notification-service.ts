import { API_BASE_URL } from "@/config/api-base"
import type { NotificationDto } from "@/types/notification"

// Backend envelope supports { Data: ... } or { data: ... }
type ApiEnvelope<T> = {
  succeeded?: boolean
  Succeeded?: boolean
  message?: string
  Message?: string
  data?: T
  Data?: T
}

function tokenOrThrow(): string {
  const t = localStorage.getItem("token")
  if (!t) throw new Error("Not authenticated. Please log in again.")
  return t
}

function getOptionalHotelId(): number | null {
  const raw = localStorage.getItem("hotelId")
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

async function unwrap<T>(res: Response): Promise<T> {
  const text = await res.text()
  let json: any = null

  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // non-json
  }

  if (!res.ok) {
    const msg = json?.message || json?.Message || text || `Request failed (${res.status})`
    throw new Error(msg)
  }

  if (json && typeof json === "object") {
    const env = json as ApiEnvelope<T>
    if (env.Data !== undefined) return env.Data as T
    if (env.data !== undefined) return env.data as T
  }

  return json as T
}

function normalizeNotification(raw: any): NotificationDto {
  return {
    notificationId: raw.notificationId ?? raw.NotificationId,
    hotelId: raw.hotelId ?? raw.HotelId,
    recipientUserId: raw.recipientUserId ?? raw.RecipientUserId ?? null,
    actorUserId: raw.actorUserId ?? raw.ActorUserId ?? null,
    bookingId: raw.bookingId ?? raw.BookingId ?? null,
    roomId: raw.roomId ?? raw.RoomId ?? null,
    eventAtUtc: raw.eventAtUtc ?? raw.EventAtUtc ?? null,
    type: raw.type ?? raw.Type,
    title: raw.title ?? raw.Title,
    message: raw.message ?? raw.Message,
    isRead: raw.isRead ?? raw.IsRead ?? false,
    createdAtUtc: raw.createdAtUtc ?? raw.CreatedAtUtc,
    readAtUtc: raw.readAtUtc ?? raw.ReadAtUtc ?? null,
  }
}

export type FetchNotificationsParams = {
  includeRead?: boolean
  page?: number
  pageSize?: number
}

export async function fetchNotifications(
  params: FetchNotificationsParams = {}
): Promise<NotificationDto[]> {
  const token = tokenOrThrow()
  const hotelId = getOptionalHotelId()

  const q = new URLSearchParams()
  if (hotelId) q.set("hotelId", String(hotelId))
  if (params.includeRead !== undefined) q.set("includeRead", String(params.includeRead))
  q.set("page", String(params.page ?? 1))
  q.set("pageSize", String(params.pageSize ?? 20))

  const res = await fetch(`${API_BASE_URL}/Notification?${q.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  const raw = (await unwrap<any>(res)) || []
  return Array.isArray(raw) ? raw.map(normalizeNotification) : []
}

export async function fetchUnreadCount(): Promise<number> {
  const token = tokenOrThrow()
  const hotelId = getOptionalHotelId()

  const q = new URLSearchParams()
  if (hotelId) q.set("hotelId", String(hotelId))

  const res = await fetch(`${API_BASE_URL}/Notification/unread-count?${q.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  const data = await unwrap<any>(res)
  const unread = typeof data === "number" ? data : data?.unread
  return Number(unread || 0)
}

export async function markNotificationAsRead(notificationId: number): Promise<void> {
  const token = tokenOrThrow()

  const res = await fetch(`${API_BASE_URL}/Notification/${notificationId}/read`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  })

  await unwrap<void>(res)
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const token = tokenOrThrow()
  const hotelId = getOptionalHotelId()

  const q = new URLSearchParams()
  if (hotelId) q.set("hotelId", String(hotelId))

  const res = await fetch(`${API_BASE_URL}/Notification/mark-all-read?${q.toString()}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  })

  await unwrap<void>(res)
}
