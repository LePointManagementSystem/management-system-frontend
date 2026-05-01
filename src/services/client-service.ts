import { Guest } from "@/types/client";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const GUESTS_URL = `${BASE_URL}/Guest`;

function getToken(): string | null {
  return localStorage.getItem("token");
}

function normalizeGuest(raw: Record<string, unknown>): Guest {
  return {
    id: ((raw.id ?? raw.Id) as string) || undefined,
    firstName: ((raw.firstName ?? raw.FirstName) as string) ?? "",
    lastName: ((raw.lastName ?? raw.LastName) as string) ?? "",
    cin: ((raw.cin ?? raw.cIN ?? raw.CIN) as string) ?? "",
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
    throw new Error(`Failed to fetch guests (${response.status})`);
  }

  const data = await response.json();
  return (data as Record<string, unknown>[]).map(normalizeGuest);
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
      lastName: guest.lastName,
      cin: guest.cin,
    }),
  });

  if (response.status === 409) {
    throw new Error("A guest with this CIN already exists.");
  }

  if (!response.ok) {
    throw new Error(`Failed to add guest (${response.status})`);
  }

  const data = await response.json();
  return normalizeGuest(data as Record<string, unknown>);
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
      lastName: guest.lastName,
      cin: guest.cin,
    }),
  });

  if (response.status === 409) {
    throw new Error("A guest with this CIN already exists.");
  }

  if (!response.ok) {
    throw new Error(`Failed to update guest (${response.status})`);
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

  if (response.status === 409) {
    const msg = await response.text();
    throw new Error(
      msg?.trim() ||
        "This client has existing bookings and cannot be deleted. Please cancel or reassign their bookings first."
    );
  }

  if (!response.ok) {
    throw new Error(`Failed to delete guest (${response.status})`);
  }
}

export const fetchGuest = fetchGuests;

export type CreateGuestPayload = Omit<Guest, "id">;
