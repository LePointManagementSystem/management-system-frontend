import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

import {
  cashTypeLabel,
  currencyLabel,
  createCashTransaction,
  fetchCashTransactions,
  getOptionalHotelId,
  shiftLabel,
  type CashShift,
  type CashTransactionDto,
  type CashTransactionType,
  type CurrencyCode,
} from "@/services/cash-transactions-service";

import {
  closeCashSession,
  listCashSessions,
  openCashSession,
  type CashSessionDto,
} from "@/services/cash-sessions-service";

import { API_BASE_URL } from "@/config/api-base";
import type { Hotel } from "@/types/hotel";

function bookingIdFromReference(ref?: string | null): number | null {
  if (!ref) return null;
  const m1 = ref.match(/booking\s*#\s*(\d+)/i);
  if (m1?.[1]) return Number(m1[1]);
  const m2 = ref.match(/\bbk[-\s]?(\d+)\b/i);
  if (m2?.[1]) return Number(m2[1]);
  return null;
}

function toUtcIso(dateStr: string, endOfDay: boolean): string {
  const dt = new Date(`${dateStr}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return dt.toISOString();
}

function formatLocal(dtUtc: string): string {
  const d = new Date(dtUtc);
  if (Number.isNaN(d.getTime())) return dtUtc;
  return d.toLocaleString();
}

type CreateFormState = {
  type: CashTransactionType;
  currency: CurrencyCode;
  shift: CashShift;
  amount: string;
  note: string;
  category: string;
  reference: string;
  bookingIdInput: string;
  hotelIdInput: string;
};

const DEFAULT_FORM: CreateFormState = {
  type: 2,
  currency: 1,
  shift: 1,
  amount: "",
  note: "",
  category: "",
  reference: "",
  bookingIdInput: "",
  hotelIdInput: "",
};

async function fetchHotelsForAdmin(): Promise<Hotel[]> {
  const token = localStorage.getItem("token") || "";

  const qs = new URLSearchParams();
  qs.set("name", " ");
  qs.set("desc", " ");
  qs.set("pageSize", "200");
  qs.set("pageNumber", "1");

  const res = await fetch(`${API_BASE_URL}/Hotel/search?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(json?.message || json?.Message || text || `Failed to load hotels (${res.status})`);
  }

  const payload = json?.data ?? json?.Data ?? json;
  const list = Array.isArray(payload) ? payload : [];

  return list
    .map((h: any) => ({
      id: Number(h?.hotelId ?? h?.HotelId ?? h?.id ?? h?.Id),
      name: String(h?.name ?? h?.Name ?? "Unnamed Hotel"),
      starRating: h?.starRating ?? h?.StarRating ?? 0,
      description: h?.description ?? h?.Description ?? "",
      phoneNumber: h?.phoneNumber ?? h?.PhoneNumber ?? "",
      ownerName: h?.ownerName ?? h?.OwnerName ?? "",
      ownerID: h?.ownerID ?? h?.ownerId ?? h?.OwnerId,
    }))
    .filter((h: Hotel) => Number.isFinite(h.id) && h.id > 0);
}

export default function CashTransactionsPage() {
  const scopedHotelId = getOptionalHotelId(); // staff usually has it
  const isAdminLike = !scopedHotelId;

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [hotelsError, setHotelsError] = useState<string | null>(null);
  const [selectedHotelId, setSelectedHotelId] = useState<string>(scopedHotelId ? String(scopedHotelId) : "");

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | CashTransactionType>("all");
  const [currencyFilter, setCurrencyFilter] = useState<"all" | CurrencyCode>("all");
  const [shiftFilter, setShiftFilter] = useState<"all" | CashShift>("all");

  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<CashSessionDto | null>(null);
  const [openBalanceInput, setOpenBalanceInput] = useState<string>("");
  const [closeCountedInput, setCloseCountedInput] = useState<string>("");
  const [isOpenShiftDialogOpen, setIsOpenShiftDialogOpen] = useState(false);
  const [isClosedShiftDialogOpen, setIsCloseShiftDialogOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CashTransactionDto[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateFormState>({
    ...DEFAULT_FORM,
    hotelIdInput: scopedHotelId ? String(scopedHotelId) : "",
  });

  const effectiveHotelId = useMemo(() => {
    if (scopedHotelId && scopedHotelId > 0) return scopedHotelId;
    const n = Number(selectedHotelId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [scopedHotelId, selectedHotelId]);

  // ✅ Load hotels for Admin
  useEffect(() => {
    if (!isAdminLike) return;

    const run = async () => {
      try {
        setHotelsLoading(true);
        setHotelsError(null);
        const list = await fetchHotelsForAdmin();
        setHotels(list);

        if ((!selectedHotelId || Number(selectedHotelId) <= 0) && list.length > 0) {
          setSelectedHotelId(String(list[0].id));
        }
      } catch (e: any) {
        setHotels([]);
        setHotelsError(e?.message || "Failed to load hotels.");
      } finally {
        setHotelsLoading(false);
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminLike]);

  const load = async () => {
    if (!effectiveHotelId) {
      setRows([]);
      setError("Please select a Hotel first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fromUtc = fromDate ? toUtcIso(fromDate, false) : undefined;
      const toUtc = toDate ? toUtcIso(toDate, true) : undefined;

      const list = await fetchCashTransactions({
        hotelId: effectiveHotelId,
        fromUtc,
        toUtc,
        type: typeFilter === "all" ? undefined : typeFilter,
        currency: currencyFilter === "all" ? undefined : currencyFilter,
        shift: shiftFilter === "all" ? undefined : shiftFilter,
        page: 1,
        pageSize: 200,
      });

      setRows(list);
    } catch (e: any) {
      setRows([]);
      setError(e?.message || "Failed to load cash transactions.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ IMPORTANT:
   * - On cherche d'abord la session OUVERTE du hotel (sans filtrer currency/shift)
   * - Si elle existe: activeSession = openOne + sync des selects
   * - Ça évite le blocage "shift ouvert mais je ne peux plus le fermer"
   */
  const loadActiveSession = async () => {
    if (!effectiveHotelId) {
      setActiveSession(null);
      return;
    }

    try {
      setSessionLoading(true);
      setSessionError(null);

      const now = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);

      const result = await listCashSessions({
        hotelId: effectiveHotelId,
        fromUtc: from.toISOString(),
        toUtc: now.toISOString(),
        page: 1,
        pageSize: 200,
        // ✅ PAS de currency/shift ici
      });

      const openOne = (result.items || []).find((s) => !s.closedAtUtc);

      if (openOne) {
        setActiveSession(openOne);
        // ✅ lock UI sur la session ouverte
        setForm((prev) => ({
          ...prev,
          currency: openOne.currency,
          shift: openOne.shift,
        }));
      } else {
        setActiveSession(null);
      }
    } catch (e: any) {
      setActiveSession(null);
      setSessionError(e?.message || "Failed to load shift session.");
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveHotelId]);

  // ✅ ne dépend QUE du hotel
  useEffect(() => {
    void loadActiveSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveHotelId]);

  const totals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const r of rows) {
      if (r.type === 1) totalIn += r.amount;
      if (r.type === 2) totalOut += r.amount;
    }
    return { totalIn, totalOut, net: totalIn - totalOut };
  }, [rows]);

  const sessionExpected = useMemo(() => {
    if (!activeSession) return null;
    return activeSession.expected ?? activeSession.openingBalance ?? 0;
  }, [activeSession]);

  const openCreate = (type: CashTransactionType) => {
    setCreateError(null);
    setForm((s) => ({
      ...DEFAULT_FORM,
      type,
      hotelIdInput: effectiveHotelId ? String(effectiveHotelId) : s.hotelIdInput,
      currency: activeSession?.currency ?? s.currency,
      shift: activeSession?.shift ?? s.shift,
    }));
    setIsCreateOpen(true);
  };

  const submitCreate = async () => {
    const hid = effectiveHotelId;
    if (!hid) {
      setCreateError("Please select a Hotel first.");
      return;
    }
    if (!activeSession || activeSession.closedAtUtc) {
      setCreateError("Please open a shift before creating cash transactions.");
      return;
    }

    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setCreateError("Amount must be a positive number.");
      return;
    }

    const note = form.note.trim();
    if (form.type === 2 && !note) {
      setCreateError("Note is required for Cash OUT.");
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      await createCashTransaction({
        hotelId: hid,
        cashSessionId: activeSession.cashSessionId,
        type: form.type,
        currency: activeSession.currency,
        shift: activeSession.shift,
        amount: amt,
        note,
        category: form.category.trim() || null,
        reference: form.reference.trim() || null,
      });

      setIsCreateOpen(false);
      await load();
      await loadActiveSession();
    } catch (e: any) {
      setCreateError(e?.message || "Failed to create cash transaction.");
    } finally {
      setCreateLoading(false);
    }
  };

  const submitOpenShift = async () => {
    if (!effectiveHotelId) {
      setSessionError("Please select a Hotel first.");
      return;
    }
    if (activeSession && !activeSession.closedAtUtc) {
      setSessionError("A shift is already open. Close it first.");
      return;
    }

    const opening = Number(openBalanceInput);
    if (!Number.isFinite(opening) || opening < 0) {
      setSessionError("Opening balance must be a valid number >= 0.");
      return;
    }

    try {
      setSessionLoading(true);
      setSessionError(null);

      const opened = await openCashSession({
        hotelId: effectiveHotelId,
        currency: form.currency,
        shift: form.shift,
        openingBalance: opening,
      });

      setActiveSession(opened);
      setIsOpenShiftDialogOpen(false);
      setOpenBalanceInput("");

      // verrouille selects sur la session ouverte
      setForm((prev) => ({
        ...prev,
        currency: opened.currency,
        shift: opened.shift,
      }));

      await load();
    } catch (e: any) {
      setSessionError(e?.message || "Failed to open shift.");
    } finally {
      setSessionLoading(false);
    }
  };

  const submitCloseShift = async () => {
    if (!activeSession || activeSession.closedAtUtc) {
      setSessionError("No open shift to close.");
      return;
    }

    const counted = Number(closeCountedInput);
    if (!Number.isFinite(counted) || counted < 0) {
      setSessionError("Counted cash must be a valid number >= 0.");
      return;
    }

    try {
      setSessionLoading(true);
      setSessionError(null);

      const closed = await closeCashSession({
        cashSessionId: activeSession.cashSessionId,
        closingCounted: counted,
      });

      setActiveSession(closed); // reste visible comme "Closed"
      setIsCloseShiftDialogOpen(false);
      setCloseCountedInput("");

      await load();
      // (optionnel) si tu veux revenir à null après fermeture:
      // await loadActiveSession();
    } catch (e: any) {
      setSessionError(e?.message || "Failed to close shift.");
    } finally {
      setSessionLoading(false);
    }
  };

  const canCreateTransactions = !!activeSession && !activeSession.closedAtUtc;
  const lockShiftSelectors = !!activeSession && !activeSession.closedAtUtc; // ✅ clé du fix

  return (
    <div className="space-y-6">
      {isAdminLike ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Hotel</CardTitle>
          </CardHeader>
          <CardContent>
            {hotelsError ? <div className="text-sm text-red-600">{hotelsError}</div> : null}
            <div className="max-w-[420px] space-y-2">
              <Label>Hotel</Label>
              <Select value={selectedHotelId} onValueChange={setSelectedHotelId} disabled={hotelsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={hotelsLoading ? "Loading..." : "Select a hotel"} />
                </SelectTrigger>
                <SelectContent>
                  {hotels.map((h) => (
                    <SelectItem key={h.id} value={String(h.id)}>
                      {h.name} (#{h.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="text-xs text-muted-foreground">
                Admin sees Petty Cash per hotel. Choose a hotel to view its cash sessions and movements.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* CASH SESSION CARD */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cash Session (Shift)</CardTitle>

          <div className="flex flex-wrap gap-2">
            <div className="w-[140px]">
              <Select
                value={String(form.shift)}
                onValueChange={(v) => setForm((s) => ({ ...s, shift: Number(v) as CashShift }))}
                disabled={!!activeSession && !activeSession.closedAtUtc}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Morning</SelectItem>
                  <SelectItem value="2">Afternoon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[120px]">
              <Select
                value={String(form.currency)}
                onValueChange={(v) => setForm((s) => ({ ...s, currency: Number(v) as CurrencyCode }))}
                disabled={!!activeSession && !activeSession.closedAtUtc}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">HTG</SelectItem>
                  <SelectItem value="2">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!activeSession ? (
              <Button
                onClick={() => { setSessionError(null); setIsOpenShiftDialogOpen(true); }}
                disabled={sessionLoading || !effectiveHotelId}
              >
                Open Shift
              </Button>
            ) : activeSession.closedAtUtc ? (
              <Button variant="outline" onClick={loadActiveSession} disabled={sessionLoading}>
                Refresh
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => { setSessionError(null); setIsCloseShiftDialogOpen(true); }}
                disabled={sessionLoading}
              >
                Close Shift
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {!effectiveHotelId ? (
            <div className="text-sm text-muted-foreground">
              {isAdminLike ? "Select a Hotel first." : "No hotel scope found. Please log in again."}
            </div>
          ) : sessionError ? (
            <div className="text-sm text-red-600">{sessionError}</div>
          ) : sessionLoading ? (
            <div className="text-sm text-muted-foreground">Loading session...</div>
          ) : !activeSession ? (
            <div className="text-sm text-muted-foreground">
              No active shift session found for {shiftLabel(form.shift)} / {currencyLabel(form.currency)}.
              Open a shift to start recording cash movements.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="text-lg font-semibold">{activeSession.closedAtUtc ? "Closed" : "Active"}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {shiftLabel(activeSession.shift)} • {currencyLabel(activeSession.currency)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Opening Balance</div>
                  <div className="text-2xl font-semibold">{(activeSession.openingBalance ?? 0).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Opened: {activeSession.openedAtUtc ? formatLocal(activeSession.openedAtUtc) : "—"}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Expected Balance</div>
                  <div className="text-2xl font-semibold">{(sessionExpected ?? 0).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Computed by server</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Counted / Difference</div>
                  <div className="text-2xl font-semibold">{(activeSession.closingCounted ?? 0).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {activeSession.closedAtUtc
                      ? `Difference: ${(activeSession.difference ?? 0).toFixed(2)}`
                      : "Close shift to enter counted cash"}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PETTY CASH CARD */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Petty Cash</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openCreate(1)} disabled={!canCreateTransactions}>
              New IN
            </Button>
            <Button onClick={() => openCreate(2)} disabled={!canCreateTransactions}>
              New OUT
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
              <div className="space-y-2">
                <Label>From</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>To</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={typeFilter === "all" ? "all" : String(typeFilter)}
                  onValueChange={(v) => setTypeFilter(v === "all" ? "all" : (Number(v) as CashTransactionType))}
                >
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="1">IN</SelectItem>
                    <SelectItem value="2">OUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={currencyFilter === "all" ? "all" : String(currencyFilter)}
                  onValueChange={(v) => setCurrencyFilter(v === "all" ? "all" : (Number(v) as CurrencyCode))}
                >
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="1">HTG</SelectItem>
                    <SelectItem value="2">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Shift</Label>
                <Select
                  value={shiftFilter === "all" ? "all" : String(shiftFilter)}
                  onValueChange={(v) => setShiftFilter(v === "all" ? "all" : (Number(v) as CashShift))}
                >
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="1">Morning</SelectItem>
                    <SelectItem value="2">Afternoon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="secondary" onClick={load} disabled={loading} className="w-full">
                  {loading ? "Loading..." : "Apply"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Card><CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Total IN</div>
                <div className="text-2xl font-semibold">{totals.totalIn.toFixed(2)}</div>
              </CardContent></Card>

              <Card><CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Total OUT</div>
                <div className="text-2xl font-semibold">{totals.totalOut.toFixed(2)}</div>
              </CardContent></Card>

              <Card><CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Net</div>
                <div className="text-2xl font-semibold">{totals.net.toFixed(2)}</div>
              </CardContent></Card>
            </div>

            {!canCreateTransactions ? (
              <div className="text-sm text-muted-foreground">
                Open a shift session to add cash movements (IN/OUT).
              </div>
            ) : null}

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                        No cash transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => {
                      const bid = bookingIdFromReference(r.reference);

                      return (
                        <TableRow key={r.cashTransactionId}>
                          <TableCell>{formatLocal(r.createdAtUtc)}</TableCell>
                          <TableCell>{shiftLabel(r.shift)}</TableCell>
                          <TableCell>
                            <Badge variant={r.type === 2 ? "destructive" : "secondary"}>
                              {cashTypeLabel(r.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{r.amount.toFixed(2)}</TableCell>
                          <TableCell>{currencyLabel(r.currency)}</TableCell>
                          <TableCell>{r.category || "—"}</TableCell>
                          <TableCell className="max-w-[320px] truncate" title={r.note}>
                            {r.note || "—"}
                          </TableCell>

                          <TableCell>
                            {bid ? (
                              <Link
                                to={`/bookings?bookingId=${bid}`}
                                className="text-blue-600 underline"
                                title="Open booking"
                              >
                                {r.reference}
                              </Link>
                            ) : (
                              r.reference || "—"
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OPEN SHIFT DIALOG */}
      <Dialog open={isOpenShiftDialogOpen} onOpenChange={setIsOpenShiftDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Open Shift</DialogTitle></DialogHeader>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Shift: <b>{shiftLabel(form.shift)}</b> • Currency: <b>{currencyLabel(form.currency)}</b>
            </div>

            <div className="space-y-2">
              <Label>Opening Balance</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={openBalanceInput}
                onChange={(e) => setOpenBalanceInput(e.target.value)}
                placeholder="e.g. 5000"
              />
            </div>

            {sessionError && <div className="text-sm text-red-600">{sessionError}</div>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpenShiftDialogOpen(false)} disabled={sessionLoading}>
              Cancel
            </Button>
            <Button onClick={submitOpenShift} disabled={sessionLoading}>
              {sessionLoading ? "Opening..." : "Open"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CLOSE SHIFT DIALOG */}
      <Dialog open={isClosedShiftDialogOpen} onOpenChange={setIsCloseShiftDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Close Shift</DialogTitle></DialogHeader>

          <div className="space-y-3">
            {!activeSession || activeSession.closedAtUtc ? (
              <div className="text-sm text-muted-foreground">No active session.</div>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">
                  Expected Balance: <b>{(sessionExpected ?? 0).toFixed(2)}</b>
                </div>

                <div className="space-y-2">
                  <Label>Counted Cash (Closing)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={closeCountedInput}
                    onChange={(e) => setCloseCountedInput(e.target.value)}
                    placeholder="e.g. 5400"
                  />
                </div>

                {sessionError && <div className="text-sm text-red-600">{sessionError}</div>}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseShiftDialogOpen(false)} disabled={sessionLoading}>
              Cancel
            </Button>
            <Button onClick={submitCloseShift} disabled={sessionLoading || !activeSession || !!activeSession.closedAtUtc}>
              {sessionLoading ? "Closing..." : "Close Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE TX DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{form.type === 2 ? "New Cash OUT" : "New Cash IN"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={String(form.type)}
                onValueChange={(v) => setForm((s) => ({ ...s, type: Number(v) as CashTransactionType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">IN</SelectItem>
                  <SelectItem value="2">OUT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Shift</Label>
              <Select value={String(activeSession?.shift ?? form.shift)} onValueChange={() => {}}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(activeSession?.shift ?? form.shift)}>
                    {shiftLabel(activeSession?.shift ?? form.shift)}
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">Shift is enforced from the active session.</div>
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={String(activeSession?.currency ?? form.currency)} onValueChange={() => {}}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(activeSession?.currency ?? form.currency)}>
                    {currencyLabel(activeSession?.currency ?? form.currency)}
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">Currency is enforced from the active session.</div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Amount</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
                placeholder="e.g. 2500"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Note {form.type === 2 ? <span className="text-red-600">*</span> : null}</Label>
              <Textarea
                value={form.note}
                onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
                placeholder={form.type === 2 ? "Why was cash used? (required for OUT)" : "Optional note"}
              />
            </div>

            <div className="space-y-2">
              <Label>Category (optional)</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
                placeholder="Supplies, Maintenance, Water sale..."
              />
            </div>

            <div className="space-y-2">
              <Label>Booking ID (optional)</Label>
              <Input
                value={form.bookingIdInput}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d]/g, "");
                  setForm((s) => {
                    const wasAutoBookingRef = /^booking\s*#\s*\d+$/i.test(s.reference.trim());
                    if (!digits) {
                      return { ...s, bookingIdInput: "", reference: wasAutoBookingRef ? "" : s.reference };
                    }
                    return { ...s, bookingIdInput: digits, reference: `BOOKING#${digits}` };
                  });
                }}
                placeholder="e.g. 197"
              />
              <div className="text-xs text-muted-foreground">
                If set, Reference is auto-filled as <b>BOOKING#ID</b>.
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Reference (optional)</Label>
              <Input
                value={form.reference}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((s) => {
                    const bid = bookingIdFromReference(v);
                    return { ...s, reference: v, bookingIdInput: bid ? String(bid) : "" };
                  });
                }}
                placeholder="Receipt #, SALE#WATER, Supplier invoice, ..."
              />
            </div>
          </div>

          {createError && <div className="text-sm text-red-600">{createError}</div>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={createLoading}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={createLoading}>
              {createLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
