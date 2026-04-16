export type JwtClaims = {
  role?: string[] | string
  hotelId?: string | number
  staffId?: string | number
  [key: string]: any
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")
  const binary = atob(padded)

  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function decodeJwt(token: string): JwtClaims | null {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null
    const json = base64UrlDecode(payload)
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function getRolesFromClaims(claims: JwtClaims | null): string[] {
  if (!claims) return []
  const r = claims.role
  if (Array.isArray(r)) return r
  if (typeof r === "string") return [r]
  return []
}

export function pickPrimaryRole(roles: string[]): string {
  const order = ["Admin", "Manager", "Staff", "User"]
  for (const r of order) if (roles.includes(r)) return r
  return roles[0] ?? ""
}
