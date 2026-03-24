import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, XCircle, ChevronLeft, ChevronRight, CheckCircle2, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { onBookingsChanged } from "@/utils/events";
import { exportBookingsExcel } from "@/services/reporting-service";
import { cancelBooking, completeBooking, fetchBookingsByHotel, type BookingDto } from "@/services/booking-service";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

function formatBookingRef(ref?: string) {
  if (!ref) return "—";

  if (/^BK-\d+$/i.test(ref)) return ref.toUpperCase();

  // GUID -> BK-XXXXXX (fallback)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)) {
    return `BK-${ref.slice(0, 6).toUpperCase()}`;
  }

  return ref;
}

/**
 * ✅ Normalise un booking ref pour comparer facilement
 */
function normalizeBookingRef(ref?: string | null): string | null {
  if (!ref) return null;
  const m = ref.match(/\bbk\s*[-\s]?\s*([a-z0-9]{4,})\b/i);
  if (!m?.[1]) return null;
  return `BK-${m[1].toUpperCase()}`;
}

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
  const [rows, setRows] = useState<BookingDto[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [searchParams] = useSearchParams();

  // ✅ Prevent repeated re-opening
  const lastAutoOpenedIdRef = useRef<number | null>(null);
  const lastAutoOpenedRefRef = useRef<string | null>(null);

  // Filters
  const [fromDateStr, setFromDateStr] = useState<string>("");
  const [toDateStr, setToDateStr] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  const hotelId = useMemo(() => {
    const raw = localStorage.getItem("hotelId");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  }, []);

  const fromDate = useMemo(() => {
    if (!fromDateStr) return null;
    return new Date(`${fromDateStr}T00:00:00`);
  }, [fromDateStr]);

  const toDate = useMemo(() => {
    if (!toDateStr) return null;
    return new Date(`${toDateStr}T23:59:59`);
  }, [toDateStr]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBookingsByHotel(hotelId ?? undefined);

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

  const exportExcel = async () => {
    setExportError(null);
    try {
      setExporting(true);

      // ✅ IMPORTANT: must be ISO, not .toString()
      const fromUtc = fromDateStr
        ? new Date(`${fromDateStr}T00:00:00.000`).toISOString()
        : undefined;

      const toUtc = toDateStr
        ? new Date(`${toDateStr}T23:59:59.999`).toISOString()
        : undefined;

      await exportBookingsExcel({
        hotelId: hotelId ?? undefined,
        fromUtc,
        toUtc,
        status: statusFilter,
      });
    } catch (e: any) {
      setExportError(e?.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    void load();
    const unsubscribe = onBookingsChanged(() => void load());
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [fromDateStr, toDateStr, statusFilter, pageSize]);

  const filteredRows = useMemo(() => {
    const s = (statusFilter || "all").toLowerCase();

    return rows.filter((b) => {
      if (!overlapsDateWindow(b.checkInDateUtc, b.checkOutDateUtc, fromDate, toDate)) return false;

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

  // ---------- dialogs ----------
  const [cancelOpen, setCancelOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeBooking, setActiveBooking] = useState<BookingDto | null>(null);
  const [detailsBooking, setDetailsBooking] = useState<BookingDto | null>(null);

  const [cancelReason, setCancelReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const openCancel = (b: BookingDto) => {
    setActiveBooking(b);
    setCancelReason("");
    setActionError(null);
    setCancelOpen(true);
  };

  const openComplete = (b: BookingDto) => {
    setActiveBooking(b);
    setActionError(null);
    setCompleteOpen(true);
  };

  const openDetails = (b: BookingDto) => {
    setDetailsBooking(b);
    setDetailsOpen(true);
  };

  /**
   * ✅ Auto-open by bookingId
   */
  useEffect(() => {
    const raw = searchParams.get("bookingId");
    const id = raw ? Number(raw) : NaN;

    if (!Number.isFinite(id)) return;
    if (loading) return;
    if (lastAutoOpenedIdRef.current === id) return;

    const found = rows.find((r) => r.bookingId === id);
    if (!found) return;

    openDetails(found);
    lastAutoOpenedIdRef.current = id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, rows, loading]);

  /**
   * ✅ Auto-open by booking ref
   */
  useEffect(() => {
    const rawRef = searchParams.get("ref");
    const ref = normalizeBookingRef(rawRef);

    if (!ref) return;
    if (loading) return;
    if (lastAutoOpenedRefRef.current === ref) return;

    const found = rows.find((r) => normalizeBookingRef(r.confirmationNumber) === ref);
    if (!found) return;

    openDetails(found);
    lastAutoOpenedRefRef.current = ref;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, rows, loading]);

  const doCancel = async () => {
    if (!activeBooking) return;

    const isDone = ["cancelled", "completed"].includes((activeBooking.status || "").toLowerCase());
    if (isDone) return;

    const reason = cancelReason.trim();
    if (!reason) {
      setActionError("Cancellation reason is required.");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      await cancelBooking(activeBooking.bookingId, reason);
      setCancelOpen(false);
      setActiveBooking(null);
      await load();
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to cancel booking");
    } finally {
      setActionLoading(false);
    }
  };

  const doComplete = async () => {
    if (!activeBooking) return;

    const isDone = ["cancelled", "completed"].includes((activeBooking.status || "").toLowerCase());
    if (isDone) return;

    setActionLoading(true);
    setActionError(null);
    try {
      await completeBooking(activeBooking.bookingId);
      setCompleteOpen(false);
      setActiveBooking(null);
      await load();
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to complete booking");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle>Bookings</CardTitle>

            <div className="flex gap-2">
              <Button variant="outline" onClick={load} disabled={loading || exporting}>
                Refresh
              </Button>

              <Button variant="secondary" onClick={exportExcel} disabled={exporting || loading}>
                {exporting ? "Exporting..." : "Export Excel"}
              </Button>
            </div>
          </div>

          {exportError && <div className="text-sm text-red-500">{exportError}</div>}

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
                disabled={loading || exporting}
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
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
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
            <div className="text-sm text-muted-foreground">
              No bookings found for the selected filters.
            </div>
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
                        <div className="text-xs text-muted-foreground">
                          Booking Ref: {formatBookingRef(b.confirmationNumber)}
                        </div>
                      </TableCell>
                      <TableCell>{b.roomNumbers}</TableCell>
                      <TableCell>{toHaitiLocal(b.checkInDateUtc)}</TableCell>
                      <TableCell>{toHaitiLocal(b.checkOutDateUtc)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openDetails(b)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </Button>

                          <Button variant="outline" size="sm" onClick={() => openComplete(b)} disabled={isDone}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Complete
                          </Button>

                          <Button variant="destructive" size="sm" onClick={() => openCancel(b)} disabled={isDone}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ---- Cancel Dialog ---- */}
      <Dialog open={cancelOpen} onOpenChange={(v) => { setCancelOpen(v); if (!v) setActionError(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel booking</DialogTitle>
            <DialogDescription>
              {activeBooking ? (
                <>
                  Booking <span className="font-medium">{formatBookingRef(activeBooking.confirmationNumber)}</span> —{" "}
                  {activeBooking.guestName} (Room(s): {activeBooking.roomNumbers})
                </>
              ) : (
                "Select a booking to cancel."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Cancellation reason (required)</div>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Example: Guest requested cancellation / Payment issue / Schedule change..."
              rows={4}
            />
            {actionError && <div className="text-sm text-red-500">{actionError}</div>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={actionLoading}>
              Close
            </Button>
            <Button variant="destructive" onClick={doCancel} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Complete Dialog ---- */}
      <Dialog open={completeOpen} onOpenChange={(v) => { setCompleteOpen(v); if (!v) setActionError(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete booking</DialogTitle>
            <DialogDescription>
              {activeBooking ? (
                <>
                  Mark booking <span className="font-medium">{formatBookingRef(activeBooking.confirmationNumber)}</span>{" "}
                  as <span className="font-medium">COMPLETED</span>?
                </>
              ) : (
                "Select a booking to complete."
              )}
            </DialogDescription>
          </DialogHeader>

          {actionError && <div className="text-sm text-red-500">{actionError}</div>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)} disabled={actionLoading}>
              Close
            </Button>
            <Button onClick={doComplete} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Details Dialog ---- */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking details</DialogTitle>
            <DialogDescription>
              {detailsBooking ? (
                <>
                  Booking <span className="font-medium">{formatBookingRef(detailsBooking.confirmationNumber)}</span>
                </>
              ) : (
                "Select a booking to view details."
              )}
            </DialogDescription>
          </DialogHeader>

          {detailsBooking && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">Guest</div>
                  <div className="font-medium">{detailsBooking.guestName}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div>
                    <Badge variant={statusVariant(detailsBooking.status)}>{detailsBooking.status}</Badge>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Rooms</div>
                  <div className="font-medium">{detailsBooking.roomNumbers}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Booked by</div>
                  <div className="font-medium">{detailsBooking.userName || "—"}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Check-in</div>
                  <div className="font-medium">{toHaitiLocal(detailsBooking.checkInDateUtc)}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Check-out</div>
                  <div className="font-medium">{toHaitiLocal(detailsBooking.checkOutDateUtc)}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Booking date</div>
                  <div className="font-medium">{toHaitiLocal(detailsBooking.bookingDateUtc)}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Payment method</div>
                  <div className="font-medium">{detailsBooking.paymentMethod || "—"}</div>
                </div>
              </div>

              <div className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">Cancellation</div>
                  <Badge variant={detailsBooking.status.toLowerCase().includes("cancel") ? "destructive" : "outline"}>
                    {detailsBooking.status.toLowerCase().includes("cancel") ? "Cancelled" : "Not cancelled"}
                  </Badge>
                </div>

                {detailsBooking.status.toLowerCase().includes("cancel") ? (
                  <div className="mt-2 space-y-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Reason</div>
                      <div className="font-medium">{detailsBooking.cancellationReason || "—"}</div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Cancelled at</div>
                        <div className="font-medium">
                          {detailsBooking.cancelledAtUtc ? toHaitiLocal(detailsBooking.cancelledAtUtc) : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Cancelled by (user id)</div>
                        <div className="font-medium">{detailsBooking.cancelledByUserId || "—"}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground">This booking has not been cancelled.</div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
