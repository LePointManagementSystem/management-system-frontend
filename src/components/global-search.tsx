import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { globalSearch, type GlobalSearchResponseDto } from "@/services/global-search-service";

function useDebounced<T>(value: T, delayMs: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return v;
}

function toHaiti(isoUtc: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Port-au-Prince",
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(isoUtc));
  } catch {
    return isoUtc;
  }
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const [q, setQ] = useState("");
  const dq = useDebounced(q, 200);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GlobalSearchResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const hotelId = useMemo(() => {
    const raw = localStorage.getItem("hotelId");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }, []);

  // Ctrl+K / Cmd+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const key = e.key.toLowerCase();
      if ((isMac ? e.metaKey : e.ctrlKey) && key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (key === "escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const query = (dq || "").trim();
    if (query.length < 2) {
      setData(null);
      setError(null);
      return;
    }

    let alive = true;
    setLoading(true);
    setError(null);

    globalSearch(query, hotelId, 6)
      .then((r) => {
        if (!alive) return;
        setData(r);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message ?? "Search failed");
        setData(null);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [dq, open, hotelId]);

  const hasResults =
    (data?.bookings?.length || 0) + (data?.rooms?.length || 0) + (data?.guests?.length || 0) > 0;

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Small input in header (click -> open palette) */}
      <div className="hidden md:flex relative w-[340px]">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          readOnly
          value=""
          placeholder="Search (Ctrl+K)"
          className="pl-9 cursor-pointer"
          onClick={() => setOpen(true)}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[720px] p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='Type: "999", "Larsson", "BK-89BAFB", "Sebastien"...'
                className="pl-9"
              />
            </div>

            <div className="text-xs text-muted-foreground mt-2">
              Press <span className="font-medium">Enter</span> to open full search page •{" "}
              <span className="font-medium">Esc</span> to close
            </div>
          </div>

          <Separator />

          <div className="max-h-[420px] overflow-auto">
            {/* Actions */}
            <div className="p-4">
              <div className="text-xs uppercase text-muted-foreground mb-2">Quick actions</div>
              <div className="space-y-1">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted flex items-center justify-between"
                  onClick={() => go("/room-booking")}
                >
                  <span>Create booking</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted flex items-center justify-between"
                  onClick={() => go("/bookings")}
                >
                  <span>Open manage bookings</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <Separator />

            {/* Results */}
            <div className="p-4">
              {loading && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              )}

              {!loading && error && <div className="text-sm text-red-500">{error}</div>}

              {!loading && !error && !hasResults && (dq || "").trim().length >= 2 && (
                <div className="text-sm text-muted-foreground">No results.</div>
              )}

              {!loading && !error && data && (
                <div className="space-y-5">
                  {/* BOOKINGS */}
                  {data.bookings?.length > 0 && (
                    <div>
                      <div className="text-xs uppercase text-muted-foreground mb-2">Bookings</div>
                      <div className="space-y-1">
                        {data.bookings.map((b) => (
                          <button
                            key={b.bookingId}
                            type="button"
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-muted"
                            onClick={() => go(`/bookings?bookingId=${b.bookingId}`)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {b.guestName || "Booking"} • {b.roomNumbers || "—"}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {toHaiti(b.checkInDateUtc)} → {toHaiti(b.checkOutDateUtc)} • Ref{" "}
                                  {b.confirmationNumber || `#${b.bookingId}`}
                                </div>
                              </div>
                              <Badge variant="outline">{b.status}</Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ROOMS */}
                  {data.rooms?.length > 0 && (
                    <div>
                      <div className="text-xs uppercase text-muted-foreground mb-2">Rooms</div>
                      <div className="space-y-1">
                        {data.rooms.map((r) => (
                          <button
                            key={r.roomId}
                            type="button"
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-muted"
                            onClick={() => go(`/search?q=${encodeURIComponent(r.number)}`)}
                          >
                            <div className="text-sm font-medium">Room {r.number}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {r.roomClassName ? `Class: ${r.roomClassName}` : `RoomClassId: ${r.roomClassId}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GUESTS */}
                  {data.guests?.length > 0 && (
                    <div>
                      <div className="text-xs uppercase text-muted-foreground mb-2">Guests</div>
                      <div className="space-y-1">
                        {data.guests.map((g) => (
                          <button
                            key={g.guestId}
                            type="button"
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-muted"
                            onClick={() => go(`/search?q=${encodeURIComponent(g.fullName)}`)}
                          >
                            <div className="text-sm font-medium">{g.fullName}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {g.cin ? `CIN: ${g.cin}` : null}
                              {g.email ? ` • ${g.email}` : null}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Enter -> full search page */}
          <div className="p-3 border-t bg-muted/30">
            <button
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 rounded-md hover:bg-muted",
                (q || "").trim().length === 0 && "opacity-60 cursor-not-allowed",
              )}
              onClick={() => {
                const query = (q || "").trim();
                if (!query) return;
                go(`/search?q=${encodeURIComponent(query)}`);
              }}
            >
              Search all results for “{(q || "").trim() || "…"}”
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
