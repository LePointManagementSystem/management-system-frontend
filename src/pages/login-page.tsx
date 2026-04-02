import { useState } from 'react'
import BASE_URL from '@/config/api-base'
import { useNavigate } from 'react-router-dom'
import { login } from '@/services/auth-service'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { decodeJwt, getRolesFromClaims, pickPrimaryRole } from '@/utils/jwt'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// {
//   "email": "test@testuser.com",
//   "password": "Test231!"
// }



async function fetchWithToken(url: string, token: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  })

  const raw = await res.text()
  let json: any = null
  try {
    json = raw ? JSON.parse(raw) : null
  } catch {
    json = null
  }

  if (!res.ok) return null
  return json?.data ?? json
}

async function resolveDisplayName(token: string, fallbackEmail: string) {
  // 1) Staff/me
  const staff = await fetchWithToken(`${BASE_URL}/Staff/me`, token)
  const staffName =
    staff?.fullName ||
    (staff?.firstName && staff?.lastName ? `${staff.firstName} ${staff.lastName}` : null)

  if (staffName && String(staffName).trim() !== "") return String(staffName)

  // 2) Auth/me
  const auth = await fetchWithToken(`${BASE_URL}/auth/me`, token)
  const authName = auth?.userName || auth?.email
  if (authName && String(authName).trim() !== "") return String(authName)

  // 3) fallback email prefix
  return fallbackEmail ? fallbackEmail.split("@")[0] : "User"
}



export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError("Please enter email and password.")
      return
    }

    setIsLoading(true)

    try {
      const result = await login({ email: trimmedEmail, password })

      if (result.succeeded && result.token) {
        localStorage.removeItem("token")
        localStorage.removeItem("roles")
        localStorage.removeItem("role")
        localStorage.removeItem("hotelId")
        localStorage.removeItem("email")
        localStorage.removeItem("displayName")

        localStorage.setItem("token", result.token)
        localStorage.setItem("email", trimmedEmail)

        const claims = decodeJwt(result.token)

        // roles: prefer token claims, fallback to backend response
        const rolesFromToken = getRolesFromClaims(claims)
        const roles = (result.roles && result.roles.length > 0) ? result.roles : rolesFromToken
        const primaryRole = pickPrimaryRole(roles)

        localStorage.setItem("roles", JSON.stringify(roles))
        localStorage.setItem("role", primaryRole)

        const hotelId =
          (claims as any)?.hotelId ??
          (claims as any)?.HotelId ??
          (claims as any)?.hotel_id ??
          (claims as any)?.staffHotelId

        if (hotelId != null && String(hotelId).trim() !== "") {
          localStorage.setItem("hotelId", String(hotelId))
        }

        try {
          const name = await resolveDisplayName(result.token, trimmedEmail)
          localStorage.setItem("displayName", name)
        } catch {
          localStorage.setItem("displayName", trimmedEmail.split("@")[0])
        }

        navigate("/dashboard")
        return
      }

      setError(result.message || "Invalid email or password")
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              <span className="text-[#40c4a7]">Inn</span>
              <span className="text-gray-900">Manager</span>
            </h1>
          </div>
          <CardDescription>Login to access your dashboard</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Hide password" : "Show password"}
                  </span>
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
