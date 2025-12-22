import { Staff, StaffCreateRequest } from "@/types/staff"

const BASE_URL = "http://localhost:5004/api/Staff"

// 🔹 Récupérer le profil du staff connecté (endpoint: GET /api/Staff/me)
export async function fetchMyStaffProfile(): Promise<Staff> {
  const token = localStorage.getItem("token")
  if (!token) throw new Error("No auth token found. Please log in again.")

  const response = await fetch(`${BASE_URL}/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  })

  const json = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      `Failed to fetch staff profile: ${response.status} - ${JSON.stringify(json)}`
    )
  }

  // ✅ si le backend renvoie directement Staff
  if (json && (json.hotelId !== undefined || json.isActive !== undefined || json.id !== undefined)) {
    return json as Staff
  }

  // ✅ si le backend renvoie ApiResponse<Staff> (wrapped)
  const wrapped = json as ApiResponse<Staff>
  if (wrapped?.data) return wrapped.data

  throw new Error("Staff profile response format is not recognized.")
}
// 🔹 (optionnel) Liste de tous les staffs – pour une page Admin plus tard
export async function fetchStaff(): Promise<Staff[]> {
  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("No auth token found. Please log in again.")
  }

  const response = await fetch(BASE_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch staff list: ${response.status} - ${errorText}`)
  }

  return response.json()
}

export async function addStaff(staff: StaffCreateRequest): Promise<Staff> {
  const token = localStorage.getItem("token")
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(staff),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to add staff: ${response.statusText} - ${errorText}`)
  }

  return response.json()
}

export async function updateStaff(
  id: number,
  staff: Partial<StaffCreateRequest>,
): Promise<Staff> {
  const token = localStorage.getItem("token")
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(staff),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to update staff: ${response.statusText} - ${errorText}`)
  }

  return response.json()
}

export async function deleteStaff(id: number): Promise<void> {
  const token = localStorage.getItem("token")
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to delete staff: ${response.statusText} - ${errorText}`)
  }
}
