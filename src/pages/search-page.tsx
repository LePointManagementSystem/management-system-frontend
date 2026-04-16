import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, Search, Calendar, Users, BedDouble, UserCog } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { fetchBookingsByHotel, type BookingDto } from "@/services/booking-service";
import { fetchGuest } from "@/services/client-service";
import { fetchStaff } from "@/services/staff-service";
import { getRoomsByHotelId } from "@/services/room-service";

import type { Guest } from "@/types/client";
import type { Staff } from "@/types/staff";
import type { Room } from "@/types/hotel";

import { formatIsoUtcToHaitiShort } from "@/utils/datetime";

function includesText(haystack: any, needle: string) {
  if (!needle) return true;
  if (haystack === null || haystack === undefined) return false;
  return String(haystack).toLowerCase().includes(needle.toLowerCase().trim());
}

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

  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);

  const hotelId = useMemo(() => {
    const raw = localStorage.getItem("hotelId");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  }, []);

  useEffect(() => {
    setLocalQ(q);
  }, [q]);

  useEffect(() => {
    const run = async () => {
      if (!q) {
        setBookings([]);
        setGuests([]);
        setRooms([]);
        setStaff([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // ⚠️ Pas besoin d’un endpoint “search”.
        // On charge les listes existantes et on filtre côté frontend.
        const [b, g, s, r] = await Promise.all([
          fetchBookingsByHotel(hotelId ?? undefined).catch(() => [] as BookingDto[]),
          fetchGuest().catch(() => [] as Guest[]),
          fetchStaff().catch(() => [] as Staff[]),
          hotelId ? getRoomsByHotelId(hotelId).catch(() => [] as Room[]) : Promise.resolve([] as Room[]),
        ]);

        setBookings(b || []);
        setGuests(g || []);
        setStaff(s || []);
        setRooms(r || []);
      } catch (e: any) {
        setError(e?.message ?? "Search failed");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [q, hotelId]);

  const filteredBookings = useMemo(() => {
    if (!q) return [];
    const needle = q.toLowerCase();

    return bookings
      .filter((b) => {
        return (
          includesText(b.guestName, needle) ||
          includesText(b.confirmationNumber, needle) ||
          includesText(b.roomNumbers, needle) ||
          includesText(b.status, needle) ||
          includesText(b.userName, needle)
        );
      })
      .slice(0, 10);
  }, [q, bookings]);

  const filteredGuests = useMemo(() => {
    if (!q) return [];
    const needle = q.toLowerCase();

    return guests
      .filter((g) => {
        return (
          includesText(g.firstName, needle) ||
          includesText(g.lastName, needle) ||
          includesText(g.email, needle) ||
          includesText((g as any).cin, needle) ||
          includesText((g as any).CIN, needle)
        );
      })
      .slice(0, 10);
  }, [q, guests]);

  const filteredRooms = useMemo(() => {
    if (!q) return [];
    const needle = q.toLowerCase();

    return rooms
      .filter((r) => {
        return (
          includesText(r.number, needle) ||
          includesText((r as any).roomClassName, needle) ||
          includesText((r as any).roomClassId, needle)
        );
      })
      .slice(0, 10);
  }, [q, rooms]);

  const filteredStaff = useMemo(() => {
    if (!q) return [];
    const needle = q.toLowerCase();

    return staff
      .filter((s) => {
        return (
          includesText(s.firstName, needle) ||
          includesText(s.lastName, needle) ||
          includesText(s.email, needle) ||
          includesText(s.role, needle)
        );
      })
      .slice(0, 10);
  }, [q, staff]);

  const totalFound =
    filteredBookings.length + filteredGuests.length + filteredRooms.length + filteredStaff.length;

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
            Showing results for <span className="font-medium text-foreground">“{q}”</span> —{" "}
            <span className="font-medium text-foreground">{totalFound}</span> found
          </>
        ) : (
          <>Type a keyword and press Enter.</>
        )}
      </div>

      <Separator />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching...
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
            {filteredBookings.length === 0 ? (
              <div className="text-sm text-muted-foreground">No matching bookings.</div>
            ) : (
              filteredBookings.map((b) => (
                <div key={b.bookingId} className="rounded-md border p-3">
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
                </div>
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
            {filteredGuests.length === 0 ? (
              <div className="text-sm text-muted-foreground">No matching guests.</div>
            ) : (
              filteredGuests.map((g: any) => (
                <div key={g.id} className="rounded-md border p-3">
                  <div className="font-medium">
                    {(g.firstName || "").trim()} {(g.lastName || "").trim()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {g.email || "—"} • CIN: {g.cin || g.CIN || "—"}
                  </div>
                </div>
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
            {filteredRooms.length === 0 ? (
              <div className="text-sm text-muted-foreground">No matching rooms.</div>
            ) : (
              filteredRooms.map((r: any) => (
                <div key={r.roomID ?? r.roomId ?? r.id ?? r.number} className="rounded-md border p-3">
                  <div className="font-medium">Room {r.number}</div>
                  <div className="text-xs text-muted-foreground">
                    Adults: {r.adultsCapacity ?? "—"} • Children: {r.childrenCapacity ?? "—"} • Price:{" "}
                    {r.pricePerNight ?? "—"}
                  </div>
                </div>
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
            {filteredStaff.length === 0 ? (
              <div className="text-sm text-muted-foreground">No matching staff.</div>
            ) : (
              filteredStaff.map((s) => (
                <div key={s.id} className="rounded-md border p-3">
                  <div className="font-medium">
                    {(s.firstName || "").trim()} {(s.lastName || "").trim()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.role || "—"} • {s.email || "—"}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
