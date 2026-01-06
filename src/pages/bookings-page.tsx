import { useEffect, useMemo, useState } from "react";
import { Loader2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cancelBooking, fetchBookingsByHotel, type BookingDto } from "@/services/booking-service";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { onBookingsChanged } from "@/utils/events";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function toHaitiLocal(isoUtc: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Port-au-Prince",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(isoUtc));
  } catch {
    return isoUtc;
  }
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const s = (status || "").toLowerCase();
  if (s.includes("confirmed")) return "default";
  if (s.includes("pending")) return "secondary";
  if (s.includes("completed")) return "outline";
  if (s.includes("cancel")) return "destructive";
  return "secondary";
}

/**
 * Filtre "range overlap" :
 * On garde une réservation si son intervalle [checkIn, checkOut] chevauche la fenêtre [from, to]
 * - si from est défini: checkOut >= from
 * - si to est défini: checkIn <= to
 */
function overlapsDateWindow(checkInIso: string, checkOutIso: string, from?: Date | null, to?: Date | null) {
  const checkIn = new Date(checkInIso);
  const checkOut = new Date(checkOutIso);

  if (from && checkOut < from) return false;
  if (to && checkIn > to) return false;
  return true;
}

export default function BookingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ On garde la liste complète ici
  const [rows, setRows] = useState<BookingDto[]>([]);

  // ✅ Filters
  const [fromDateStr, setFromDateStr] = useState<string>(""); // YYYY-MM-DD
  const [toDateStr, setToDateStr] = useState<string>(""); // YYYY-MM-DD
  const [statusFilter, setStatusFilter] = useState<string>("all"); // all|pending|confirmed|cancelled|completed

  // ✅ Pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  const hotelId = useMemo(() => {
    const raw = localStorage.getItem("hotelId");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  }, []);

  const fromDate = useMemo(() => {
    if (!fromDateStr) return null;
    // input type="date" -> on considère minuit local
    return new Date(`${fromDateStr}T00:00:00`);
  }, [fromDateStr]);

  const toDate = useMemo(() => {
    if (!toDateStr) return null;
    // fin de journée local (23:59:59) pour inclure la date entière
    return new Date(`${toDateStr}T23:59:59`);
  }, [toDateStr]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBookingsByHotel(hotelId ?? undefined);

      // Optionnel: tri récent (par checkIn / checkOut)
      const sorted = [...(data || [])].sort((a, b) => {
        const aT = new Date(a.checkInDateUtc).getTime();
        const bT = new Date(b.checkInDateUtc).getTime();
        return bT - aT;
      });

      setRows(sorted);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load bookings");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Auto-refresh via event
  useEffect(() => {
    void load();
    const unsubscribe = onBookingsChanged(() => {
      void load();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Reset page when filters/pageSize change
  useEffect(() => {
    setPage(1);
  }, [fromDateStr, toDateStr, statusFilter, pageSize]);

  const filteredRows = useMemo(() => {
    const s = (statusFilter || "all").toLowerCase();

    return rows.filter((b) => {
      // 1) Date overlap filter (checkIn/checkOut)
      if (!overlapsDateWindow(b.checkInDateUtc, b.checkOutDateUtc, fromDate, toDate)) return false;

      // 2) Status filter
      const bs = (b.status || "").toLowerCase();
      if (s === "all") return true;
      if (s === "pending") return bs.includes("pending");
      if (s === "confirmed") return bs.includes("confirmed");
      if (s === "cancelled") return bs.includes("cancel");
      if (s === "completed") return bs.includes("completed");

      return true;
    });
  }, [rows, fromDate, toDate, statusFilter]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  const onCancel = async (b: BookingDto) => {
    const isDone = ["cancelled", "completed"].includes((b.status || "").toLowerCase());
    if (isDone) return;

    const ok = window.confirm(
      `Cancel booking ${b.confirmationNumber} for ${b.guestName} (Room(s): ${b.roomNumbers})?`,
    );
    if (!ok) return;

    try {
      await cancelBooking(b.bookingId);
      // update UI immediately
      setRows((prev) => prev.map((x) => (x.bookingId === b.bookingId ? { ...x, status: "Cancelled" } : x)));
    } catch (e: any) {
      alert(e?.message ?? "Failed to cancel booking");
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <CardTitle>Bookings</CardTitle>
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>

        {/* ✅ Filters + Pagination Controls */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">From (Check-in/Out)</span>
              <Input
                type="date"
                value={fromDateStr}
                onChange={(e) => setFromDateStr(e.target.value)}
                className="w-[180px]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">To (Check-in/Out)</span>
              <Input
                type="date"
                value={toDateStr}
                onChange={(e) => setToDateStr(e.target.value)}
                className="w-[180px]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Status</span>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setFromDateStr("");
                setToDateStr("");
                setStatusFilter("all");
              }}
            >
              Clear
            </Button>
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-medium">{pagedRows.length}</span> of{" "}
              <span className="font-medium">{total}</span> (Page {safePage}/{totalPages})
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(Number(v))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading bookings...
          </div>
        )}

        {!loading && error && <div className="text-sm text-red-500">{error}</div>}

        {!loading && !error && total === 0 && (
          <div className="text-sm text-muted-foreground">No bookings found for the selected filters.</div>
        )}

        {!loading && !error && total > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Rooms</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {pagedRows.map((b) => {
                const isDone = ["cancelled", "completed"].includes((b.status || "").toLowerCase());
                return (
                  <TableRow key={b.bookingId}>
                    <TableCell className="font-medium">
                      {b.guestName}
                      <div className="text-xs text-muted-foreground">{b.confirmationNumber}</div>
                    </TableCell>
                    <TableCell>{b.roomNumbers}</TableCell>
                    <TableCell>{toHaitiLocal(b.checkInDateUtc)}</TableCell>
                    <TableCell>{toHaitiLocal(b.checkOutDateUtc)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="sm" onClick={() => onCancel(b)} disabled={isDone}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
