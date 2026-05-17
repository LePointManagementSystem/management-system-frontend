export type CreateUserRole = "Staff" | "Receptionist" | "Manager" | "HR";

export interface CreateUserAccountRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: CreateUserRole;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// BUG FIX #8 (extended): Changed localStorage → sessionStorage.
// The login page writes the token to sessionStorage; all reads must use the same store.
export async function createUserAccount(payload: CreateUserAccountRequest) {
  const token = sessionStorage.getItem("token"); // BUG FIX #8: was localStorage
  if (!token) throw new Error("No auth token. Please log in again.");

  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const txt = await res.text();
  let json: any = null;
  try { json = txt ? JSON.parse(txt) : null; } catch { json = null; }

  if (!res.ok) {
    throw new Error(json?.message || json?.error || txt || `Request failed (${res.status})`);
  }

  return json?.data ?? json ?? { succeeded: true };
}
