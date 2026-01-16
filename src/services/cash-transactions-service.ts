import { API_BASE_URL } from "@/config/api-base";

export type CashTransactionType = 1 | 2; // 1 = In, 2 = Out
export type CurrencyCode = 1 | 2; // 1 = HTG, 2 = USD
export type CashShift = 1 | 2; // 1 = Morning, 2 = Afternoon

export type CashTransactionDto = {
  cashTransactionId: number;
  hotelId: number;
  actorUserId: string;
  type: CashTransactionType;
  currency: CurrencyCode;
  amount: number;
  note: string;
  category?: string | null;
  reference?: string | null;
  shift?: CashShift | null; // ✅ new (backend may return it)
  createdAtUtc: string;
};

export type CreateCashTransactionPayload = {
  hotelId: number; // for Staff we can send 0, backend will enforce scope
  type: CashTransactionType;
  currency: CurrencyCode;
  amount: number;
  note: string;
  category?: string | null;
  reference?: string | null;
  shift?: CashShift; // ✅ new
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

export function cashTypeLabel(t: CashTransactionType): string {
  return t === 1 ? "IN" : "OUT";
}

export function currencyLabel(c: CurrencyCode): string {
  return c === 1 ? "HTG" : "USD";
}

export function shiftLabel(s?: CashShift | null): string {
  if (s === 2) return "Afternoon";
  return "Morning"; // default
}

/**
 * Backend: POST /api/CashTransactions
 */
export async function createCashTransaction(payload: CreateCashTransactionPayload): Promise<CashTransactionDto> {
  const token = tokenOrThrow();

  const res = await fetch(`${API_BASE_URL}/CashTransactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return await unwrap<CashTransactionDto>(res);
}

export type CashTransactionsQuery = {
  hotelId?: number; // ✅ optional (Staff can omit; Admin/Manager must pass)
  fromUtc?: string;
  toUtc?: string;
  type?: CashTransactionType;
  currency?: CurrencyCode;
  shift?: CashShift;
  page?: number;
  pageSize?: number;
};

/**
 * Backend: GET /api/CashTransactions?hotelId=...&fromUtc=...&toUtc=...&type=...&currency=...&shift=...
 */
export async function fetchCashTransactions(q: CashTransactionsQuery): Promise<CashTransactionDto[]> {
  const token = tokenOrThrow();

  const params = new URLSearchParams();

  // ✅ Only set hotelId if provided (Admin/Manager). Staff can omit; backend uses token scope.
  if (q.hotelId && q.hotelId > 0) params.set("hotelId", String(q.hotelId));

  if (q.fromUtc) params.set("fromUtc", q.fromUtc);
  if (q.toUtc) params.set("toUtc", q.toUtc);
  if (q.type) params.set("type", String(q.type));
  if (q.currency) params.set("currency", String(q.currency));
  if (q.shift) params.set("shift", String(q.shift));

  params.set("page", String(q.page ?? 1));
  params.set("pageSize", String(q.pageSize ?? 100));

  // Anti-cache
  params.set("t", String(Date.now()));

  const res = await fetch(`${API_BASE_URL}/CashTransactions?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  return (await unwrap<CashTransactionDto[]>(res)) || [];
}
