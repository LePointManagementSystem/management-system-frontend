import { API_BASE_URL } from "@/config/api-base";

export type CurrencyCode = 1 | 2; // 1=HTG, 2=USD (align with backend)

export type CashMonthlySummaryDto = {
  currency: CurrencyCode;
  totalIn: number;
  totalOut: number;
  // Some backend versions might not return Net; UI can compute it.
  net?: number;
};

export type CancellationReasonCountDto = {
  reason: string;
  count: number;
};

export type MonthlyHotelReportDto = {
  hotelId: number;
  year: number;
  month: number;
  periodStartUtc: string;
  periodEndUtc: string;
  daysInMonth: number;

  totalRooms: number;
  occupiedRoomNights: number;
  availableRoomNights: number;
  occupancyRate: number; // 0..1

  bookingsCreatedCount: number;
  confirmedCount: number;
  completedCount: number;
  cancelledCount: number;

  revenueTotal: number;
  revenueCompleted: number;

  cashSummary: CashMonthlySummaryDto[];
  topCancellationReasons: CancellationReasonCountDto[];
};

type ApiEnvelope<T> = {
  succeeded?: boolean;
  Succeeded?: boolean;
  message?: string;
  Message?: string;
  data?: T;
  Data?: T;
};

function tokenOrThrow(): string {
  const t = localStorage.getItem("token");
  if (!t) throw new Error("Not authenticated. Please log in again.");
  return t;
}

export function getOptionalHotelId(): number | null {
  const raw = localStorage.getItem("hotelId");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function currencyLabel(c: CurrencyCode): string {
  return c === 1 ? "HTG" : "USD";
}

async function unwrap<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: any = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // non-json
  }

  if (!res.ok) {
    const msg = json?.message || json?.Message || text || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  if (json && typeof json === "object") {
    const env = json as ApiEnvelope<T>;
    if (env.Data !== undefined) return env.Data as T;
    if (env.data !== undefined) return env.data as T;
  }

  return json as T;
}

export type GetMonthlyReportArgs = {
  hotelId?: number;
  year: number;
  month: number; // 1..12
};

/**
 * Backend: GET /api/Reports/monthly?hotelId=1&year=2026&month=1
 * - Staff: hotelId can be omitted (scoped server-side)
 */
export async function getMonthlyHotelReport(args: GetMonthlyReportArgs): Promise<MonthlyHotelReportDto> {
  const token = tokenOrThrow();

  const q = new URLSearchParams();
  q.set("year", String(args.year));
  q.set("month", String(args.month));
  if (args.hotelId) q.set("hotelId", String(args.hotelId));

  const res = await fetch(`${API_BASE_URL}/Reports/monthly?${q.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const r = await unwrap<MonthlyHotelReportDto>(res);
  // Normalize: ensure cashSummary.net exists
  if (Array.isArray((r as any).cashSummary)) {
    (r as any).cashSummary = (r as any).cashSummary.map((c: any) => ({
      ...c,
      net: typeof c.net === "number" ? c.net : (Number(c.totalIn ?? 0) - Number(c.totalOut ?? 0)),
    }));
  }
  return r;
}
