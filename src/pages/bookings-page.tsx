import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CalendarRange,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Search,
  X,
  XCircle,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { onBookingsChanged } from "@/utils/events";
import { exportBookingsExcel } from "@/services/reporting-service";
import {
  cancelBooking,
  completeBooking,
  fetchBookingsByHotel,
  type BookingDto,
} from "@/services/booking-service";

// ─── helpers ────────────────────────────────────────────────────────────────

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

function toHaitiDate(isoUtc: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Port-au-Prince",
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(new Date(isoUtc));
  } catch {
    return isoUtc;
  }
}

function formatBookingRef(ref?: string | null): string {
  if (!ref) return "—";
  if (/^BK-\d+$/i.test(ref)) return ref.toUpperCase();
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      ref
    )
  ) {
    return `BK-${ref.slice(0, 6).toUpperCase()}`;
  }
  return ref;
}

function normalizeBookingRef(ref?: string | null): string | null {
  if (!ref) return null;
  const m = ref.match(/\bbk\s*[-\s]?\s*([a-z0-9]{4,})\b/i);
  if (!m?.[1]) return null;
  return `BK-${m[1].toUpperCase()}`;
}

function formatPrice(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCancelledBy(id?: string | null): string {
  if (!id) return "—";
  // Avoid exposing raw GUIDs in the UI
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id)) return "Staff member";
  return id;
}

function overlapsDateWindow(
  checkInIso: string,
  checkOutIso: string,
  from?: Date | null,
  to?: Date | null
): boolean {
  const checkIn = new Date(checkInIso);
  const checkOut = new Date(checkOutIso);
  if (from && checkOut < from) return false;
  if (to && checkIn > to) return false;
  return true;
}

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  if (s.includes("confirmed"))
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
        Confirmed
      </Badge>
    );
  if (s.includes("pending"))
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
        Pending
      </Badge>
    );
  if (s.includes("completed"))
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
        Completed
      </Badge>
    );
  if (s.includes("cancel"))
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
        Cancelled
      </Badge>
    );
  return <Badge variant="secondary">{status || "Unknown"}</Badge>;
}

// ─── Detail field ─────────────────────────────────────────────────────────────

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="font-medium text-sm">{value ?? "—"}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50] as const;

type DialogMode = "cancel" | "complete" | "details" | null;

export default function BookingsPage() {
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<BookingDto[]>([]);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [searchText, setSearchText] = useState("");
  const [fromDateStr, setFromDateStr] = useState("");
  const [toDateStr, setToDateStr] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);

  // Dialog state
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [activeBooking, setActiveBooking] = useState<BookingDto | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Auto-open guards
  const lastAutoOpenedIdRef = useRef<number | null>(null);
  const lastAutoOpenedRefRef = useRef<string | null>(null);

  const hotelId = useMemo(() => {
    const raw = localStorage.getItem("hotelId");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  }, []);

  const fromDate = useMemo(
    () => (fromDateStr ? new Date(`${fromDateStr}T00:00:00`) : null),
    [fromDateStr]
  );
  const toDate = useMemo(
    () => (toDateStr ? new Date(`${toDateStr}T23:59:59`) : null),
    [toDateStr]
  );

  // ── Data loading ─────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    setPageError(null);
    try {
      const data = await fetchBookingsByHotel(hotelId ?? undefined);
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.checkInDateUtc).getTime() -
          new Date(a.checkInDateUtc).getTime()
      );
      setRows(sorted);
    } catch (err: unknown) {
      setPageError(
        err instanceof Error ? err.message : "Failed to load bookings."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const unsubscribe = onBookingsChanged(() => void load());
    return unsubscribe;
  }, []); // intentional: load once on mount, re-fires via event bus

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [searchText, fromDateStr, toDateStr, statusFilter, pageSize]);

  // ── Auto-open by URL param ─────────────────────────────────────────────

  useEffect(() => {
    if (loading) return;
    const rawId = searchParams.get("bookingId");
    const id = rawId ? Number(rawId) : NaN;
    if (!Number.isFinite(id)) return;
    if (lastAutoOpenedIdRef.current === id) return;
    const found = rows.find((r) => r.bookingId === id);
    if (!found) return;
    openDetails(found);
    lastAutoOpenedIdRef.current = id;
  }, [searchParams, rows, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loading) return;
    const rawRef = searchParams.get("ref");
    const ref = normalizeBookingRef(rawRef);
    if (!ref) return;
    if (lastAutoOpenedRefRef.current === ref) return;
    const found = rows.find(
      (r) => normalizeBookingRef(r.confirmationNumber) === ref
    );
    if (!found) return;
    openDetails(found);
    lastAutoOpenedRefRef.current = ref;
  }, [searchParams, rows, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtering ────────────────────────────────────────────────────────────

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const s = statusFilter.toLowerCase();

    return rows.filter((b) => {
      if (
        !overlapsDateWindow(b.checkInDateUtc, b.checkOutDateUtc, fromDate, toDate)
      )
        return false;

      const bs = (b.status || "").toLowerCase();
      if (s === "pending" && !bs.includes("pending")) return false;
      if (s === "confirmed" && !bs.includes("confirmed")) return false;
      if (s === "cancelled" && !bs.includes("cancel")) return false;
      if (s === "completed" && !bs.includes("completed")) return false;

      if (q) {
        const guestLower = b.guestName.toLowerCase();
        const refLower = formatBookingRef(b.confirmationNumber).toLowerCase();
        const roomLower = b.roomNumbers.toLowerCase();
        const userLower = (b.userName || "").toLowerCase();
        if (
          !guestLower.includes(q) &&
          !refLower.includes(q) &&
          !roomLower.includes(q) &&
          !userLower.includes(q)
        )
          return false;
      }

      return true;
    });
  }, [rows, fromDate, toDate, statusFilter, searchText]);

  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  // ── Success banner ────────────────────────────────────────────────────────

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 6000);
  }

  // ── Dialog helpers ────────────────────────────────────────────────────────

  function closeDialog() {
    setDialogMode(null);
    setActionError(null);
    setCancelReason("");
  }

  function openDetails(b: BookingDto) {
    setActiveBooking(b);
    setActionError(null);
    setDialogMode("details");
  }

  function openCancel(b: BookingDto) {
    setActiveBooking(b);
    setCancelReason("");
    setActionError(null);
    setDialogMode("cancel");
  }

  function openComplete(b: BookingDto) {
    setActiveBooking(b);
    setActionError(null);
    setDialogMode("complete");
  }

  // Transition from Details → Cancel or Complete without intermediate close
  function openCancelFromDetails() {
    setActionError(null);
    setCancelReason("");
    setDialogMode("cancel");
  }

  function openCompleteFromDetails() {
    setActionError(null);
    setDialogMode("complete");
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  const doCancel = async () => {
    if (!activeBooking) return;
    const reason = cancelReason.trim();
    if (!reason) {
      setActionError("A cancellation reason is required.");
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      await cancelBooking(activeBooking.bookingId, reason);
      await load();
      closeDialog();
      showSuccess(
        `Booking ${formatBookingRef(activeBooking.confirmationNumber)} has been cancelled.`
      );
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Failed to cancel booking."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const doComplete = async () => {
    if (!activeBooking) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await completeBooking(activeBooking.bookingId);
      await load();
      closeDialog();
      showSuccess(
        `Booking ${formatBookingRef(activeBooking.confirmationNumber)} has been marked as completed.`
      );
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Failed to complete booking."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const doExport = async () => {
    setExportError(null);
    setExporting(true);
    try {
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
    } catch (err: unknown) {
      setExportError(
        err instanceof Error ? err.message : "Export failed. Please try again."
      );
    } finally {
      setExporting(false);
    }
  };

  // ── Derived helpers for rows ──────────────────────────────────────────────

  function isTerminal(b: BookingDto): boolean {
    const s = (b.status || "").toLowerCase();
    return s.includes("cancel") || s.includes("completed");
  }

  function isCancelled(b: BookingDto): boolean {
    return (b.status || "").toLowerCase().includes("cancel");
  }

  function isCompleted(b: BookingDto): boolean {
    return (b.status || "").toLowerCase().includes("completed");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Booking Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading
              ? "Loading…"
              : `${rows.length} booking${rows.length !== 1 ? "s" : ""} total`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={doExport}
            disabled={exporting || loading}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CalendarRange className="mr-2 h-4 w-4" />
            )}
            {exporting ? "Exporting…" : "Export Excel"}
          </Button>
        </div>
      </div>

      {/* ── Success banner ── */}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Page error ── */}
      {pageError && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      {/* ── Export error ── */}
      {exportError && (
        <Alert variant="destructive">
          <AlertTitle>Export Failed</AlertTitle>
          <AlertDescription>{exportError}</AlertDescription>
        </Alert>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:flex-wrap">
        {/* Text search */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <div className="relative w-full md:w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Guest, ref, room…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Check-in from */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Check-in from</Label>
          <Input
            type="date"
            value={fromDateStr}
            onChange={(e) => setFromDateStr(e.target.value)}
            className="w-[160px]"
          />
        </div>

        {/* Check-in to */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Check-in to</Label>
          <Input
            type="date"
            value={toDateStr}
            onChange={(e) => setToDateStr(e.target.value)}
            className="w-[160px]"
          />
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear filters */}
        {(searchText || fromDateStr || toDateStr || statusFilter !== "all") && (
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-transparent select-none">
              &nbsp;
            </Label>
            <Button
              variant="outline"
              onClick={() => {
                setSearchText("");
                setFromDateStr("");
                setToDateStr("");
                setStatusFilter("all");
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* ── Pagination controls (top) ── */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {loading ? (
            "Loading…"
          ) : (
            <>
              Showing{" "}
              <span className="font-medium text-foreground">
                {pagedRows.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {totalFiltered}
              </span>{" "}
              booking{totalFiltered !== 1 ? "s" : ""}
            </>
          )}
        </span>

        <div className="flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={(v) => setPageSize(Number(v))}
          >
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} per page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-xs tabular-nums">
            {safePage} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Guest</TableHead>
              <TableHead className="font-semibold">Room(s)</TableHead>
              <TableHead className="font-semibold">Stay</TableHead>
              <TableHead className="font-semibold text-right">Price</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Loading bookings…
                  </p>
                </TableCell>
              </TableRow>
            ) : pagedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <CalendarRange className="mx-auto h-8 w-8 text-muted-foreground opacity-40" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {searchText ||
                    fromDateStr ||
                    toDateStr ||
                    statusFilter !== "all"
                      ? "No bookings match your filters."
                      : "No bookings found."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              pagedRows.map((b) => {
                const terminal = isTerminal(b);
                const hasDiscount =
                  b.afterDiscountedPrice !== null &&
                  b.afterDiscountedPrice !== undefined &&
                  b.afterDiscountedPrice !== b.totalPrice;

                return (
                  <TableRow key={b.bookingId} className="hover:bg-muted/40">
                    {/* Guest */}
                    <TableCell>
                      <div className="font-medium">{b.guestName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatBookingRef(b.confirmationNumber)}
                      </div>
                    </TableCell>

                    {/* Room(s) */}
                    <TableCell className="text-sm">{b.roomNumbers}</TableCell>

                    {/* Stay */}
                    <TableCell className="text-sm">
                      <div>{toHaitiDate(b.checkInDateUtc)}</div>
                      <div className="text-muted-foreground text-xs">
                        → {toHaitiDate(b.checkOutDateUtc)}
                      </div>
                    </TableCell>

                    {/* Price */}
                    <TableCell className="text-right text-sm">
                      {hasDiscount ? (
                        <>
                          <div className="font-medium">
                            {formatPrice(b.afterDiscountedPrice!)}
                          </div>
                          <div className="text-xs text-muted-foreground line-through">
                            {formatPrice(b.totalPrice)}
                          </div>
                        </>
                      ) : (
                        <div className="font-medium">
                          {formatPrice(b.totalPrice)}
                        </div>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View booking details"
                          onClick={() => openDetails(b)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          title="Mark as completed"
                          onClick={() => openComplete(b)}
                          disabled={terminal}
                          className={
                            terminal
                              ? "opacity-30"
                              : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          }
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          title="Cancel booking"
                          onClick={() => openCancel(b)}
                          disabled={terminal}
                          className={
                            terminal
                              ? "opacity-30"
                              : "text-destructive hover:text-destructive hover:bg-destructive/10"
                          }
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination (bottom) ── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="tabular-nums">
            Page {safePage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* ════════════ DETAILS DIALOG ════════════ */}
      <Dialog
        open={dialogMode === "details"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      >
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              {activeBooking
                ? `Reference: ${formatBookingRef(activeBooking.confirmationNumber)}`
                : "Booking information"}
            </DialogDescription>
          </DialogHeader>

          {activeBooking && (
            <div className="space-y-4 text-sm">
              {/* Core info grid */}
              <div className="grid grid-cols-2 gap-3">
                <DetailField label="Guest" value={activeBooking.guestName} />
                <DetailField
                  label="Status"
                  value={<StatusBadge status={activeBooking.status} />}
                />
                <DetailField
                  label="CIN (National ID)"
                  value={activeBooking.guestCin || "—"}
                />
                <DetailField
                  label="Room(s)"
                  value={activeBooking.roomNumbers}
                />
                <DetailField
                  label="Check-in"
                  value={toHaitiLocal(activeBooking.checkInDateUtc)}
                />
                <DetailField
                  label="Check-out"
                  value={toHaitiLocal(activeBooking.checkOutDateUtc)}
                />
                {activeBooking.durationType && (
                  <DetailField
                    label="Duration Type"
                    value={activeBooking.durationType}
                  />
                )}
                <DetailField
                  label="Booked by (receptionist)"
                  value={activeBooking.userName || "—"}
                />
                <DetailField
                  label="Booking Date"
                  value={toHaitiLocal(activeBooking.bookingDateUtc)}
                />
                <DetailField
                  label="Payment Method"
                  value={activeBooking.paymentMethod || "—"}
                />
              </div>

              {/* Pricing */}
              <div className="rounded-md border p-3 space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Pricing
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total price</span>
                  <span className="font-semibold">
                    {formatPrice(activeBooking.totalPrice)}
                  </span>
                </div>
                {activeBooking.afterDiscountedPrice !== null &&
                  activeBooking.afterDiscountedPrice !== undefined &&
                  activeBooking.afterDiscountedPrice !==
                    activeBooking.totalPrice && (
                    <div className="flex items-center justify-between text-green-700">
                      <span>After discount</span>
                      <span className="font-semibold">
                        {formatPrice(activeBooking.afterDiscountedPrice)}
                      </span>
                    </div>
                  )}
              </div>

              {/* Cancellation section */}
              {isCancelled(activeBooking) && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-2">
                  <p className="text-xs text-red-600 font-medium uppercase tracking-wide">
                    Cancellation
                  </p>
                  <DetailField
                    label="Reason"
                    value={activeBooking.cancellationReason || "—"}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <DetailField
                      label="Cancelled at"
                      value={
                        activeBooking.cancelledAtUtc
                          ? toHaitiLocal(activeBooking.cancelledAtUtc)
                          : "—"
                      }
                    />
                    <DetailField
                      label="Cancelled by"
                      value={formatCancelledBy(activeBooking.cancelledByUserId)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={closeDialog}>
              Close
            </Button>
            {activeBooking && !isTerminal(activeBooking) && (
              <>
                <Button
                  variant="outline"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  onClick={openCompleteFromDetails}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as Completed
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive border-red-200 hover:bg-red-50 hover:text-destructive"
                  onClick={openCancelFromDetails}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Booking
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════ COMPLETE DIALOG ════════════ */}
      <Dialog
        open={dialogMode === "complete"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Mark Booking as Completed</DialogTitle>
            <DialogDescription>
              {activeBooking ? (
                <>
                  Confirm that booking{" "}
                  <span className="font-semibold">
                    {formatBookingRef(activeBooking.confirmationNumber)}
                  </span>{" "}
                  for <span className="font-semibold">{activeBooking.guestName}</span> has been
                  completed. This action cannot be undone.
                </>
              ) : (
                "Confirm booking completion."
              )}
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={doComplete}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {actionLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Completion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════ CANCEL DIALOG ════════════ */}
      <Dialog
        open={dialogMode === "cancel"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              {activeBooking ? (
                <>
                  You are about to cancel booking{" "}
                  <span className="font-semibold">
                    {formatBookingRef(activeBooking.confirmationNumber)}
                  </span>{" "}
                  — <span className="font-semibold">{activeBooking.guestName}</span> (Room
                  {activeBooking.roomNumbers.includes(",") ? "s" : ""}{" "}
                  {activeBooking.roomNumbers}). Please provide a reason.
                </>
              ) : (
                "Provide a cancellation reason."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Guest requested cancellation, payment issue, schedule change…"
              rows={4}
            />
          </div>

          {actionError && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={actionLoading}
            >
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={doCancel}
              disabled={actionLoading}
            >
              {actionLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
