import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  cashTypeLabel,
  currencyLabel,
  createCashTransaction,
  fetchCashTransactions,
  getOptionalHotelId,
  type CashTransactionDto,
  type CashTransactionType,
  type CurrencyCode,
} from "@/services/cash-transactions-service";

function toUtcIso(dateStr: string, endOfDay: boolean): string {
  // dateStr: YYYY-MM-DD (local)
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
  amount: string;
  note: string;
  category: string;
  reference: string;
};

const DEFAULT_FORM: CreateFormState = {
  type: 2,
  currency: 1,
  amount: "",
  note: "",
  category: "",
  reference: "",
};

export default function CashTransactionsPage() {
  const hotelId = getOptionalHotelId();

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | CashTransactionType>("all");
  const [currencyFilter, setCurrencyFilter] = useState<"all" | CurrencyCode>("all");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<CashTransactionDto[]>([]);

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateFormState>(DEFAULT_FORM);

  const totals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const r of rows) {
      if (r.type === 1) totalIn += r.amount;
      if (r.type === 2) totalOut += r.amount;
    }
    return { totalIn, totalOut, net: totalIn - totalOut };
  }, [rows]);

  const load = async () => {
    if (!hotelId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fromUtc = fromDate ? toUtcIso(fromDate, false) : undefined;
      const toUtc = toDate ? toUtcIso(toDate, true) : undefined;

      const list = await fetchCashTransactions({
        hotelId,
        fromUtc,
        toUtc,
        type: typeFilter === "all" ? undefined : typeFilter,
        currency: currencyFilter === "all" ? undefined : currencyFilter,
        page: 1,
        pageSize: 200,
      });
      setRows(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load cash transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial load
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  const openCreate = (type: CashTransactionType) => {
    setCreateError(null);
    setForm({ ...DEFAULT_FORM, type });
    setIsCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!hotelId) {
      setCreateError("No hotel scope found. Please contact an administrator.");
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
        hotelId,
        type: form.type,
        currency: form.currency,
        amount: amt,
        note: note,
        category: form.category.trim() || null,
        reference: form.reference.trim() || null,
      });

      setIsCreateOpen(false);
      setForm(DEFAULT_FORM);
      await load();
    } catch (e: any) {
      setCreateError(e?.message || "Failed to create cash transaction.");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Petty Cash</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openCreate(1)}>
              New IN
            </Button>
            <Button onClick={() => openCreate(2)}>New OUT</Button>
          </div>
        </CardHeader>
        <CardContent>
          {!hotelId ? (
            <div className="text-sm text-red-600">
              No hotelId found in your session. Please log in again or contact an administrator.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
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
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
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
                    onValueChange={(v) =>
                      setCurrencyFilter(v === "all" ? "all" : (Number(v) as CurrencyCode))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="1">HTG</SelectItem>
                      <SelectItem value="2">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="secondary" onClick={load} disabled={loading} className="w-full">
                    {loading ? "Loading..." : "Apply"}
                  </Button>
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Total IN</div>
                    <div className="text-2xl font-semibold">{totals.totalIn.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Total OUT</div>
                    <div className="text-2xl font-semibold">{totals.totalOut.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Net</div>
                    <div className="text-2xl font-semibold">{totals.net.toFixed(2)}</div>
                  </CardContent>
                </Card>
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              {/* Table */}
              <div className="rounded-md border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
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
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                          No cash transactions found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((r) => (
                        <TableRow key={r.cashTransactionId}>
                          <TableCell>{formatLocal(r.createdAtUtc)}</TableCell>
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
                          <TableCell>{r.reference || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{form.type === 2 ? "New Cash OUT" : "New Cash IN"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={String(form.type)} onValueChange={(v) => setForm((s) => ({ ...s, type: Number(v) as CashTransactionType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">IN</SelectItem>
                  <SelectItem value="2">OUT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={String(form.currency)} onValueChange={(v) => setForm((s) => ({ ...s, currency: Number(v) as CurrencyCode }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">HTG</SelectItem>
                  <SelectItem value="2">USD</SelectItem>
                </SelectContent>
              </Select>
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
              <Label>
                Note {form.type === 2 ? <span className="text-red-600">*</span> : null}
              </Label>
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
                placeholder="Supplies, Maintenance, ..."
              />
            </div>

            <div className="space-y-2">
              <Label>Reference (optional)</Label>
              <Input
                value={form.reference}
                onChange={(e) => setForm((s) => ({ ...s, reference: e.target.value }))}
                placeholder="Receipt #, Invoice #, ..."
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
