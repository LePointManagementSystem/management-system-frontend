import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import {
  ArrowDownCircle, ArrowUpCircle, FileDown, RefreshCw,
  Building2, Clock, Wallet, AlertCircle,
  CheckCircle2, XCircle, CalendarDays, CalendarRange,
} from "lucide-react";

import {
  exportCashSessionsExcel,
  exportCashTransactionsExcel,
} from "@/services/reporting-service";

import {
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

import type { Hotel } from "@/types/hotel";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─── Role helper ───────────────────────────────────────────────────────────────
/**
 * Reads the primary role stored at login time (localStorage.role).
 * Falls back to hotelId absence check only if role key is missing.
 */
function getStoredRole(): string {
  return localStorage.getItem("role") ?? "";
}

function isAdminOrManager(role: string): boolean {
  return role === "Admin" || role === "Manager";
}

// ─── Date helpers ──────────────────────────────────────────────────────────────
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function lastDayOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
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

// ─── Error helper ──────────────────────────────────────────────────────────────
function safeError(e: any): string {
  const msg: string = e?.message ?? String(e ?? "Unknown error");
  try {
    const parsed = JSON.parse(msg);
    return parsed?.message ?? parsed?.Message ?? parsed?.error ?? msg;
  } catch {
    return msg;
  }
}

// ─── Reference helpers ─────────────────────────────────────────────────────────
function bookingRefFromText(ref?: string | null): string | null {
  if (!ref) return null;
  const m = ref.match(/\bbk\s*[-\s]?\s*([a-z0-9]{4,})\b/i);
  if (!m?.[1]) return null;
  return `BK-${m[1].toUpperCase()}`;
}

function bookingIdFromReference(ref?: string | null): number | null {
  if (!ref) return null;
  const m1 = ref.match(/booking\s*#\s*(\d+)/i);
  if (m1?.[1]) return Number(m1[1]);
  const m2 = ref.match(/booking\s*#?\s*(\d+)/i);
  if (m2?.[1]) return Number(m2[1]);
  return null;
}

// ─── Types ─────────────────────────────────────────────────────────────────────
type CreateFormState = {
  type: CashTransactionType;
  currency: CurrencyCode;
  shift: CashShift;
  amount: string;
  note: string;
  category: string;
  reference: string;
  hotelIdInput: string;
};

type SuccessBanner = {
  type: CashTransactionType;
  amount: number;
  currency: CurrencyCode;
};

type CurrencyTotals = Record<number, { totalIn: number; totalOut: number }>;

const DEFAULT_FORM: CreateFormState = {
  type: 2,
  currency: 1,
  shift: 1,
  amount: "",
  note: "",
  category: "",
  reference: "",
  hotelIdInput: "",
};

// ─── Hotel fetch ───────────────────────────────────────────────────────────────
/**
 * Fetches all hotels for Admin / Manager.
 * NOTE: The backend search endpoint requires at least one search param to return
 * results. Until a dedicated /hotels/all endpoint is available, we use a
 * space character as a wildcard — the backend returns all hotels matching
 * a near-empty string, which in practice is all of them.
 */
async function fetchHotelsForAdmin(): Promise<Hotel[]> {
  const token = localStorage.getItem("token") ?? "";
  const qs = new URLSearchParams({ pageSize: "500", pageNumber: "1" });
  // Minimal search params: the backend treats an empty/space name as "match all".
  qs.set("name", " ");

  const res = await fetch(`${BASE_URL}/Hotel/search?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }

  if (!res.ok) {
    throw new Error(json?.message ?? json?.Message ?? text ?? `Failed to load hotels (${res.status})`);
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

// ─── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, color = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "default" | "green" | "red" | "blue";
}) {
  const valueColor =
    color === "green" ? "text-green-600" :
    color === "red"   ? "text-red-600"   :
    color === "blue"  ? "text-blue-600"  :
    "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-4 space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── Page component ────────────────────────────────────────────────────────────
export default function CashTransactionsPage() {
  const storedRole  = getStoredRole();
  const scopedHotelId = getOptionalHotelId();

  /**
   * isAdminLike: true when the logged-in user is Admin or Manager.
   * Primary signal: the "role" key set at login time.
   * Safety fallback: if role key is absent (e.g. legacy session), infer from
   * missing hotelId in localStorage (original behaviour preserved).
   */
  const isAdminLike = storedRole
    ? isAdminOrManager(storedRole)
    : !scopedHotelId;

  // ── State ────────────────────────────────────────────────────────────────────
  const [exporting, setExporting]       = useState(false);
  const [exportError, setExportError]   = useState<string | null>(null);

  const [hotels, setHotels]             = useState<Hotel[]>([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [hotelsError, setHotelsError]   = useState<string | null>(null);
  const [selectedHotelId, setSelectedHotelId] = useState<string>(
    scopedHotelId ? String(scopedHotelId) : ""
  );

  const [fromDate, setFromDate]         = useState<string>("");
  const [toDate,   setToDate]           = useState<string>("");
  const [typeFilter, setTypeFilter]     = useState<"all" | CashTransactionType>("all");
  const [currencyFilter, setCurrencyFilter] = useState<"all" | CurrencyCode>("all");
  const [shiftFilter, setShiftFilter]   = useState<"all" | CashShift>("all");

  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError]     = useState<string | null>(null);
  const [activeSession, setActiveSession]   = useState<CashSessionDto | null>(null);
  const [openBalanceInput, setOpenBalanceInput] = useState<string>("");
  const [openShiftVal, setOpenShiftVal]         = useState<CashShift>(1);
  const [openCurrencyVal, setOpenCurrencyVal]   = useState<CurrencyCode>(1);
  const [closeCountedInput, setCloseCountedInput] = useState<string>("");
  const [isOpenShiftDialogOpen, setIsOpenShiftDialogOpen]   = useState(false);
  const [isClosedShiftDialogOpen, setIsCloseShiftDialogOpen] = useState(false);

  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [rows, setRows]                 = useState<CashTransactionDto[]>([]);

  const [isCreateOpen, setIsCreateOpen]     = useState(false);
  const [createLoading, setCreateLoading]   = useState(false);
  const [createError, setCreateError]       = useState<string | null>(null);
  const [successBanner, setSuccessBanner]   = useState<SuccessBanner | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<CreateFormState>({
    ...DEFAULT_FORM,
    hotelIdInput: scopedHotelId ? String(scopedHotelId) : "",
  });

  // ── Derived ──────────────────────────────────────────────────────────────────
  const effectiveHotelId = useMemo(() => {
    if (scopedHotelId && scopedHotelId > 0) return scopedHotelId;
    const n = Number(selectedHotelId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [scopedHotelId, selectedHotelId]);

  const canCreateTransactions = !!activeSession && !activeSession.closedAtUtc;

  const selectedHotelName = useMemo(
    () => hotels.find((h) => String(h.id) === selectedHotelId)?.name ?? null,
    [hotels, selectedHotelId]
  );

  // ── Real-time amount validation ───────────────────────────────────────────────
  const amountNum     = Number(form.amount);
  const amountTouched = form.amount.length > 0;
  const amountInvalid = amountTouched && (!Number.isFinite(amountNum) || amountNum <= 0);

  /**
   * Totaux groupés par devise.
   * If only one currency is active, show one set; if mixed (HTG + USD), show both.
   */
  const totalsByCurrency = useMemo<CurrencyTotals>(() => {
    const map: CurrencyTotals = {};
    for (const r of rows) {
      if (!map[r.currency]) map[r.currency] = { totalIn: 0, totalOut: 0 };
      if (r.type === 1) map[r.currency].totalIn  += r.amount;
      if (r.type === 2) map[r.currency].totalOut += r.amount;
    }
    return map;
  }, [rows]);

  const sessionExpected = useMemo(
    () => (activeSession ? (activeSession.expected ?? activeSession.openingBalance ?? 0) : null),
    [activeSession]
  );

  // ── Data loading ──────────────────────────────────────────────────────────────
  const load = async () => {
    if (!effectiveHotelId) { setRows([]); setError("Please select a hotel first."); return; }
    setLoading(true);
    setError(null);
    try {
      const fromUtc = fromDate ? toUtcIso(fromDate, false) : undefined;
      const toUtc   = toDate   ? toUtcIso(toDate, true)    : undefined;
      const list = await fetchCashTransactions({
        hotelId:  effectiveHotelId,
        fromUtc, toUtc,
        type:     typeFilter     === "all" ? undefined : typeFilter,
        currency: currencyFilter === "all" ? undefined : currencyFilter,
        shift:    shiftFilter    === "all" ? undefined : shiftFilter,
        page: 1, pageSize: 200,
      });
      setRows(list);
    } catch (e: any) {
      setRows([]);
      setError(safeError(e));
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSession = async () => {
    if (!effectiveHotelId) { setActiveSession(null); return; }
    try {
      setSessionLoading(true);
      setSessionError(null);
      const now  = new Date();
      const from = new Date();
      // Scan only last 7 days (sessions opened more than 7 days ago are always closed in practice)
      from.setDate(from.getDate() - 7);
      const result = await listCashSessions({
        hotelId: effectiveHotelId,
        fromUtc: from.toISOString(),
        toUtc:   now.toISOString(),
        page: 1, pageSize: 50,
      });
      const openOne = (result.items || []).find((s) => !s.closedAtUtc) ?? null;
      setActiveSession(openOne);
      if (openOne) {
        setForm((prev) => ({ ...prev, currency: openOne.currency, shift: openOne.shift }));
      }
    } catch (e: any) {
      setActiveSession(null);
      setSessionError(safeError(e));
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => { if (isAdminLike) {
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
        setHotelsError(safeError(e));
      } finally {
        setHotelsLoading(false);
      }
    };
    void run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }}, [isAdminLike]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [effectiveHotelId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadActiveSession(); }, [effectiveHotelId]);

  // Cleanup success timer on unmount
  useEffect(() => () => { if (successTimerRef.current) clearTimeout(successTimerRef.current); }, []);

  // ── Date shortcuts ────────────────────────────────────────────────────────────
  const applyToday = () => {
    const t = todayIso();
    setFromDate(t);
    setToDate(t);
  };

  const applyThisMonth = () => {
    setFromDate(firstDayOfMonthIso());
    setToDate(lastDayOfMonthIso());
  };

  const clearDates = () => {
    setFromDate("");
    setToDate("");
  };

  // ── Actions ───────────────────────────────────────────────────────────────────
  const openCreate = (type: CashTransactionType) => {
    setCreateError(null);
    setSuccessBanner(null);
    setForm((s) => ({
      ...DEFAULT_FORM,
      type,
      hotelIdInput: effectiveHotelId ? String(effectiveHotelId) : s.hotelIdInput,
      currency: activeSession?.currency ?? s.currency,
      shift:    activeSession?.shift    ?? s.shift,
    }));
    setIsCreateOpen(true);
  };

  const submitCreate = async () => {
    const hid = effectiveHotelId;
    if (!hid) { setCreateError("Please select a hotel first."); return; }
    if (!activeSession || activeSession.closedAtUtc) {
      setCreateError("Please open a shift before adding transactions."); return;
    }
    if (amountInvalid || !amountTouched) {
      setCreateError("Amount must be a positive number."); return;
    }
    const note = form.note.trim();
    if (form.type === 2 && !note) { setCreateError("A note is required for Cash OUT."); return; }

    setCreateLoading(true);
    setCreateError(null);
    try {
      await createCashTransaction({
        hotelId:       hid,
        cashSessionId: activeSession.cashSessionId,
        type:          form.type,
        currency:      activeSession.currency,
        shift:         activeSession.shift,
        amount:        amountNum,
        note,
        category:  form.category.trim()  || null,
        reference: form.reference.trim() || null,
      });

      setIsCreateOpen(false);

      // Show success banner
      const banner: SuccessBanner = {
        type:     form.type,
        amount:   amountNum,
        currency: activeSession.currency,
      };
      setSuccessBanner(banner);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccessBanner(null), 6000);

      await load();
      await loadActiveSession();
    } catch (e: any) {
      setCreateError(safeError(e));
    } finally {
      setCreateLoading(false);
    }
  };

  // Enter key submits the create dialog
  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !createLoading) {
      const target = e.target as HTMLElement;
      // Don't intercept Enter inside Textarea (multi-line)
      if (target.tagName === "TEXTAREA") return;
      e.preventDefault();
      void submitCreate();
    }
  };

  const submitOpenShift = async () => {
    if (!effectiveHotelId) { setSessionError("Please select a hotel first."); return; }
    if (activeSession && !activeSession.closedAtUtc) {
      setSessionError("A shift is already open. Close it first."); return;
    }
    const opening = Number(openBalanceInput);
    if (!Number.isFinite(opening) || opening < 0) {
      setSessionError("Opening balance must be a valid number ≥ 0."); return;
    }
    try {
      setSessionLoading(true);
      setSessionError(null);
      const opened = await openCashSession({
        hotelId:        effectiveHotelId,
        currency:       openCurrencyVal,
        shift:          openShiftVal,
        openingBalance: opening,
      });
      setActiveSession(opened);
      setIsOpenShiftDialogOpen(false);
      setOpenBalanceInput("");
      setForm((prev) => ({ ...prev, currency: opened.currency, shift: opened.shift }));
      await load();
    } catch (e: any) {
      setSessionError(safeError(e));
    } finally {
      setSessionLoading(false);
    }
  };

  const submitCloseShift = async () => {
    if (!activeSession || activeSession.closedAtUtc) {
      setSessionError("No open shift to close."); return;
    }
    const counted = Number(closeCountedInput);
    if (!Number.isFinite(counted) || counted < 0) {
      setSessionError("Counted cash must be a valid number ≥ 0."); return;
    }
    try {
      setSessionLoading(true);
      setSessionError(null);
      const closed = await closeCashSession({
        cashSessionId:   activeSession.cashSessionId,
        closingCounted:  counted,
      });
      setActiveSession(closed);
      setIsCloseShiftDialogOpen(false);
      setCloseCountedInput("");
      await load();
    } catch (e: any) {
      setSessionError(safeError(e));
    } finally {
      setSessionLoading(false);
    }
  };

  const exportPettyCashExcel = async () => {
    if (!effectiveHotelId) { setExportError("Please select a hotel first."); return; }
    setExportError(null);
    try {
      setExporting(true);
      await exportCashTransactionsExcel({
        hotelId: effectiveHotelId,
        fromUtc:  fromDate ? toUtcIso(fromDate, false) : undefined,
        toUtc:    toDate   ? toUtcIso(toDate, true)    : undefined,
        currency: currencyFilter === "all" ? undefined : Number(currencyFilter),
        shift:    shiftFilter    === "all" ? undefined : Number(shiftFilter),
        type:     typeFilter     === "all" ? undefined : Number(typeFilter),
      });
    } catch (e: any) { setExportError(safeError(e)); }
    finally { setExporting(false); }
  };

  const exportCashSessionsExcelFile = async () => {
    if (!effectiveHotelId) { setExportError("Please select a hotel first."); return; }
    setExportError(null);
    try {
      setExporting(true);
      await exportCashSessionsExcel({
        hotelId: effectiveHotelId,
        fromUtc: fromDate ? toUtcIso(fromDate, false) : undefined,
        toUtc:   toDate   ? toUtcIso(toDate, true)    : undefined,
      });
    } catch (e: any) { setExportError(safeError(e)); }
    finally { setExporting(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page Header ──────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Petty Cash</h1>
            <p className="text-sm text-muted-foreground">
              Track daily cash movements by shift and session.
            </p>
          </div>
        </div>

        {isAdminLike && (
          <div className="flex items-center gap-2 min-w-[260px]">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select
              value={selectedHotelId}
              onValueChange={setSelectedHotelId}
              disabled={hotelsLoading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={hotelsLoading ? "Loading hotels…" : "Select a hotel"} />
              </SelectTrigger>
              <SelectContent>
                {hotels.map((h) => (
                  <SelectItem key={h.id} value={String(h.id)}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {hotelsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Could not load hotel list: {hotelsError}</AlertDescription>
        </Alert>
      )}

      {!effectiveHotelId && isAdminLike && !hotelsError && (
        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertDescription>
            Select a hotel above to view cash sessions and transactions.
          </AlertDescription>
        </Alert>
      )}

      {effectiveHotelId && (
        <>
          {/* ── Session Panel ────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">
                    Current Shift Session
                    {selectedHotelName && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        — {selectedHotelName}
                      </span>
                    )}
                  </CardTitle>
                  {canCreateTransactions ? (
                    <Badge className="bg-green-100 text-green-700 border border-green-300">Active</Badge>
                  ) : (
                    <Badge variant="secondary">No active shift</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {!activeSession || activeSession.closedAtUtc ? (
                    <Button
                      size="sm"
                      onClick={() => { setSessionError(null); setIsOpenShiftDialogOpen(true); }}
                      disabled={sessionLoading}
                    >
                      Open Shift
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline" size="sm"
                        onClick={exportCashSessionsExcelFile}
                        disabled={exporting}
                      >
                        <FileDown className="h-4 w-4 mr-1" />
                        {exporting ? "Exporting…" : "Export Sessions"}
                      </Button>
                      <Button
                        variant="destructive" size="sm"
                        onClick={() => { setSessionError(null); setIsCloseShiftDialogOpen(true); }}
                        disabled={sessionLoading}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Close Shift
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost" size="sm"
                    onClick={loadActiveSession}
                    disabled={sessionLoading}
                    title="Refresh session"
                  >
                    <RefreshCw className={`h-4 w-4 ${sessionLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {sessionError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{sessionError}</AlertDescription>
                </Alert>
              )}

              {sessionLoading && !activeSession ? (
                <p className="text-sm text-muted-foreground">Loading session…</p>
              ) : !activeSession ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">No active shift found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Open a shift to start recording cash movements.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard
                    label="Shift"
                    value={shiftLabel(activeSession.shift)}
                    sub={currencyLabel(activeSession.currency)}
                  />
                  <StatCard
                    label="Opening Balance"
                    value={(activeSession.openingBalance ?? 0).toFixed(2)}
                    sub={`Opened: ${activeSession.openedAtUtc ? formatLocal(activeSession.openedAtUtc) : "—"}`}
                    color="blue"
                  />
                  <StatCard
                    label="Expected Balance"
                    value={(sessionExpected ?? 0).toFixed(2)}
                    sub="Opening + IN − OUT"
                  />
                  <StatCard
                    label={activeSession.closedAtUtc ? "Counted Cash" : "Variance"}
                    value={activeSession.closedAtUtc ? (activeSession.closingCounted ?? 0).toFixed(2) : "—"}
                    sub={activeSession.closedAtUtc
                      ? `Difference: ${(activeSession.difference ?? 0).toFixed(2)}`
                      : "Close shift to count"}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Transactions Panel ───────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                  Cash Movements
                </CardTitle>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={exportPettyCashExcel}
                    disabled={exporting || !effectiveHotelId}
                  >
                    <FileDown className="h-4 w-4 mr-1" />
                    {exporting ? "Exporting…" : "Export Excel"}
                  </Button>

                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white gap-1"
                    onClick={() => openCreate(1)}
                    disabled={!canCreateTransactions}
                    title={!canCreateTransactions ? "Open a shift first" : undefined}
                  >
                    <ArrowUpCircle className="h-4 w-4" />
                    Cash IN
                  </Button>

                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white gap-1"
                    onClick={() => openCreate(2)}
                    disabled={!canCreateTransactions}
                    title={!canCreateTransactions ? "Open a shift first" : undefined}
                  >
                    <ArrowDownCircle className="h-4 w-4" />
                    Cash OUT
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">

              {/* ── Success banner ─── */}
              {successBanner && (
                <Alert className="border-green-200 bg-green-50 text-green-900">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">
                    {successBanner.type === 1 ? "Cash IN recorded!" : "Cash OUT recorded!"}
                  </AlertTitle>
                  <AlertDescription className="text-green-700">
                    <span className="font-semibold">
                      {successBanner.type === 2 ? "−" : "+"}
                      {successBanner.amount.toFixed(2)} {currencyLabel(successBanner.currency)}
                    </span>{" "}
                    has been saved successfully to the active shift session.
                  </AlertDescription>
                </Alert>
              )}

              {!canCreateTransactions && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Open a shift session above to add Cash IN / Cash OUT movements.
                  </AlertDescription>
                </Alert>
              )}

              {exportError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{exportError}</AlertDescription>
                </Alert>
              )}

              {/* ── Date shortcuts + Filters ─── */}
              <div className="space-y-3">
                {/* Shortcuts row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Quick filter:</span>
                  <Button
                    variant="outline" size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={applyToday}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    Today
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={applyThisMonth}
                  >
                    <CalendarRange className="h-3.5 w-3.5" />
                    This Month
                  </Button>
                  {(fromDate || toDate) && (
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={clearDates}
                    >
                      ✕ Clear dates
                    </Button>
                  )}
                </div>

                {/* Filter controls */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs">From</Label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">To</Label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={typeFilter === "all" ? "all" : String(typeFilter)}
                      onValueChange={(v) => setTypeFilter(v === "all" ? "all" : (Number(v) as CashTransactionType))}
                    >
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="1">Cash IN</SelectItem>
                        <SelectItem value="2">Cash OUT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Currency</Label>
                    <Select
                      value={currencyFilter === "all" ? "all" : String(currencyFilter)}
                      onValueChange={(v) => setCurrencyFilter(v === "all" ? "all" : (Number(v) as CurrencyCode))}
                    >
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All currencies</SelectItem>
                        <SelectItem value="1">HTG</SelectItem>
                        <SelectItem value="2">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Shift</Label>
                    <Select
                      value={shiftFilter === "all" ? "all" : String(shiftFilter)}
                      onValueChange={(v) => setShiftFilter(v === "all" ? "all" : (Number(v) as CashShift))}
                    >
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All shifts</SelectItem>
                        <SelectItem value="1">Morning</SelectItem>
                        <SelectItem value="2">Afternoon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={load} disabled={loading} size="sm" className="w-full h-8">
                      {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* ── Totals grouped by currency ─── */}
              {Object.keys(totalsByCurrency).length === 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Total Cash IN" value="—" />
                  <StatCard label="Total Cash OUT" value="—" />
                  <StatCard label="Net Balance" value="—" />
                </div>
              ) : Object.entries(totalsByCurrency).map(([currencyKey, t]) => {
                const ccy = Number(currencyKey) as CurrencyCode;
                const net = t.totalIn - t.totalOut;
                const ccyLabel = currencyLabel(ccy);
                return (
                  <div key={currencyKey}>
                    {Object.keys(totalsByCurrency).length > 1 && (
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {ccyLabel} totals
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                      <StatCard
                        label={`Total Cash IN (${ccyLabel})`}
                        value={`+${t.totalIn.toFixed(2)}`}
                        color="green"
                      />
                      <StatCard
                        label={`Total Cash OUT (${ccyLabel})`}
                        value={`−${t.totalOut.toFixed(2)}`}
                        color="red"
                      />
                      <StatCard
                        label={`Net Balance (${ccyLabel})`}
                        value={net.toFixed(2)}
                        color={net >= 0 ? "green" : "red"}
                      />
                    </div>
                  </div>
                );
              })}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* ── Table ─── */}
              <div className="rounded-md border overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {["Date", "Shift", "Type", "Amount", "Currency", "Category", "Note", "Reference"].map((h) => (
                        <th key={h} className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-muted-foreground">
                          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                          <p className="text-sm">Loading transactions…</p>
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-muted-foreground">
                          <Wallet className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm font-medium">No transactions found</p>
                          <p className="text-xs mt-1">
                            {canCreateTransactions
                              ? `Use "Cash IN" or "Cash OUT" to record the first movement.`
                              : "Open a shift to start recording cash movements."}
                          </p>
                        </td>
                      </tr>
                    ) : rows.map((r) => {
                      const bref = bookingRefFromText(r.reference);
                      const bid  = bookingIdFromReference(r.reference);
                      const refCell = bref ? (
                        <Link to={`/bookings?ref=${encodeURIComponent(bref)}`}
                          className="text-blue-600 underline underline-offset-2">{r.reference}</Link>
                      ) : bid ? (
                        <Link to={`/bookings?bookingId=${bid}`}
                          className="text-blue-600 underline underline-offset-2">{r.reference}</Link>
                      ) : r.reference || "—";

                      return (
                        <tr key={r.cashTransactionId}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 whitespace-nowrap text-xs">{formatLocal(r.createdAtUtc)}</td>
                          <td className="px-3 py-2 text-xs">{shiftLabel(r.shift)}</td>
                          <td className="px-3 py-2">
                            {r.type === 1 ? (
                              <Badge className="bg-green-100 text-green-700 border border-green-300 text-xs gap-1">
                                <ArrowUpCircle className="h-3 w-3" /> IN
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 border border-red-300 text-xs gap-1">
                                <ArrowDownCircle className="h-3 w-3" /> OUT
                              </Badge>
                            )}
                          </td>
                          <td className={`px-3 py-2 text-right font-semibold tabular-nums text-sm ${
                            r.type === 1 ? "text-green-600" : "text-red-600"
                          }`}>
                            {r.type === 2 ? "−" : "+"}{r.amount.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-xs font-medium">{currencyLabel(r.currency)}</td>
                          <td className="px-3 py-2 text-xs">{r.category || "—"}</td>
                          <td className="px-3 py-2 max-w-[180px] truncate text-xs" title={r.note}>
                            {r.note || "—"}
                          </td>
                          <td className="px-3 py-2 text-xs">{refCell}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {rows.length > 0 && (
                <p className="text-xs text-muted-foreground text-right">
                  {rows.length} transaction{rows.length !== 1 ? "s" : ""} shown
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── OPEN SHIFT DIALOG ──────────────────────────────── */}
      <Dialog open={isOpenShiftDialogOpen} onOpenChange={setIsOpenShiftDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Open a New Shift
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Shift</Label>
                <Select value={String(openShiftVal)} onValueChange={(v) => setOpenShiftVal(Number(v) as CashShift)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Morning</SelectItem>
                    <SelectItem value="2">Afternoon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={String(openCurrencyVal)} onValueChange={(v) => setOpenCurrencyVal(Number(v) as CurrencyCode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">HTG</SelectItem>
                    <SelectItem value="2">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="openingBalance">Opening Balance</Label>
              <Input
                id="openingBalance"
                type="number" inputMode="decimal" min="0" step="0.01"
                value={openBalanceInput}
                onChange={(e) => setOpenBalanceInput(e.target.value)}
                placeholder="e.g. 5000.00"
              />
              <p className="text-xs text-muted-foreground">
                Count the physical cash and enter the total at the start of this shift.
              </p>
            </div>

            {sessionError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{sessionError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpenShiftDialogOpen(false)} disabled={sessionLoading}>
              Cancel
            </Button>
            <Button onClick={submitOpenShift} disabled={sessionLoading}>
              {sessionLoading
                ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Opening…</>
                : "Open Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CLOSE SHIFT DIALOG ─────────────────────────────── */}
      <Dialog open={isClosedShiftDialogOpen} onOpenChange={setIsCloseShiftDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Close Current Shift
            </DialogTitle>
          </DialogHeader>

          {!activeSession || activeSession.closedAtUtc ? (
            <p className="text-sm text-muted-foreground py-2">No active shift to close.</p>
          ) : (
            <div className="space-y-4 py-1">
              <div className="rounded-md bg-muted/50 border p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shift</span>
                  <span className="font-medium">
                    {shiftLabel(activeSession.shift)} · {currencyLabel(activeSession.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opening Balance</span>
                  <span className="font-medium">{(activeSession.openingBalance ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5">
                  <span className="text-muted-foreground">Expected Balance</span>
                  <span className="font-semibold text-blue-600">{(sessionExpected ?? 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="countedCash">Counted Cash</Label>
                <Input
                  id="countedCash"
                  type="number" inputMode="decimal" min="0" step="0.01"
                  value={closeCountedInput}
                  onChange={(e) => setCloseCountedInput(e.target.value)}
                  placeholder="e.g. 5400.00"
                />
                <p className="text-xs text-muted-foreground">
                  Physically count the cash in the drawer and enter the total.
                </p>
              </div>

              {sessionError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{sessionError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseShiftDialogOpen(false)} disabled={sessionLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitCloseShift}
              disabled={sessionLoading || !activeSession || !!activeSession.closedAtUtc}
            >
              {sessionLoading
                ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Closing…</>
                : "Close Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CREATE TRANSACTION DIALOG ──────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[480px]" onKeyDown={handleCreateKeyDown}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {form.type === 1
                ? <><ArrowUpCircle className="h-5 w-5 text-green-600" /> New Cash IN</>
                : <><ArrowDownCircle className="h-5 w-5 text-red-500" /> New Cash OUT</>}
            </DialogTitle>
          </DialogHeader>

          {/* Session context badges */}
          {activeSession && (
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                {shiftLabel(activeSession.shift)}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                {currencyLabel(activeSession.currency)}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                Session #{activeSession.cashSessionId}
              </span>
            </div>
          )}

          <div className="space-y-4 py-1">
            {/* Amount with real-time validation */}
            <div className="space-y-1.5">
              <Label htmlFor="txAmount">
                Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                id="txAmount"
                type="number" inputMode="decimal" min="0" step="0.01"
                value={form.amount}
                onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
                placeholder="e.g. 2500.00"
                autoFocus
                className={amountInvalid ? "border-red-500 focus-visible:ring-red-400" : ""}
              />
              {amountInvalid && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Amount must be greater than zero.
                </p>
              )}
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="txNote">
                Note{form.type === 2 && <span className="text-red-500 ml-0.5">*</span>}
              </Label>
              <Textarea
                id="txNote"
                value={form.note}
                onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
                placeholder={
                  form.type === 2
                    ? "Why was cash taken out? (required for Cash OUT)"
                    : "Optional — describe this cash receipt"
                }
                rows={3}
              />
            </div>

            {/* Category + Reference */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="txCategory">Category</Label>
                <Input
                  id="txCategory"
                  value={form.category}
                  onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
                  placeholder="Supplies, Water, Maintenance…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="txRef">Reference</Label>
                <Input
                  id="txRef"
                  value={form.reference}
                  onChange={(e) => setForm((s) => ({ ...s, reference: e.target.value }))}
                  placeholder="Receipt #, BK-XXXX…"
                />
                <p className="text-xs text-muted-foreground">
                  Use BK-XXXX to link to a booking.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Press <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-xs">Enter</kbd> to save quickly.
            </p>
          </div>

          {createError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{createError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={createLoading}>
              Cancel
            </Button>
            <Button
              onClick={submitCreate}
              disabled={createLoading || amountInvalid}
              className={
                form.type === 1
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {createLoading ? (
                <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Saving…</>
              ) : form.type === 1 ? (
                <><ArrowUpCircle className="h-4 w-4 mr-1" /> Record Cash IN</>
              ) : (
                <><ArrowDownCircle className="h-4 w-4 mr-1" /> Record Cash OUT</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
