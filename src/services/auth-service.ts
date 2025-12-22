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

const BASE_URL = "http://localhost:5004/api"

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
