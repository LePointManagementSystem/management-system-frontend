import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  Calendar,
  LogIn,
  LogOut,
  XCircle,
  Plus,
  BookOpen,
  Users,
  Loader2,
  ArrowRight,
  BedDouble,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

import { fetchAllBookings, type BookingDto } from "@/services/booking-service"
import { onBookingsChanged } from "@/utils/events"
import { formatIsoUtcToHaitiShort } from "@/utils/datetime"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isTodayHaiti(isoUtc: string | null | undefined): boolean {
  if (!isoUtc) return false
  try {
    const dateStr = new Date(isoUtc).toLocaleDateString("en-CA", {
      timeZone: "America/Port-au-Prince",
    })
    const nowStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Port-au-Prince",
    })
    return dateStr === nowStr
  } catch {
    return false
  }
}

function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const AVATAR_BG = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-indigo-500",
]

function avatarBg(name: string | null | undefined): string {
  const code = (name ?? "").charCodeAt(0) || 0
  return AVATAR_BG[code % AVATAR_BG.length]
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  pending:    { label: "Pending",    className: "bg-amber-100 text-amber-800 border-amber-200" },
  confirmed:  { label: "Confirmed",  className: "bg-blue-100 text-blue-800 border-blue-200" },
  completed:  { label: "Completed",  className: "bg-gray-100 text-gray-700 border-gray-200" },
  cancelled:  { label: "Cancelled",  className: "bg-red-100 text-red-700 border-red-200" },
  checkedin:  { label: "Checked In", className: "bg-green-100 text-green-800 border-green-200" },
  refunded:   { label: "Refunded",   className: "bg-purple-100 text-purple-700 border-purple-200" },
}

function StatusBadge({ status }: { status: string }) {
  const key = (status ?? "").toLowerCase().replace(/\s/g, "")
  const cfg = STATUS_CONFIG[key] ?? { label: status, className: "" }
  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  valueClass = "",
}: {
  title: string
  value: number | string
  subtitle: string
  icon: React.ElementType
  valueClass?: string
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
        <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

// ─── Quick Action ─────────────────────────────────────────────────────────────

function QuickAction({
  to,
  icon: Icon,
  label,
  description,
}: {
  to: string
  icon: React.ElementType
  label: string
  description: string
}) {
  return (
    <Link to={to} className="block group">
      <Card className="h-full transition-shadow hover:shadow-md group-hover:border-primary/40">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="rounded-md bg-primary/10 p-2.5 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </CardContent>
      </Card>
    </Link>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const [bookings, setBookings] = useState<BookingDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setError(null)
        const data = await fetchAllBookings()
        if (mounted) setBookings(data || [])
      } catch (err: unknown) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load booking data. Please refresh the page."
          )
          setBookings([])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()

    const unsub = onBookingsChanged(() => void load())
    return () => {
      mounted = false
      unsub()
    }
  }, [])

  // ── KPI derivations ────────────────────────────────────────────────────────

  const todayCheckIns = useMemo(
    () =>
      bookings.filter(
        (b) =>
          isTodayHaiti(b.checkInDateUtc) &&
          (b.status ?? "").toLowerCase() !== "cancelled"
      ).length,
    [bookings]
  )

  const todayCheckOuts = useMemo(
    () =>
      bookings.filter(
        (b) =>
          isTodayHaiti(b.checkOutDateUtc) &&
          (b.status ?? "").toLowerCase() !== "cancelled"
      ).length,
    [bookings]
  )

  const cancelledCount = useMemo(
    () =>
      bookings.filter(
        (b) => (b.status ?? "").toLowerCase() === "cancelled"
      ).length,
    [bookings]
  )

  // ── Recent bookings — sorted by check-in descending ────────────────────────

  const recentBookings = useMemo(
    () =>
      [...bookings]
        .sort(
          (a, b) =>
            new Date(b.checkInDateUtc).getTime() -
            new Date(a.checkInDateUtc).getTime()
        )
        .slice(0, 6),
    [bookings]
  )

  // ── Today label ───────────────────────────────────────────────────────────

  const todayLabel = new Date().toLocaleDateString("en-US", {
    timeZone: "America/Port-au-Prince",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{todayLabel}</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{todayLabel}</p>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Bookings"
          value={bookings.length}
          subtitle="All reservations on record"
          icon={Calendar}
        />
        <KpiCard
          title="Today's Check-ins"
          value={todayCheckIns}
          subtitle="Expected arrivals today"
          icon={LogIn}
          valueClass={todayCheckIns > 0 ? "text-blue-600" : ""}
        />
        <KpiCard
          title="Today's Check-outs"
          value={todayCheckOuts}
          subtitle="Departures scheduled today"
          icon={LogOut}
          valueClass={todayCheckOuts > 0 ? "text-amber-600" : ""}
        />
        <KpiCard
          title="Cancelled"
          value={cancelledCount}
          subtitle="Total cancelled reservations"
          icon={XCircle}
          valueClass={cancelledCount > 0 ? "text-red-600" : ""}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickAction
            to="/room-booking"
            icon={BedDouble}
            label="New Booking"
            description="Reserve a room for a guest"
          />
          <QuickAction
            to="/bookings"
            icon={BookOpen}
            label="All Bookings"
            description="Search and manage reservations"
          />
          <QuickAction
            to="/clients"
            icon={Users}
            label="Clients"
            description="View and manage guest records"
          />
        </div>
      </div>

      <Separator />

      {/* Recent Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Recent Bookings</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/bookings" className="text-xs">
              View all
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>

        {bookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No bookings yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Create the first reservation to see it here.
              </p>
              <Button size="sm" className="mt-4" asChild>
                <Link to="/room-booking">
                  <Plus className="mr-1.5 h-4 w-4" />
                  New Booking
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentBookings.map((b) => (
                  <div
                    key={b.bookingId}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    {/* Avatar */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ${avatarBg(b.guestName)}`}
                    >
                      {getInitials(b.guestName)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {b.guestName || "Guest"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Room{b.roomNumbers?.includes(",") ? "s" : ""}{" "}
                        {b.roomNumbers || "—"} &nbsp;·&nbsp;{" "}
                        Check-in {formatIsoUtcToHaitiShort(b.checkInDateUtc)}
                      </p>
                    </div>

                    {/* Status */}
                    <StatusBadge status={b.status} />

                    {/* Ref */}
                    <span className="text-xs text-muted-foreground hidden md:block shrink-0">
                      {b.confirmationNumber}
                    </span>
                  </div>
                ))}
              </div>

              {bookings.length > 6 && (
                <div className="px-4 py-3 border-t">
                  <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                    <Link to="/bookings">
                      View all {bookings.length} bookings
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
