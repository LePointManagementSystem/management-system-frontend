import { Guest } from "@/types/client";

const BASE_URL = "http://localhost:5004/api/Guest"


export async function fetchGuest(token: string): Promise<Guest[]> {
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
     console.log(response.json());

    return response.json();
}