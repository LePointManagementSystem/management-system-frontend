import { Guest } from "@/types/client";

const BASE_URL = "http://54.144.47.187:5000/api/Guest";

export type CreateGuestPayload = {
  firstName: string;
  lastName: string;
  cin: string;
  email?: string; // optionnel si un jour tu veux le remettre
};

export async function fetchGuest(): Promise<Guest[]> {
  const token = localStorage.getItem("token");
  const response = await fetch(BASE_URL, {
    method: "GET",
    headers: {
      Accept: "text/plain",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch guests: ${response.statusText}`);
  }

  return (await response.json()) as Guest[];
}

export async function addGuest(payload: CreateGuestPayload): Promise<Guest> {
  const token = localStorage.getItem("token");

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add guest: ${response.statusText} - ${errorText}`);
  }

  return (await response.json()) as Guest;
}
