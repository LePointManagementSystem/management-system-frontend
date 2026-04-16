const BASE_URL = import.meta.env.VITE_API_BASE_URL;

type ExportBookingsParams = {
  hotelId?: number;
  fromUtc?: string;
  toUtc?: string;
  status?: string; // all | pending | confirmed | cancelled | completed
};

type ExportCashSessionsParams = {
  hotelId: number;
  fromUtc?: string;
  toUtc?: string;
};

type ExportCashTransactionsParams = {
  hotelId: number;
  fromUtc?: string;
  toUtc?: string;
  currency?: number; // 1=HTG, 2=USD
  shift?: number; // 1=Morning, 2=Afternoon
  type?: number; // 1=IN, 2=OUT
};

type ExportGuestsParams = {};
type ExportStaffParams = {};
type ExportHotelStructureParams = {};

function tokenOrThrow(): string {
  const t = localStorage.getItem("token");
  if (!t) throw new Error("Not authenticated. Please log in again.");
  return t;
}

function pickFilenameFromContentDisposition(cd: string | null): string | null {
  if (!cd) return null;

  // supports: attachment; filename="x.xlsx" OR filename*=UTF-8''x.xlsx
  const utf8 = cd.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim().replace(/"/g, ""));
    } catch {
      return utf8[1].trim().replace(/"/g, "");
    }
  }

  const basic = cd.match(/filename\s*=\s*"?([^";]+)"?/i);
  return basic?.[1]?.trim() ?? null;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function exportExcel(
  path: string,
  params: Record<string, any>,
  fallbackFilename: string
): Promise<void> {
  const token = tokenOrThrow();

  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    qs.set(k, String(v));
  });

  const url = `${BASE_URL}/Reports/${path}${qs.toString() ? `?${qs.toString()}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, */*",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = text || `Export failed (${res.status})`;
    try {
      const json = text ? JSON.parse(text) : null;
      msg = json?.message || json?.Message || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const blob = await res.blob();

  const cd = res.headers.get("content-disposition");
  // ✅ finalName est garanti string (pas null)
  const finalName = pickFilenameFromContentDisposition(cd) || fallbackFilename;

  downloadBlob(blob, finalName);
}

// --------------------------
// Public exports (Excel)
// --------------------------

export async function exportBookingsExcel(p: ExportBookingsParams): Promise<void> {
  await exportExcel(
    "export/bookings",
    {
      hotelId: p.hotelId,
      fromUtc: p.fromUtc,
      toUtc: p.toUtc,
      status: p.status,
    },
    "Bookings.xlsx"
  );
}

export async function exportCashSessionsExcel(p: ExportCashSessionsParams): Promise<void> {
  await exportExcel(
    "export/cash-sessions",
    {
      hotelId: p.hotelId,
      fromUtc: p.fromUtc,
      toUtc: p.toUtc,
    },
    `CashSessions_Hotel${p.hotelId}.xlsx`
  );
}

export async function exportCashTransactionsExcel(p: ExportCashTransactionsParams): Promise<void> {
  await exportExcel(
    "export/cash-transactions",
    {
      hotelId: p.hotelId,
      fromUtc: p.fromUtc,
      toUtc: p.toUtc,
      currency: p.currency,
      shift: p.shift,
      type: p.type,
    },
    `PettyCash_Hotel${p.hotelId}.xlsx`
  );
}

export async function exportGuestsExcel(_: ExportGuestsParams = {}): Promise<void> {
  await exportExcel("export/guests", {}, "Guests.xlsx");
}

export async function exportStaffExcel(_: ExportStaffParams = {}): Promise<void> {
  await exportExcel("export/staff", {}, "Staff.xlsx");
}

export async function exportHotelStructureExcel(_: ExportHotelStructureParams = {}): Promise<void> {
  await exportExcel("export/hotel-structure", {}, "HotelStructure.xlsx");
}
