import { Staff, StaffCreateRequest } from "@/types/staff";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const STAFF_URL = `${BASE_URL}/staff`;

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem("token");
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

function unwrapData<T>(json: unknown): T {
  if (json !== null && typeof json === "object" && "data" in (json as object)) {
    return (json as Record<string, unknown>).data as T;
  }
  return json as T;
}

function normalizeStaff(raw: Record<string, unknown>): Staff {
  return {
    id: Number(raw.staffId ?? raw.id ?? raw.StaffId ?? raw.Id ?? 0),
    firstName: ((raw.firstName ?? raw.FirstName) as string) ?? "",
    lastName: ((raw.lastName ?? raw.LastName) as string) ?? "",
    fullName: ((raw.fullName ?? raw.FullName) as string) ?? undefined,
    role: ((raw.role ?? raw.Role) as string) ?? "",
    email: ((raw.email ?? raw.Email) as string | null) ?? null,
    phoneNumber: ((raw.phoneNumber ?? raw.PhoneNumber) as string | null) ?? null,
    hotelId: Number(raw.hotelId ?? raw.HotelId ?? 0),
    hotelName: ((raw.hotelName ?? raw.HotelName) as string | null) ?? null,
    isActive: Boolean(raw.isActive ?? raw.IsActive ?? true),
    createdAtUtc: (raw.createdAtUtc ?? raw.CreatedAtUtc) as string | undefined,
    updatedAtUtc: (raw.updatedAtUtc ?? raw.UpdatedAtUtc) as string | undefined,
  };
}

async function parseError(response: Response): Promise<string> {
  const txt = await response.text();
  try {
    const parsed = JSON.parse(txt);
    return parsed?.message ?? parsed?.title ?? txt;
  } catch {
    return txt || `HTTP ${response.status}`;
  }
}

export async function fetchStaff(): Promise<Staff[]> {
  const response = await fetch(STAFF_URL, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to fetch staff (${response.status})`);
  const json = await response.json();
  const arr = unwrapData<unknown[]>(json);
  return (Array.isArray(arr) ? arr : []).map((r) =>
    normalizeStaff(r as Record<string, unknown>)
  );
}

export async function addStaff(staff: StaffCreateRequest): Promise<Staff> {
  const response = await fetch(STAFF_URL, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(staff),
  });
  if (!response.ok) {
    const msg = await parseError(response);
    throw new Error(msg);
  }
  const json = await response.json();
  return normalizeStaff(unwrapData<Record<string, unknown>>(json));
}

export async function updateStaff(
  id: number,
  staff: Partial<StaffCreateRequest>
): Promise<Staff> {
  const response = await fetch(`${STAFF_URL}/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(staff),
  });
  if (!response.ok) {
    const msg = await parseError(response);
    throw new Error(msg);
  }
  const json = await response.json();
  return normalizeStaff(unwrapData<Record<string, unknown>>(json));
}

export async function deleteStaff(id: number): Promise<void> {
  const response = await fetch(`${STAFF_URL}/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) {
    const msg = await parseError(response);
    throw new Error(msg);
  }
}

export async function toggleStaffStatus(
  id: number,
  isActive: boolean
): Promise<Staff> {
  const response = await fetch(`${STAFF_URL}/${id}/status`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(isActive),
  });
  if (!response.ok) {
    const msg = await parseError(response);
    throw new Error(msg);
  }
  const json = await response.json();
  return normalizeStaff(unwrapData<Record<string, unknown>>(json));
}

export async function fetchMyStaffProfile(): Promise<Staff | null> {
  const response = await fetch(`${STAFF_URL}/me`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to fetch staff profile (${response.status})`);
  const json = await response.json();
  const raw = unwrapData<Record<string, unknown>>(json);
  return raw ? normalizeStaff(raw) : null;
}
