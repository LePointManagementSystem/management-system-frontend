export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  succeeded: boolean
  token?: string
  username?: string
  message?: string
  role?: string
  roles?: string[]
}

export interface AuthMeDto {
  id: string
  email: string
  userName: string
  roles: string[]
}

const BASE_URL = "http://54.144.47.187:5000/api"

function getTokenOrThrow(): string {
  const token = localStorage.getItem("token")
  if (!token) throw new Error("No auth token found. Please log in again.")
  return token
}

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(credentials),
    })

    // 👉 Essayer de lire le body en JSON, sinon fallback texte
    const rawText = await response.text()
    let payload: any = null
    try {
      payload = rawText ? JSON.parse(rawText) : null
    } catch {
      payload = null
    }

    if (!response.ok) {
      const msg =
        payload?.message ||
        payload?.error ||
        rawText ||
        "Login failed"
      return { succeeded: false, message: msg }
    }

    // ✅ Supporte plusieurs formats possibles
    const root = payload?.data ?? payload

    const token: string | undefined = root?.token
    const username: string | undefined = root?.username ?? root?.userName
    const roles: string[] = root?.roles ?? []

    return {
      succeeded: true,
      token,
      username,
      role: roles[0],
      roles,
    }
  } catch (error) {
    return { succeeded: false, message: "Network error" }
  }
}

// 🔹 Profil Identity du user connecté (GET /api/auth/me)
export const fetchAuthMe = async (): Promise<AuthMeDto> => {
  const token = getTokenOrThrow()

  const response = await fetch(`${BASE_URL}/auth/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  })

  const rawText = await response.text()
  let payload: any = null
  try {
    payload = rawText ? JSON.parse(rawText) : null
  } catch {
    payload = null
  }

  if (!response.ok) {
    const msg = payload?.message || payload?.error || rawText || `Request failed (${response.status})`
    throw new Error(msg)
  }

  const root = payload?.data ?? payload

  return {
    id: root?.id ?? root?.Id,
    email: root?.email ?? root?.Email,
    userName: root?.userName ?? root?.UserName,
    roles: root?.roles ?? root?.Roles ?? [],
  }
}
