import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  currencyLabel,
  getMonthlyHotelReport,
  getOptionalHotelId,
  type MonthlyHotelReportDto,
} from "@/services/reports-service";

function yyyyMmNow(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function formatPercent01(x: number): string {
  if (!Number.isFinite(x)) return "0%";
  return `${(x * 100).toFixed(2)}%`;
}

function formatMoney(x: number): string {
  if (!Number.isFinite(x)) return "0.00";
  return x.toFixed(2);
}

export default function ReportsDashboardPage() {
  const scopedHotelId = getOptionalHotelId();

  const now = useMemo(() => yyyyMmNow(), []);

  const [hotelIdInput, setHotelIdInput] = useState<string>(scopedHotelId ? String(scopedHotelId) : "");
  const [year, setYear] = useState<string>(String(now.year));
  const [month, setMonth] = useState<string>(String(now.month));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<MonthlyHotelReportDto | null>(null);

  const effectiveHotelId = useMemo(() => {
    // If the session already has a scoped hotelId (Staff), prefer it.
    if (scopedHotelId) return scopedHotelId;
    const n = Number(hotelIdInput);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [hotelIdInput, scopedHotelId]);

  const load = async () => {
    const y = Number(year);
    const m = Number(month);
    if (!Number.isFinite(y) || y < 2000 || y > 2100) {
      setError("Year must be between 2000 and 2100.");
      return;
    }
    if (!Number.isFinite(m) || m < 1 || m > 12) {
      setError("Month must be between 1 and 12.");
      return;
    }

    // For staff, backend can infer hotelId from token, but passing it is fine.
    if (!effectiveHotelId && !scopedHotelId) {
      setError("Please provide a hotelId.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const r = await getMonthlyHotelReport({
        hotelId: effectiveHotelId ?? undefined,
        year: y,
        month: m,
      });
      setReport(r);
    } catch (e: any) {
      setReport(null);
      setError(e?.message || "Failed to load monthly report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedHotelId]);

  const cashRows = report?.cashSummary ?? [];
const cashTotals = useMemo(() => {
  let netAll = 0;
  for (const c of cashRows) netAll += (c.net ?? (c.totalIn - c.totalOut));
  return netAll;
}, [cashRows]);


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Monthly Reports</CardTitle>
          <Button onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {!scopedHotelId ? (
              <div className="space-y-2">
                <Label>Hotel ID</Label>
                <Input
                  value={hotelIdInput}
                  onChange={(e) => setHotelIdInput(e.target.value)}
                  placeholder="e.g. 1"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Hotel ID</Label>
                <Input value={String(scopedHotelId)} disabled />
              </div>
            )}

            <div className="space-y-2">
              <Label>Year</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min={2000}
                max={2100}
              />
            </div>

            <div className="space-y-2">
              <Label>Month</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                min={1}
                max={12}
              />
            </div>

            <div className="flex items-end">
              <Button variant="secondary" onClick={load} disabled={loading} className="w-full">
                {loading ? "Loading..." : "Apply"}
              </Button>
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          {!report ? (
            <div className="text-sm text-muted-foreground">No report loaded.</div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Occupancy Rate</div>
                    <div className="text-2xl font-semibold">{formatPercent01(report.occupancyRate)}</div>
                    <div className="text-xs text-muted-foreground">{report.occupiedRoomNights} / {report.availableRoomNights} room-nights</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Bookings Created</div>
                    <div className="text-2xl font-semibold">{report.bookingsCreatedCount}</div>
                    <div className="text-xs text-muted-foreground">Confirmed: {report.confirmedCount} • Completed: {report.completedCount}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Cancelled</div>
                    <div className="text-2xl font-semibold">{report.cancelledCount}</div>
                    <div className="text-xs text-muted-foreground">Top reasons below</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Revenue (Total)</div>
                    <div className="text-2xl font-semibold">{formatMoney(report.revenueTotal)}</div>
                    <div className="text-xs text-muted-foreground">Completed: {formatMoney(report.revenueCompleted)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Cash summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Petty Cash Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Currency</TableHead>
                          <TableHead className="text-right">Total IN</TableHead>
                          <TableHead className="text-right">Total OUT</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cashRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                              No cash transactions for this month.
                            </TableCell>
                          </TableRow>
                        ) : (
                          cashRows.map((c) => (
                            <TableRow key={c.currency}>
                              <TableCell>
                                <Badge variant="secondary">{currencyLabel(c.currency)}</Badge>
                              </TableCell>
                              <TableCell className="text-right">{formatMoney(c.totalIn)}</TableCell>
                              <TableCell className="text-right">{formatMoney(c.totalOut)}</TableCell>
                              <TableCell className="text-right font-medium">{formatMoney(c.net)}</TableCell>
                            </TableRow>
                          ))
                        )}
                        {cashRows.length > 0 && (
                          <TableRow>
                            <TableCell className="font-medium">All (sum)</TableCell>
                            <TableCell />
                            <TableCell />
                            <TableCell className="text-right font-semibold">{formatMoney(cashTotals)}</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Cancellation reasons */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Cancellation Reasons</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reason</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(report.topCancellationReasons?.length ?? 0) === 0 ? (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                              No cancellation reasons recorded.
                            </TableCell>
                          </TableRow>
                        ) : (
                          report.topCancellationReasons.map((r) => (
                            <TableRow key={r.reason}>
                              <TableCell className="max-w-[520px] truncate" title={r.reason}>
                                {r.reason}
                              </TableCell>
                              <TableCell className="text-right">{r.count}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
