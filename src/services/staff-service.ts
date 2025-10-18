import { Staff, StaffCreateRequest } from "@/types/staff"; 

const BASE_URL = "http://localhost:5004/api/Staff";

export async function fetchStaff(): Promise<Staff[]> {
  const token = localStorage.getItem("token");
  const response = await fetch(BASE_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch staff: ${response.statusText}`);
  }

  return response.json();
}

export async function addStaff(staff: StaffCreateRequest): Promise<Staff> {
  const token = localStorage.getItem("token");
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(staff),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add staff: ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

export async function updateStaff(id: number, staff: Partial<StaffCreateRequest>): Promise<Staff> {
  const token = localStorage.getItem("token");
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(staff),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update staff: ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

export async function deleteStaff(id: number): Promise<void> {
  const token = localStorage.getItem("token");
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete staff: ${response.statusText} - ${errorText}`);
  }
}
