import { Guest } from "@/types/client";

const BASE_URL = "http://174.129.54.133:5000/api/Guest"

export async function fetchGuest(): Promise<Guest[]> {
    const token = localStorage.getItem('token');
    const response = await fetch(BASE_URL, {
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