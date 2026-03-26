import type { CurrencyCode, CashShift } from "@/services/cash-transactions-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type CashSessionDto = {
  cashSessionId: number;
  hotelId: number;

  currency: CurrencyCode;
  shift: CashShift;

  openingBalance: number;
  openedAtUtc: string;

  closingCounted?: number | null;
  closedAtUtc?: string | null;

  expected: number;
  difference: number;

  isClosed: boolean;
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

/* =========================
   API helpers
========================= */

// type ApiEnvelope<T> = {
//   succeeded?: boolean;
//   Succeeded?: boolean;
//   message?: string;
//   Message?: string;
//   data?: T;
//   Data?: T;
// };

async function unwrapEnvelope<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      json?.message ||
      json?.Message ||
      json?.error ||
      text ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  const payload = json?.data ?? json?.Data ?? json;

  if (payload == null) {
    throw new Error("Empty response from server.");
  }

  return payload as T;
}

/* =========================
   API calls
========================= */

const CASH_SESSIONS_BASE = `${BASE_URL}/CashSessions`;

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  };
}

export async function openCashSession(payload: OpenCashSessionPayload): Promise<CashSessionDto> {
  const res = await fetch(`${CASH_SESSIONS_BASE}/open`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return unwrapEnvelope<CashSessionDto>(res);
}

export async function closeCashSession(payload: CloseCashSessionPayload): Promise<CashSessionDto> {
  const res = await fetch(`${CASH_SESSIONS_BASE}/${payload.cashSessionId}/close`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ closingCounted: payload.closingCounted }),
  });

  return unwrapEnvelope<CashSessionDto>(res);
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

  const res = await fetch(`${CASH_SESSIONS_BASE}?${qs.toString()}`, {
    headers: { ...authHeaders() },
  });

  const raw: any = await unwrapEnvelope<any>(res);

  // ✅ IMPORTANT: support backend returning LIST OR PAGED OBJECT
  if (Array.isArray(raw)) {
    return {
      total: raw.length,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? raw.length,
      items: raw,
    };
  }

  // ✅ support camelCase OR PascalCase object
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
  const data = await listCashSessions({
    hotelId,
    currency,
    shift,
    page: 1,
    pageSize: 50,
  });

  return data.items.find((s) => !s.closedAtUtc) || null;
}
