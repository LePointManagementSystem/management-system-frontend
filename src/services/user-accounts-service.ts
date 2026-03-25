export type CreateUserRole = "Staff" | "Receptionist" | "Manager" | "HR";

export interface CreateUserAccountRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: CreateUserRole;
}

const BASE_URL = "http://54.144.47.187:5000/api";

export async function createUserAccount(payload: CreateUserAccountRequest) {
  const token = localStorage.getItem("token");
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
