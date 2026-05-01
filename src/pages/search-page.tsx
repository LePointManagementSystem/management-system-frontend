import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, Search, Calendar, Users, BedDouble, UserCog } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import {
  globalSearch,
  type BookingSearchResultDto,
  type RoomSearchResultDto,
  type GuestSearchResultDto,
  type StaffSearchResultDto,
} from "@/services/global-search-service";

import { formatIsoUtcToHaitiShort } from "@/utils/datetime";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const s = (status || "").toLowerCase();
  if (s.includes("confirmed")) return "default";
  if (s.includes("pending")) return "secondary";
  if (s.includes("completed")) return "outline";
  if (s.includes("cancel")) return "destructive";
  return "secondary";
}

export default function SearchPage() {
  const [sp, setSp] = useSearchParams();
  const q = (sp.get("q") || "").trim();

  const [localQ, setLocalQ] = useState(q);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bookings, setBookings] = useState<BookingSearchResultDto[]>([]);
  const [guests, setGuests] = useState<GuestSearchResultDto[]>([]);
  const [rooms, setRooms] = useState<RoomSearchResultDto[]>([]);
  const [staff, setStaff] = useState<StaffSearchResultDto[]>([]);

  const hotelId = useMemo(() => {
    const raw = localStorage.getItem("hotelId");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }, []);

  useEffect(() => {
    setLocalQ(q);
  }, [q]);

  useEffect(() => {
    if (!q || q.length < 2) {
      setBookings([]);
      setGuests([]);
      setRooms([]);
      setStaff([]);
      return;
    }

    let alive = true;
    setLoading(true);
    setError(null);

    globalSearch(q, hotelId, 20)
      .then((r) => {
        if (!alive) return;
        setBookings(r.bookings || []);
        setGuests(r.guests || []);
        setRooms(r.rooms || []);
        setStaff(r.staff || []);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message ?? "Search failed");
        setBookings([]);
        setGuests([]);
        setRooms([]);
        setStaff([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [q, hotelId]);

  const totalFound = bookings.length + guests.length + rooms.length + staff.length;

  const onSubmit = () => {
    const next = localQ.trim();
    if (!next) {
      setSp({});
      return;
    }
    setSp({ q: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold">Search</h2>

        <div className="flex gap-2 w-full md:w-[520px]">
          <div className="relative flex-1">
            <Input
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              placeholder="Search bookings, guests, rooms, staff…"
              className="pl-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit();
              }}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>

          <Button onClick={onSubmit} disabled={loading}>
            Search
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setLocalQ("");
              setSp({});
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {q ? (
          <>
            Showing results for <span className="font-medium text-foreground">"{q}"</span> —{" "}
            <span className="font-medium text-foreground">{totalFound}</span> found
          </>
        ) : (
          <>Type at least 2 characters and press Enter.</>
        )}
      </div>

      <Separator />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching…
        </div>
      )}

      {!loading && error && <div className="text-sm text-red-500">{error}</div>}

      {!loading && q && !error && totalFound === 0 && (
        <div className="text-sm text-muted-foreground">No results found.</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BOOKINGS */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Bookings
            </CardTitle>
            <Link to="/bookings" className="text-xs text-blue-600 hover:underline">
              Open Manage Bookings
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {bookings.length === 0 ? (
              <div className="text-sm text-muted-foreground">No matching bookings.</div>
            ) : (
              bookings.map((b) => (
                <Link
                  key={b.bookingId}
                  to={`/bookings?bookingId=${b.bookingId}`}
                  className="block rounded-md border p-3 hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{b.guestName || "Guest"}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.confirmationNumber || "—"} • Rooms: {b.roomNumbers || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatIsoUtcToHaitiShort(b.checkInDateUtc)} → {formatIsoUtcToHaitiShort(b.checkOutDateUtc)}
                      </div>
                    </div>
                    <Badge variant={statusVariant(b.status)} className="shrink-0">
                      {b.status}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* GUESTS */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Guests
            </CardTitle>
            <Link to="/clients" className="text-xs text-blue-600 hover:underline">
              Open Guests
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {guests.length === 0 ? (
              <div className="text-sm text-muted-foreground">No matching guests.</div>
            ) : (
              guests.map((g) => (
                <Link
                  key={g.guestId}
                  to={`/clients?search=${encodeURIComponent(g.fullName)}`}
                  className="block rounded-md border p-3 hover:bg-muted transition-colors"
                >
                  <div className="font-medium">{g.fullName}</div>
                  <div className="text-xs text-muted-foreground">
                    {g.email || "—"} • CIN: {g.cin || "—"}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* ROOMS */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BedDouble className="h-4 w-4" />
              Rooms
            </CardTitle>
            <Link to="/hotel-management" className="text-xs text-blue-600 hover:underline">
              Open Rooms
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {rooms.length === 0 ? (
              <div className="text-sm text-muted-foreground">No matching rooms.</div>
            ) : (
              rooms.map((r) => (
                <Link
                  key={r.roomId}
                  to="/hotel-management"
                  className="block rounded-md border p-3 hover:bg-muted transition-colors"
                >
                  <div className="font-medium">Room {r.number}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.roomClassName ? `Class: ${r.roomClassName}` : "—"}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* STAFF */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Staff
            </CardTitle>
            <Link to="/staff" className="text-xs text-blue-600 hover:underline">
              Open Staff
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {staff.length === 0 ? (
              <div className="text-sm text-muted-foreground">No matching staff.</div>
            ) : (
              staff.map((s) => (
                <Link
                  key={s.staffId}
                  to={`/staff?search=${encodeURIComponent(s.fullName)}`}
                  className="block rounded-md border p-3 hover:bg-muted transition-colors"
                >
                  <div className="font-medium">{s.fullName}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.role || "—"} • {s.email || "—"}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
