import { Guest } from "@/types/client";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const GUESTS_URL = `${BASE_URL}/Guest`;

/**
 * BUG FIX: Previously returned `null` silently.
 * This caused requests to go out with `Authorization: Bearer null` (literally
 * the string "null"), which is an invalid header that the server rejects with
 * a cryptic 401 instead of a clear "please log in" message.
 *
 * Fix: throw immediately so the calling page can show a proper error message.
 *
 * BUG FIX #8 (extended): Changed localStorage → sessionStorage.
 * The login page writes the token to sessionStorage; all reads must use the same store.
 */
function getToken(): string {
  const token = sessionStorage.getItem("token"); // BUG FIX #8: was localStorage
  if (!token) throw new Error("Not authenticated. Please log in again.");
  return token;
}

function normalizeGuest(raw: Record<string, unknown>): Guest {
  return {
    id:        ((raw.id        ?? raw.Id)        as string) || undefined,
    firstName: ((raw.firstName ?? raw.FirstName) as string) ?? "",
    lastName:  ((raw.lastName  ?? raw.LastName)  as string) ?? "",
    cin:       ((raw.cin       ?? raw.cIN ?? raw.CIN) as string) ?? "",
  };
}

export async function fetchGuests(): Promise<Guest[]> {
  const token = getToken();

  const response = await fetch(GUESTS_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch clients (${response.status})`);
  }

  const data = await response.json();
  const list = data?.data ?? data?.Data ?? data;
  if (!Array.isArray(list)) return [];
  return (list as Record<string, unknown>[]).map(normalizeGuest);
}

export async function fetchGuest(id: string): Promise<Guest | null> {
  const token = getToken();

  const response = await fetch(`${GUESTS_URL}/${id}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Failed to fetch client (${response.status})`);
  }

  const data = await response.json();
  const raw  = (data?.data ?? data?.Data ?? data) as Record<string, unknown>;
  return normalizeGuest(raw);
}

export async function addGuest(guest: Omit<Guest, "id">): Promise<Guest> {
  const token = getToken();

  const response = await fetch(GUESTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      firstName: guest.firstName,
      lastName:  guest.lastName,
      cin:       guest.cin,
    }),
  });

  if (response.status === 409) {
    throw new Error("A client with this CIN already exists.");
  }

  if (!response.ok) {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      throw new Error(parsed?.message ?? parsed?.error ?? `Failed to add client (${response.status})`);
    } catch {
      throw new Error(`Failed to add client (${response.status})`);
    }
  }

  const data = await response.json();
  const raw  = (data?.data ?? data?.Data ?? data) as Record<string, unknown>;
  return normalizeGuest(raw);
}

export async function updateGuest(
  id: string,
  guest: Omit<Guest, "id">
): Promise<void> {
  const token = getToken();

  const response = await fetch(`${GUESTS_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      firstName: guest.firstName,
      lastName:  guest.lastName,
      cin:       guest.cin,
    }),
  });

  if (response.status === 409) {
    throw new Error("A client with this CIN already exists.");
  }

  if (!response.ok) {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      throw new Error(parsed?.message ?? parsed?.error ?? `Failed to update client (${response.status})`);
    } catch {
      throw new Error(`Failed to update client (${response.status})`);
    }
  }
}

export async function deleteGuest(id: string): Promise<void> {
  const token = getToken();

  const response = await fetch(`${GUESTS_URL}/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      throw new Error(parsed?.message ?? parsed?.error ?? `Failed to delete client (${response.status})`);
    } catch {
      throw new Error(`Failed to delete client (${response.status})`);
    }
  }
}
