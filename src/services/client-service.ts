import { Guest } from "@/types/client";

const BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function fetchGuest(): Promise<Guest[]> {
    const token = localStorage.getItem('token');
    const response = await fetch(`BASE_URL + Guest`, {
        method: 'GET',
        headers: {
            'Accept': 'text/plain',
            'Authorization': `Bearer ${token}`,
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch guests: ${response.statusText}`);
    }
    const data: Guest[] = await response.json();
    return data;
}

export async function addGuest(guest: Omit<Guest, 'id'>): Promise<Guest> {
  const token = localStorage.getItem('token');

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
       Accept: "application/json",
       Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(guest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add guest: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log("Added guest:", data);
  return data;
}