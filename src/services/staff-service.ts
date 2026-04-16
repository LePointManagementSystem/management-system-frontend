import { Staff, StaffCreateRequest } from "@/types/staff";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ✅ Type helper (si ton backend wrap certaines réponses)
type ApiResponse<T> = {
  succeeded?: boolean;
  message?: string;
  errors?: any;
  data?: T;
};

function getTokenOrThrow(): string {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No auth token found. Please log in again.");
  return token;
}

function normalizeStaffPayload<T extends Record<string, any>>(payload: T): T {
  const copy: any = { ...payload };

  // Si email vide -> on le supprime (backend reçoit pas la clé du tout)
  if (copy.email === "" || copy.email === undefined || copy.email === null) {
    delete copy.email;
  }

  // Si phone vide -> on le supprime aussi (optionnel)
  if (copy.phoneNumber === "" || copy.phoneNumber === undefined || copy.phoneNumber === null) {
    delete copy.phoneNumber;
  }

  // Nettoyage de base (optionnel mais safe)
  if (typeof copy.firstName === "string") copy.firstName = copy.firstName.trim();
  if (typeof copy.lastName === "string") copy.lastName = copy.lastName.trim();
  if (typeof copy.role === "string") copy.role = copy.role.trim();

  return copy;
}

function mapStaff(s: any): Staff {
  return {
    id: s.id ?? s.staffId ?? s.StaffId,            
    firstName: s.firstName ?? s.FirstName,
    lastName: s.lastName ?? s.LastName,
    role: s.role ?? s.Role,
    email: s.email ?? s.Email ?? null,
    phoneNumber: s.phoneNumber ?? s.PhoneNumber ?? null,
    hotelId: s.hotelId ?? s.HotelId,
    isActive: s.isActive ?? s.IsActive ?? true,
  }
}

// 🔹 Récupérer le profil du staff connecté (endpoint: GET /api/Staff/me)
export async function fetchMyStaffProfile(): Promise<Staff> {
  const token = getTokenOrThrow();

  const response = await fetch(`${BASE_URL}/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch staff profile: ${response.status} - ${JSON.stringify(json)}`
    );
  }

  // direct staff
  if (json && (json.hotelId !== undefined || json.HotelId !== undefined)) {
    return mapStaff(json);
  }

  // wrapped
  const wrapped = json as ApiResponse<any>;
  if (wrapped?.data) return mapStaff(wrapped.data);

  throw new Error("Staff profile response format is not recognized.");
}

// 🔹 Liste de tous les staffs
export async function fetchStaff(): Promise<Staff[]> {
  const token = getTokenOrThrow();

  const response = await fetch(BASE_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Failed to fetch staff list: ${response.status} - ${JSON.stringify(json)}`);
  }

  // backend renvoie tableau direct
  if (Array.isArray(json)) {
    return json.map(mapStaff);
  }

  // backend renvoie { data: [...] }
  const wrapped = json as ApiResponse<any[]>;
  if (wrapped?.data && Array.isArray(wrapped.data)) {
    return wrapped.data.map(mapStaff);
  }

  return [];
}

export async function addStaff(staff: StaffCreateRequest): Promise<Staff> {
  const token = getTokenOrThrow();

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(normalizeStaffPayload(staff)),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Failed to add staff: ${response.status} - ${JSON.stringify(json)}`);
  }

  // direct
  if (json && (json.id !== undefined || json.staffId !== undefined || json.StaffId !== undefined)) {
    return mapStaff(json);
  }

  // wrapped
  const wrapped = json as ApiResponse<any>;
  if (wrapped?.data) return mapStaff(wrapped.data);

  throw new Error("Add staff response format is not recognized.");
}


export async function updateStaff(
  id: number,
  staff: Partial<StaffCreateRequest>,
): Promise<Staff> {
  const token = getTokenOrThrow();

  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(normalizeStaffPayload(staff as any)),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Failed to update staff: ${response.status} - ${JSON.stringify(json)}`);
  }

  // direct
  if (json && (json.id !== undefined || json.staffId !== undefined || json.StaffId !== undefined)) {
    return mapStaff(json);
  }

  // wrapped
  const wrapped = json as ApiResponse<any>;
  if (wrapped?.data) return mapStaff(wrapped.data);

  throw new Error("Update staff response format is not recognized.");
}


export async function deleteStaff(id: number): Promise<void> {
  const token = getTokenOrThrow();

  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete staff: ${response.status} - ${errorText}`);
  }
}
