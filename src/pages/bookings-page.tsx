import { useEffect, useMemo, useState } from "react";
import { Loader2, XCircle } from "lucide-react";
import { cancelBooking, fetchBookingsByHotel, type BookingDto } from "@/services/booking-service";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

export default function BookingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BookingDto[]>([]);

  const hotelId = useMemo(() => {
    const raw = localStorage.getItem("hotelId");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBookingsByHotel(hotelId ?? undefined);
      setRows(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load bookings");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCancel = async (b: BookingDto) => {
    const isDone = ["cancelled", "completed"].includes((b.status || "").toLowerCase());
    if (isDone) return;

    const ok = window.confirm(
      `Cancel booking ${b.confirmationNumber} for ${b.guestName} (Room(s): ${b.roomNumbers})?`,
    );
    if (!ok) return;

    try {
      await cancelBooking(b.bookingId);
      setRows((prev) => prev.map((x) => (x.bookingId === b.bookingId ? { ...x, status: "Cancelled" } : x)));
    } catch (e: any) {
      alert(e?.message ?? "Failed to cancel booking");
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Bookings</CardTitle>
        <Button variant="outline" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </CardHeader>

      <CardContent>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading bookings...
          </div>
        )}

        {!loading && error && <div className="text-sm text-red-500">{error}</div>}

        {!loading && !error && rows.length === 0 && (
          <div className="text-sm text-muted-foreground">No bookings found.</div>
        )}

        {!loading && !error && rows.length > 0 && (
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
              {rows.map((b) => {
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
