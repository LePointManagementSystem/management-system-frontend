import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Bell, BellRing, Check, CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import type { NotificationDto } from "@/types/notification";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notification-service";
import { onBookingsChanged } from "@/utils/events";

const HAITI_TIMEZONE = "America/Port-au-Prince";

type NotificationKind = "confirmed" | "completed" | "cancelled" | "other";

/** Prefer enum values when present; fallback to title parsing */
function getKind(n: NotificationDto): NotificationKind {
  const type = Number((n as any).type);
  // In your project enum mapping:
  // 1=BookingCancelled, 2=BookingConfirmed, 3=BookingCompleted
  if (type === 1) return "cancelled";
  if (type === 2) return "confirmed";
  if (type === 3) return "completed";

  const t = (n.title || "").toLowerCase();
  if (t.includes("confirmed")) return "confirmed";
  if (t.includes("completed")) return "completed";
  if (t.includes("cancel")) return "cancelled";
  return "other";
}

function parseUtcDateFromLooseString(value: string): Date | null {
  // Supports:
  // - ISO strings
  // - "YYYY-MM-DD HH:mm:ssZ"
  // - "YYYY-MM-DD HH:mm:ss" (assume UTC)
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
  // Support Hours1 / Hours2 / Hours4
  const m = s.match(/hours\s*(\d+)/) || s.match(/hours(\d+)/);
  if (m?.[1]) return `${m[1]}h`;
  if (s === "2h") return "2h";
  if (s === "4h") return "4h";
  if (s.includes("overnight")) return "Overnight";
  return (raw || "").replace(/[()]/g, "").trim();
}

/**
 * Converts raw backend message into a professional 2-lines display.
 * Fixes the bug where check-out time was being cut to a date-only string.
 */
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

  // Rooms parsing: "#050", "##999", "#050, #051"
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

  // ✅ FIXED: capture FULL datetime (date + time + optional Z) for BOTH check-in and check-out
  const checkMatch = raw.match(
    /Check-in:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2}:[0-9]{2}Z?)\s*,\s*Check-out:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2}:[0-9]{2}Z?)\s*(\([^)]+\))?/i,
  );

  const checkInStr = checkMatch?.[1]?.trim();
  const checkOutStr = checkMatch?.[2]?.trim();
  const duration = checkMatch?.[3]?.trim(); // includes parentheses

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
    const secondary = [ref ? `Ref ${ref}` : null, dur ? dur : null].filter(Boolean).join(" • ") || undefined;

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

    const primary = [guest ? guest : null, roomsLabel || "Booking cancelled"].filter(Boolean).join(" • ");
    const secondary = [ref ? `Ref ${ref}` : null, reason ? `Reason: ${reason}` : null]
      .filter(Boolean)
      .join(" • ") || undefined;

    return { title, primary, secondary };
  }

  const primary = roomsLabel || raw;
  const secondary = ref ? `Ref ${ref}` : undefined;
  return { title, primary, secondary };
}

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
  return `${days}d`;
}

function Pill(props: { label: string; active: boolean; onClick: () => void }) {
  const { label, active, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full text-[12px] border transition-colors",
        active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border",
      )}
    >
      {label}
    </button>
  );
}

/**
 * IMPORTANT: your Layout imports this name:
 *   import { NotificationsBell } from "@/components/notifications-bell";
 */
export function NotificationsBell() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [kindFilter, setKindFilter] = useState<"all" | NotificationKind>("all");

  const hasAuth = () => !!localStorage.getItem("token");

  const refreshCount = async () => {
    if (!hasAuth()) return;
    try {
      const c = await fetchUnreadCount();
      setUnreadCount(c);
    } catch {
      // silent
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

  // Keep unread count live
  useEffect(() => {
    refreshCount();
    const t = window.setInterval(refreshCount, 15000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ When bookings change (cancel/complete/create), refresh unread count.
  // This makes “Complete” notifications appear quickly if backend generates them.
  useEffect(() => {
    const unsub = onBookingsChanged(() => void refreshCount());
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When popover opens, load list
  useEffect(() => {
    if (open) {
      refreshList();
      refreshCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onMarkOne = async (n: NotificationDto) => {
    if (n.isRead) return;
    try {
      await markNotificationAsRead(n.notificationId);
      setItems((prev) =>
        prev.map((x) =>
          x.notificationId === n.notificationId ? { ...x, isRead: true, readAtUtc: new Date().toISOString() } : x,
        ),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silent
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

  const filteredItems = useMemo(() => {
    if (kindFilter === "all") return items;
    return items.filter((n) => getKind(n) === kindFilter);
  }, [items, kindFilter]);

  const openBookingFromNotification = (n: NotificationDto) => {
    // Mark as read (don't block navigation)
    void onMarkOne(n);

    const id = typeof n.bookingId === "number" ? n.bookingId : Number(n.bookingId);
    setOpen(false);

    if (Number.isFinite(id)) {
      navigate(`/bookings?bookingId=${id}`);
      return;
    }

    // Fallback: if bookingId is missing, still go to bookings list
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
        <div className="p-3 flex items-center justify-between">
          <div className="font-semibold">Notifications</div>

          <Button variant="ghost" size="sm" onClick={onMarkAll} disabled={unreadCount === 0}>
            <Check className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        </div>

        {/* Filters */}
        <div className="px-3 pb-3 flex items-center gap-2 flex-wrap">
          <Pill active={kindFilter === "all"} label="All" onClick={() => setKindFilter("all")} />
          <Pill active={kindFilter === "confirmed"} label="Confirmed" onClick={() => setKindFilter("confirmed")} />
          <Pill active={kindFilter === "completed"} label="Completed" onClick={() => setKindFilter("completed")} />
          <Pill active={kindFilter === "cancelled"} label="Cancelled" onClick={() => setKindFilter("cancelled")} />
        </div>

        <Separator />

        <div className="max-h-[420px] overflow-auto">
          {loading && (
            <div className="p-4 text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          )}

          {!loading && error && <div className="p-4 text-sm text-red-500">{error}</div>}

          {!loading && !error && filteredItems.length === 0 && (
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

              return (
                <div
                  key={n.notificationId}
                  className={cn("p-3 cursor-pointer hover:bg-muted/50", !n.isRead && "bg-muted/30")}
                  onClick={() => openBookingFromNotification(n)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn("mt-0.5 shrink-0", !n.isRead && "text-primary")}>
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{fm.title}</div>

                        {fm.primary && <div className="text-xs text-muted-foreground mt-1 break-words">{fm.primary}</div>}

                        {fm.secondary && (
                          <div className="text-xs text-muted-foreground mt-1 break-words">{fm.secondary}</div>
                        )}

                        <div className="text-[11px] text-muted-foreground mt-2">
                          {timeAgo(n.createdAtUtc)} · {n.isRead ? "Read" : "Unread"}
                        </div>
                      </div>
                    </div>

                    {!n.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onMarkOne(n);
                        }}
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
