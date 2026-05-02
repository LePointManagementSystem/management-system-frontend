import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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

const HAITI_TIMEZONE = "America/Port-au-Prince";
const PAGE_SIZE = 30;

type NotificationKind = "confirmed" | "completed" | "cancelled" | "other";
type ReadFilter = "all" | "unread" | "read";

function getKind(n: NotificationDto): NotificationKind {
  const t = n.type;

  if (typeof t === "string") {
    const lower = t.toLowerCase();
    if (lower.includes("confirmed")) return "confirmed";
    if (lower.includes("completed")) return "completed";
    if (lower.includes("cancel")) return "cancelled";
  }

  const num = Number(t);
  if (!Number.isNaN(num)) {
    if (num === NotificationType.BookingConfirmed) return "confirmed";
    if (num === NotificationType.BookingCompleted) return "completed";
    if (num === NotificationType.BookingCancelled) return "cancelled";
  }

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
    ? roomsRaw.split(/[,\s]+/).map((r) => r.replace(/#/g, "").trim()).filter(Boolean)
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
    const secondary = [ref ? `Ref ${ref}` : null, dur ? dur : null].filter(Boolean).join(" • ") || undefined;
    return { title, primary, secondary };
  }

  if (kind === "completed") {
    const primary = roomsLabel ? `${roomsLabel} is now available` : "Booking completed";
    const secondary = ref ? `Ref ${ref}` : undefined;
    return { title, primary, secondary };
  }

  if (kind === "cancelled") {
    const reasonMatch = raw.match(/\bReason:\s*(.+)$/i);
    const reason = reasonMatch?.[1]?.trim();
    const primary = [guest ? guest : null, roomsLabel || "Booking cancelled"].filter(Boolean).join(" • ");
    const secondary =
      [ref ? `Ref ${ref}` : null, reason ? `Reason: ${reason}` : null].filter(Boolean).join(" • ") || undefined;
    return { title, primary, secondary };
  }

  return { title, primary: roomsLabel || raw, secondary: ref ? `Ref ${ref}` : undefined };
}

function timeAgo(isoUtc: string): string {
  const d = new Date(isoUtc);
  const diffMs = Date.now() - d.getTime();
  const s = Math.max(0, Math.floor(diffMs / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function FilterPill(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-sm border transition-colors",
        props.active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-muted border-border text-muted-foreground",
      )}
    >
      {props.label}
    </button>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [allItems, setAllItems] = useState<NotificationDto[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  const [kindFilter, setKindFilter] = useState<"all" | NotificationKind>("all");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");

  const refreshCount = useCallback(async () => {
    try {
      const c = await fetchUnreadCount();
      setUnreadCount(c);
    } catch {
      // silent
    }
  }, []);

  const loadPage = useCallback(async (pageNum: number, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await fetchNotifications({
        includeRead: true,
        page: pageNum,
        pageSize: PAGE_SIZE,
      });

      if (append) {
        setAllItems((prev) => [...prev, ...(data || [])]);
      } else {
        setAllItems(data || []);
      }
      setHasMore((data || []).length === PAGE_SIZE);
      setPage(pageNum);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load notifications");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(1);
    void refreshCount();
  }, [loadPage, refreshCount]);

  const onMarkOne = async (n: NotificationDto) => {
    if (n.isRead) return;
    try {
      await markNotificationAsRead(n.notificationId);
      setAllItems((prev) =>
        prev.map((x) =>
          x.notificationId === n.notificationId
            ? { ...x, isRead: true, readAtUtc: new Date().toISOString() }
            : x,
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
      setAllItems((prev) => prev.map((x) => (x.isRead ? x : { ...x, isRead: true, readAtUtc: now })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const onDelete = async (n: NotificationDto) => {
    setDeletingIds((prev) => new Set(prev).add(n.notificationId));
    try {
      await deleteNotification(n.notificationId);
      setAllItems((prev) => prev.filter((x) => x.notificationId !== n.notificationId));
      if (!n.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silent — keep item visible
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(n.notificationId);
        return next;
      });
    }
  };

  const filteredItems = useMemo(() => {
    return allItems.filter((n) => {
      if (kindFilter !== "all" && getKind(n) !== kindFilter) return false;
      if (readFilter === "unread" && n.isRead) return false;
      if (readFilter === "read" && !n.isRead) return false;
      return true;
    });
  }, [allItems, kindFilter, readFilter]);

  const openBooking = (n: NotificationDto) => {
    void onMarkOne(n);
    const id = Number(n.bookingId);
    if (Number.isFinite(id) && id > 0) {
      navigate(`/bookings?bookingId=${id}`);
    } else {
      navigate("/bookings");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {unreadCount} unread
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onMarkAll}
          disabled={unreadCount === 0}
        >
          <Check className="h-4 w-4 mr-2" />
          Mark all as read
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center mr-1">Type</span>
          <FilterPill active={kindFilter === "all"} label="All" onClick={() => setKindFilter("all")} />
          <FilterPill
            active={kindFilter === "confirmed"}
            label="Confirmed"
            onClick={() => setKindFilter("confirmed")}
          />
          <FilterPill
            active={kindFilter === "completed"}
            label="Completed"
            onClick={() => setKindFilter("completed")}
          />
          <FilterPill
            active={kindFilter === "cancelled"}
            label="Cancelled"
            onClick={() => setKindFilter("cancelled")}
          />
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center mr-1">Status</span>
          <FilterPill active={readFilter === "all"} label="All" onClick={() => setReadFilter("all")} />
          <FilterPill
            active={readFilter === "unread"}
            label="Unread"
            onClick={() => setReadFilter("unread")}
          />
          <FilterPill
            active={readFilter === "read"}
            label="Read"
            onClick={() => setReadFilter("read")}
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg border divide-y">
        {loading && (
          <div className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading notifications…
          </div>
        )}

        {!loading && error && (
          <div className="p-6 text-center text-red-500 text-sm">{error}</div>
        )}

        {!loading && !error && filteredItems.length === 0 && allItems.length > 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No notifications match the current filters.{" "}
            <button
              type="button"
              className="text-primary underline underline-offset-2"
              onClick={() => { setKindFilter("all"); setReadFilter("all"); }}
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading && !error && allItems.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">You have no notifications.</p>
          </div>
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
            const isDeleting = deletingIds.has(n.notificationId);

            return (
              <div
                key={n.notificationId}
                className={cn(
                  "p-4 flex items-start gap-4 cursor-pointer hover:bg-muted/40 transition-opacity",
                  !n.isRead && "bg-blue-50/50",
                  isDeleting && "opacity-40 pointer-events-none",
                )}
                onClick={() => openBooking(n)}
              >
                {/* Icon */}
                <div className={cn("mt-0.5 shrink-0", !n.isRead ? "text-primary" : "text-muted-foreground")}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{fm.title}</span>
                    {!n.isRead && (
                      <span className="inline-block w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>

                  {fm.primary && (
                    <p className="text-sm text-muted-foreground mt-0.5 break-words">{fm.primary}</p>
                  )}

                  {fm.secondary && (
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">{fm.secondary}</p>
                  )}

                  <p className="text-xs text-muted-foreground mt-1.5">
                    {timeAgo(n.createdAtUtc)}
                    {n.readAtUtc && (
                      <span className="ml-2 text-[11px]">
                        · Read {timeAgo(n.readAtUtc)}
                      </span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Mark as read"
                      onClick={() => void onMarkOne(n)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                    title="Delete notification"
                    disabled={isDeleting}
                    onClick={() => void onDelete(n)}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
      </div>

      {/* Load more */}
      {hasMore && !loading && (
        <div className="text-center pb-4">
          <Button
            variant="outline"
            onClick={() => void loadPage(page + 1, true)}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Load more
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
