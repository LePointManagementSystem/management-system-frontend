import type { CurrencyCode, CashShift, CashTransactionType } from "@/services/cash-transactions-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── DTOs ─────────────────────────────────────────────────────────────────────

export type CashSessionDto = {
  cashSessionId: number;
  hotelId: number;
  currency: CurrencyCode;
  shift: CashShift;
  openingBalance: number;
  openedAtUtc: string;
  openedByUserId?: string | null;
  openedByUserName?: string | null;
  closingCounted?: number | null;
  closedAtUtc?: string | null;
  closedByUserId?: string | null;
  closedByUserName?: string | null;
  expected: number;
  difference: number;
  isClosed: boolean;
};

export type CashTransactionReportRow = {
  cashTransactionId: number;
  type: CashTransactionType;
  currency: CurrencyCode;
  shift: CashShift;
  amount: number;
  note: string;
  category?: string | null;
  reference?: string | null;
  actorUserId: string;
  actorUserName?: string | null;
  createdAtUtc: string;
};

export type CashSessionReportDto = {
  cashSessionId: number;
  hotelId: number;
  currency: CurrencyCode;
  shift: CashShift;
  openingBalance: number;
  openedAtUtc: string;
  openedByUserId: string;
  openedByUserName?: string | null;
  closingCounted?: number | null;
  closedAtUtc?: string | null;
  closedByUserId?: string | null;
  closedByUserName?: string | null;
  expected: number;
  difference: number;
  isClosed: boolean;
  totalIn: number;
  totalOut: number;
  transactions: CashTransactionReportRow[];
};

export type OpenCashSessionPayload = {
  hotelId: number;
  currency: CurrencyCode;
  shift: CashShift;
  openingBalance: number;
};

export type CloseCashSessionPayload = {
  cashSessionId: number;
  closingCounted: number;
};

export type ListCashSessionsParams = {
  hotelId: number;
  currency?: CurrencyCode;
  shift?: CashShift;
  fromUtc?: string;
  toUtc?: string;
  page?: number;
  pageSize?: number;
};

export type PagedResult<T> = {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
}

async function unwrapEnvelope<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }

  if (!res.ok) {
    const msg =
      json?.message || json?.Message || json?.error || text ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  const payload = json?.data ?? json?.Data ?? json;
  if (payload == null) throw new Error("Empty response from server.");
  return payload as T;
}

const BASE_SESSIONS = `${BASE_URL}/CashSessions`;

// ── API calls ─────────────────────────────────────────────────────────────────

export async function openCashSession(payload: OpenCashSessionPayload): Promise<CashSessionDto> {
  const res = await fetch(`${BASE_SESSIONS}/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return unwrapEnvelope<CashSessionDto>(res);
}

export async function closeCashSession(payload: CloseCashSessionPayload): Promise<CashSessionDto> {
  const res = await fetch(`${BASE_SESSIONS}/${payload.cashSessionId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ closingCounted: payload.closingCounted }),
  });
  return unwrapEnvelope<CashSessionDto>(res);
}

/**
 * Fetches the full session closure report (transactions + totals).
 * Call after closeCashSession() to get the shift summary.
 */
export async function fetchCashSessionReport(cashSessionId: number): Promise<CashSessionReportDto> {
  const res = await fetch(`${BASE_SESSIONS}/${cashSessionId}/report`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  return unwrapEnvelope<CashSessionReportDto>(res);
}

export async function listCashSessions(params: ListCashSessionsParams): Promise<PagedResult<CashSessionDto>> {
  const qs = new URLSearchParams();
  qs.set("hotelId", String(params.hotelId));
  if (params.currency !== undefined) qs.set("currency", String(params.currency));
  if (params.shift !== undefined) qs.set("shift", String(params.shift));
  if (params.fromUtc) qs.set("fromUtc", params.fromUtc);
  if (params.toUtc) qs.set("toUtc", params.toUtc);
  qs.set("page", String(params.page ?? 1));
  qs.set("pageSize", String(params.pageSize ?? 50));

  const res = await fetch(`${BASE_SESSIONS}?${qs.toString()}`, {
    headers: authHeaders(),
  });

  const raw: any = await unwrapEnvelope<any>(res);

  if (Array.isArray(raw)) {
    return { total: raw.length, page: params.page ?? 1, pageSize: params.pageSize ?? raw.length, items: raw };
  }

  const items = raw?.items ?? raw?.Items ?? [];
  return {
    total: raw?.total ?? raw?.Total ?? (Array.isArray(items) ? items.length : 0),
    page: raw?.page ?? raw?.Page ?? (params.page ?? 1),
    pageSize: raw?.pageSize ?? raw?.PageSize ?? (params.pageSize ?? 50),
    items,
  };
}

export async function getActiveCashSession(
  hotelId: number,
  currency: CurrencyCode,
  shift: CashShift
): Promise<CashSessionDto | null> {
  const data = await listCashSessions({ hotelId, currency, shift, page: 1, pageSize: 50 });
  return data.items.find((s) => !s.closedAtUtc) || null;
}
