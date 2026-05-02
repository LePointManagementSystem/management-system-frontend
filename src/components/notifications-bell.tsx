import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import type { NotificationDto } from "@/types/notification";
import { NotificationType } from "@/types/notification";
import {
  deleteNotification,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notification-service";
import { onBookingsChanged } from "@/utils/events";

const HAITI_TIMEZONE = "America/Port-au-Prince";

type NotificationKind = "confirmed" | "completed" | "cancelled" | "other";

/**
 * Resolves the kind of a notification.
 * Handles both string-serialized enum names (e.g. "BookingConfirmed") returned by
 * the current backend (Type.ToString()) and numeric values if the API changes later.
 * Falls back to title keyword matching as a last resort.
 */
function getKind(n: NotificationDto): NotificationKind {
  const t = n.type;

  // Primary path: backend currently serializes Type as the enum name string
  if (typeof t === "string") {
    const lower = t.toLowerCase();
    if (lower.includes("confirmed")) return "confirmed";
    if (lower.includes("completed")) return "completed";
    if (lower.includes("cancel")) return "cancelled";
  }

  // Secondary path: handle if backend ever sends numeric values
  const num = Number(t);
  if (!Number.isNaN(num)) {
    if (num === NotificationType.BookingConfirmed) return "confirmed";
    if (num === NotificationType.BookingCompleted) return "completed";
    if (num === NotificationType.BookingCancelled) return "cancelled";
  }

  // Tertiary fallback: title keyword parsing
  const title = (n.title || "").toLowerCase();
  if (title.includes("confirmed")) return "confirmed";
  if (title.includes("completed")) return "completed";
  if (title.includes("cancel")) return "cancelled";

  return "other";
}

function parseUtcDateFromLooseString(value: string): Date | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;

  const looksLikeLoose = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(Z)?$/i.test(trimmed);
  const normalized = looksLikeLoose ? trimmed.replace(" ", "T").replace(/(?<!Z)$/i, "Z") : trimmed;

  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateTimeHaiti(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: HAITI_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatTimeHaiti(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: HAITI_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDateShortHaiti(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: HAITI_TIMEZONE,
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatBookingRef(ref?: string | null): string {
  const r = (ref || "").trim();
  if (!r) return "";

  if (/^BK-\d+$/i.test(r)) return r.toUpperCase();

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r)) {
    return `BK-${r.slice(0, 6).toUpperCase()}`;
  }

  return r.length <= 12 ? r : `${r.slice(0, 12)}…`;
}

function normalizeDurationLabel(raw?: string | null): string {
  const s = (raw || "").replace(/[()]/g, "").trim().toLowerCase();
  if (!s) return "";
  const m = s.match(/hours\s*(\d+)/) || s.match(/hours(\d+)/);
  if (m?.[1]) return `${m[1]}h`;
  if (s === "2h") return "2h";
  if (s === "4h") return "4h";
  if (s.includes("overnight")) return "Overnight";
  return (raw || "").replace(/[()]/g, "").trim();
}

function formatNotificationMessage(
  n: NotificationDto,
): { title: string; primary: string; secondary?: string } {
  const kind = getKind(n);

  const title =
    kind === "confirmed"
      ? "Booking confirmed"
      : kind === "completed"
      ? "Booking completed"
      : kind === "cancelled"
      ? "Booking cancelled"
      : (n.title || "Notification").trim();

  const raw = (n.message || "").trim();
  if (!raw) return { title, primary: "", secondary: undefined };

  const bookingMatch = raw.match(/\bBooking\s+([0-9a-fA-F-]{8,})\b/);
  const bookingCode = bookingMatch?.[1];

  const guestMatch = raw.match(/\bfor\s+(.+?)\s+-\s+Rooms?\b/i);
  const guest = guestMatch?.[1]?.trim();

  const roomsMatch = raw.match(/\bRooms?\s+([#0-9,\s]+)/i);
  const roomsRaw = roomsMatch?.[1]?.trim();

  const rooms = roomsRaw
    ? roomsRaw
        .split(/[,\s]+/)
        .map((r) => r.replace(/#/g, "").trim())
        .filter(Boolean)
    : [];

  const roomsLabel =
    rooms.length === 0
      ? ""
      : rooms.length === 1
      ? `Room ${rooms[0].replace(/^0+/, "") || rooms[0]}`
      : `Rooms ${rooms.map((r) => r.replace(/^0+/, "") || r).join(", ")}`;

  const checkMatch = raw.match(
    /Check-in:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2}:[0-9]{2}Z?)\s*,\s*Check-out:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2}:[0-9]{2}Z?)\s*(\([^)]+\))?/i,
  );

  const checkInStr = checkMatch?.[1]?.trim();
  const checkOutStr = checkMatch?.[2]?.trim();
  const duration = checkMatch?.[3]?.trim();

  const checkIn = checkInStr ? parseUtcDateFromLooseString(checkInStr) : null;
  const checkOut = checkOutStr ? parseUtcDateFromLooseString(checkOutStr) : null;

  const ref = formatBookingRef(bookingCode);
  const dur = normalizeDurationLabel(duration);

  if (kind === "confirmed") {
    const who = guest || "Reservation";
    const where = roomsLabel || "";

    let when = "";
    if (checkIn && checkOut) {
      const sameDay = formatDateShortHaiti(checkIn) === formatDateShortHaiti(checkOut);
      const start = formatTimeHaiti(checkIn);
      const end = formatTimeHaiti(checkOut);
      when = sameDay
        ? `${formatDateShortHaiti(checkIn)} • ${start} → ${end}`
        : `${formatDateTimeHaiti(checkIn)} → ${formatDateTimeHaiti(checkOut)}`;
    }

    const primary = [who, where, when].filter(Boolean).join(" • ");
    const secondary =
      [ref ? `Ref ${ref}` : null, dur ? dur : null].filter(Boolean).join(" • ") || undefined;

    return { title, primary, secondary };
  }

  if (kind === "completed") {
    const primary = roomsLabel ? `${roomsLabel} is now available` : "Booking completed";
    const secondary = [ref ? `Ref ${ref}` : null].filter(Boolean).join(" • ") || undefined;
    return { title, primary, secondary };
  }

  if (kind === "cancelled") {
    const reasonMatch = raw.match(/\bReason:\s*(.+)$/i);
    const reason = reasonMatch?.[1]?.trim();

    const primary = [guest ? guest : null, roomsLabel || "Booking cancelled"]
      .filter(Boolean)
      .join(" • ");
    const secondary =
      [ref ? `Ref ${ref}` : null, reason ? `Reason: ${reason}` : null]
        .filter(Boolean)
        .join(" • ") || undefined;

    return { title, primary, secondary };
  }

  const primary = roomsLabel || raw;
  const secondary = ref ? `Ref ${ref}` : undefined;
  return { title, primary, secondary };
}

/**
 * Returns a human-readable relative time string.
 * Supports seconds, minutes, hours, days, weeks, and months.
 */
function timeAgo(isoUtc: string): string {
  const d = new Date(isoUtc);
  const diffMs = Date.now() - d.getTime();
  const s = Math.max(0, Math.floor(diffMs / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

function Pill(props: { label: string; active: boolean; onClick: () => void }) {
  const { label, active, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full text-[12px] border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-muted border-border",
      )}
    >
      {label}
    </button>
  );
}

export function NotificationsBell() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [kindFilter, setKindFilter] = useState<"all" | NotificationKind>("all");

  const hasAuth = () => !!localStorage.getItem("token");

  const refreshCount = async () => {
    if (!hasAuth()) return;
    try {
      const c = await fetchUnreadCount();
      setUnreadCount(c);
    } catch {
      // silent — badge stays at last known value
    }
  };

  const refreshList = async () => {
    if (!hasAuth()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNotifications({ includeRead: true, page: 1, pageSize: 25 });
      setItems(data || []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load notifications");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Keep unread count live (every 15s)
  useEffect(() => {
    refreshCount();
    const t = window.setInterval(refreshCount, 15000);
    return () => window.clearInterval(t);
  }, []);

  // When bookings change, refresh unread count immediately
  useEffect(() => {
    const unsub = onBookingsChanged(() => void refreshCount());
    return unsub;
  }, []);

  // When popover opens: reset filter, load list, refresh count
  useEffect(() => {
    if (open) {
      setKindFilter("all");
      refreshList();
      refreshCount();
    }
  }, [open]);

  // Auto-refresh list every 30s while popover is open
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    if (!open) return;
    const t = window.setInterval(() => {
      if (openRef.current) {
        void refreshList();
        void refreshCount();
      }
    }, 30000);
    return () => window.clearInterval(t);
  }, [open]);

  const onMarkOne = async (n: NotificationDto) => {
    if (n.isRead) return;
    try {
      await markNotificationAsRead(n.notificationId);
      setItems((prev) =>
        prev.map((x) =>
          x.notificationId === n.notificationId
            ? { ...x, isRead: true, readAtUtc: new Date().toISOString() }
            : x,
        ),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Non-blocking — user can still navigate; badge corrects on next poll
    }
  };

  const onMarkAll = async () => {
    try {
      await markAllNotificationsAsRead();
      const now = new Date().toISOString();
      setItems((prev) => prev.map((x) => (x.isRead ? x : { ...x, isRead: true, readAtUtc: now })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const onDelete = async (e: React.MouseEvent, n: NotificationDto) => {
    e.stopPropagation();
    setDeletingId(n.notificationId);
    try {
      await deleteNotification(n.notificationId);
      setItems((prev) => prev.filter((x) => x.notificationId !== n.notificationId));
      if (!n.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silent — item stays visible if delete failed
    } finally {
      setDeletingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    if (kindFilter === "all") return items;
    return items.filter((n) => getKind(n) === kindFilter);
  }, [items, kindFilter]);

  const hiddenCount = items.length - filteredItems.length;

  const openBookingFromNotification = (n: NotificationDto) => {
    void onMarkOne(n);

    const id = typeof n.bookingId === "number" ? n.bookingId : Number(n.bookingId);
    setOpen(false);

    if (Number.isFinite(id)) {
      navigate(`/bookings?bookingId=${id}`);
      return;
    }

    navigate(`/bookings`);
  };

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
        {/* Header */}
        <div className="p-3 flex items-center justify-between">
          <div className="font-semibold">Notifications</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAll}
            disabled={unreadCount === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        </div>

        {/* Filter pills */}
        <div className="px-3 pb-3 flex items-center gap-2 flex-wrap">
          <Pill active={kindFilter === "all"} label="All" onClick={() => setKindFilter("all")} />
          <Pill
            active={kindFilter === "confirmed"}
            label="Confirmed"
            onClick={() => setKindFilter("confirmed")}
          />
          <Pill
            active={kindFilter === "completed"}
            label="Completed"
            onClick={() => setKindFilter("completed")}
          />
          <Pill
            active={kindFilter === "cancelled"}
            label="Cancelled"
            onClick={() => setKindFilter("cancelled")}
          />
        </div>

        <Separator />

        {/* Notification list */}
        <div className="max-h-[420px] overflow-auto">
          {loading && (
            <div className="p-4 text-sm flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          )}

          {!loading && error && (
            <div className="p-4 text-sm text-red-500">{error}</div>
          )}

          {/* Filter produces zero results but list has items — guide the user */}
          {!loading && !error && filteredItems.length === 0 && hiddenCount > 0 && (
            <div className="p-4 text-sm text-muted-foreground">
              No {kindFilter} notifications.{" "}
              <button
                type="button"
                className="text-primary underline underline-offset-2"
                onClick={() => setKindFilter("all")}
              >
                Show all ({items.length})
              </button>
            </div>
          )}

          {/* Truly empty */}
          {!loading && !error && items.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No notifications.</div>
          )}

          {!loading &&
            !error &&
            filteredItems.map((n) => {
              const kind = getKind(n);
              const Icon =
                kind === "confirmed"
                  ? BadgeCheck
                  : kind === "completed"
                  ? CheckCircle2
                  : kind === "cancelled"
                  ? XCircle
                  : BellRing;

              const fm = formatNotificationMessage(n);
              const isDeleting = deletingId === n.notificationId;

              return (
                <div
                  key={n.notificationId}
                  className={cn(
                    "p-3 cursor-pointer hover:bg-muted/50 transition-opacity",
                    !n.isRead && "bg-muted/30",
                    isDeleting && "opacity-40 pointer-events-none",
                  )}
                  onClick={() => openBookingFromNotification(n)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn("mt-0.5 shrink-0", !n.isRead && "text-primary")}>
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{fm.title}</div>

                        {fm.primary && (
                          <div className="text-xs text-muted-foreground mt-1 break-words">
                            {fm.primary}
                          </div>
                        )}

                        {fm.secondary && (
                          <div className="text-xs text-muted-foreground mt-1 break-words">
                            {fm.secondary}
                          </div>
                        )}

                        <div className="text-[11px] text-muted-foreground mt-2">
                          {timeAgo(n.createdAtUtc)}
                          {!n.isRead && (
                            <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-primary align-middle" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onMarkOne(n);
                          }}
                          title="Mark as read"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        onClick={(e) => void onDelete(e, n)}
                        title="Delete notification"
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer — link to full notifications page */}
        <Separator />
        <div className="p-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
