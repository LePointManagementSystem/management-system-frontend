import { useEffect, useMemo, useState } from "react"
import {
  BarChart2,
  Banknote,
  Calendar,
  RefreshCw,
  XCircle,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  currencyLabel,
  getMonthlyHotelReport,
  getOptionalHotelId,
  type MonthlyHotelReportDto,
} from "@/services/reports-service"

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function buildYearOptions(): number[] {
  const now = new Date().getFullYear()
  return [now - 2, now - 1, now, now + 1]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPercent(x: number): string {
  if (!Number.isFinite(x)) return "0%"
  return `${(x * 100).toFixed(1)}%`
}

function formatMoney(x: number): string {
  if (!Number.isFinite(x)) return "0.00"
  return x.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatCurrency(amount: number, currency: number): string {
  const symbol = currencyLabel(currency as 1 | 2)
  return `${symbol} ${formatMoney(amount)}`
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportsDashboardPage() {
  const scopedHotelId = getOptionalHotelId()
  const thisYear = new Date().getFullYear()
  const thisMonth = new Date().getMonth() + 1
  const YEARS = buildYearOptions()

  const [hotelIdInput, setHotelIdInput] = useState<string>(
    scopedHotelId ? String(scopedHotelId) : ""
  )
  const [year, setYear] = useState<string>(String(thisYear))
  const [month, setMonth] = useState<string>(String(thisMonth))

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<MonthlyHotelReportDto | null>(null)

  const effectiveHotelId = useMemo(() => {
    if (scopedHotelId) return scopedHotelId
    const n = Number(hotelIdInput)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [hotelIdInput, scopedHotelId])

  const load = async () => {
    const y = Number(year)
    const m = Number(month)

    if (!Number.isFinite(y) || y < 2000 || y > 2100) {
      setError("Please select a valid year.")
      return
    }
    if (!Number.isFinite(m) || m < 1 || m > 12) {
      setError("Please select a valid month.")
      return
    }
    if (!effectiveHotelId && !scopedHotelId) {
      setError("Please enter a Hotel ID to load the report.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const r = await getMonthlyHotelReport({
        hotelId: effectiveHotelId ?? undefined,
        year: y,
        month: m,
      })
      setReport(r)
    } catch (err: unknown) {
      setReport(null)
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load the monthly report."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedHotelId])

  // ── Cash totals ──────────────────────────────────────────────────────────

  const cashRows = report?.cashSummary ?? []

  const cashTotals = useMemo(() => {
    const bySymbol: Record<string, number> = {}
    for (const c of cashRows) {
      const sym = currencyLabel(c.currency)
      bySymbol[sym] = (bySymbol[sym] ?? 0) + (c.net ?? c.totalIn - c.totalOut)
    }
    return bySymbol
  }, [cashRows])

  // ── Period label ─────────────────────────────────────────────────────────

  const periodLabel = useMemo(() => {
    const m = Number(month)
    const y = Number(year)
    if (!Number.isFinite(m) || !Number.isFinite(y)) return ""
    return `${MONTH_NAMES[m - 1] ?? ""} ${y}`
  }, [month, year])

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Filters card ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Monthly Report</CardTitle>
            {periodLabel && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {periodLabel}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={load}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Refresh
              </>
            )}
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Hotel ID */}
            {!scopedHotelId ? (
              <div className="space-y-1.5">
                <Label htmlFor="hotelId">Hotel ID</Label>
                <Input
                  id="hotelId"
                  value={hotelIdInput}
                  onChange={(e) => setHotelIdInput(e.target.value)}
                  placeholder="e.g. 1"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Hotel</Label>
                <Input value={String(scopedHotelId)} disabled />
              </div>
            )}

            {/* Year */}
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month */}
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Apply */}
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={load}
                disabled={loading}
              >
                Apply
              </Button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ── No report ── */}
      {!report && !loading && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              No report loaded yet. Select a period above and click{" "}
              <strong>Apply</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Report content ── */}
      {report && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Occupancy Rate"
              value={formatPercent(report.occupancyRate)}
              subtitle={`${report.occupiedRoomNights} / ${report.availableRoomNights} room-nights`}
              icon={BarChart2}
            />
            <KpiCard
              title="Bookings Created"
              value={report.bookingsCreatedCount}
              subtitle={`Confirmed: ${report.confirmedCount} · Completed: ${report.completedCount}`}
              icon={Calendar}
            />
            <KpiCard
              title="Cancelled"
              value={report.cancelledCount}
              subtitle="Cancellations this period"
              icon={XCircle}
            />
            <KpiCard
              title="Revenue (Total)"
              value={`HTG ${formatMoney(report.revenueTotal)}`}
              subtitle={`Completed: HTG ${formatMoney(report.revenueCompleted)}`}
              icon={Banknote}
            />
          </div>

          {/* Petty Cash Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Petty Cash Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-b-lg border-t">
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
                        <TableCell
                          colSpan={4}
                          className="text-center text-sm text-muted-foreground py-8"
                        >
                          No cash transactions recorded for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {cashRows.map((c) => {
                          const net = c.net ?? c.totalIn - c.totalOut
                          return (
                            <TableRow key={c.currency}>
                              <TableCell>
                                <Badge variant="secondary">
                                  {currencyLabel(c.currency)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(c.totalIn, c.currency)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(c.totalOut, c.currency)}
                              </TableCell>
                              <TableCell
                                className={`text-right font-medium ${
                                  net >= 0 ? "text-green-700" : "text-red-600"
                                }`}
                              >
                                {formatCurrency(net, c.currency)}
                              </TableCell>
                            </TableRow>
                          )
                        })}

                        {/* Totals row (multi-currency: show per symbol) */}
                        {Object.entries(cashTotals).map(([sym, net]) => (
                          <TableRow
                            key={`total-${sym}`}
                            className="bg-muted/40 font-semibold"
                          >
                            <TableCell>Total ({sym})</TableCell>
                            <TableCell />
                            <TableCell />
                            <TableCell
                              className={`text-right ${
                                net >= 0 ? "text-green-700" : "text-red-600"
                              }`}
                            >
                              {sym}{" "}
                              {net.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Top Cancellation Reasons */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Top Cancellation Reasons
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-b-lg border-t">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right w-24">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(report.topCancellationReasons?.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          className="text-center text-sm text-muted-foreground py-8"
                        >
                          No cancellation reasons recorded for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.topCancellationReasons.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell
                            className="max-w-[520px] truncate"
                            title={r.reason}
                          >
                            {r.reason || "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {r.count}
                          </TableCell>
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
    </div>
  )
}
