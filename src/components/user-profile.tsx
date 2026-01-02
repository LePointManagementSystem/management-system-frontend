import { useEffect, useMemo, useState } from "react"
import { Mail, Phone, MapPin, Briefcase, Calendar, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// --- Types (adaptés à ton backend) ---
type StaffMeDto = {
  staffId: number
  firstName: string
  lastName: string
  fullName?: string
  role?: string
  email?: string | null
  phoneNumber?: string | null
  hotelId: number
  hotelName?: string | null
  createdAtUtc?: string
  isActive?: boolean
}

type AuthMeDto = {
  id: string
  email?: string | null
  userName?: string | null
  firstName?: string | null
  lastName?: string | null
  phoneNumber?: string | null
  roles?: string[]
}

type AuthMeUpdateRequest = {
  firstName?: string
  lastName?: string
  email?: string
  phoneNumber?: string
  userName?: string
}

// --- Helpers API ---
const BASE_URL = "http://localhost:5004/api"

async function apiRequest<T>(url: string, options: RequestInit): Promise<T> {
  const token = localStorage.getItem("token")
  if (!token) throw new Error("No token found. Please login again.")

  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })

  const raw = await res.text()
  let json: any = null
  try {
    json = raw ? JSON.parse(raw) : null
  } catch {
    json = null
  }

  if (!res.ok) {
    // ton backend renvoie parfois ProblemDetails, parfois {message}, parfois {error}
    const msg =
      json?.message ||
      json?.title ||
      json?.error ||
      raw ||
      `Request failed (${res.status})`
    throw new Error(msg)
  }

  // ton backend renvoie souvent { data: ... }
  return (json?.data ?? json) as T
}

async function apiGet<T>(url: string): Promise<T> {
  return apiRequest<T>(url, { method: "GET" })
}

async function apiPut<T>(url: string, body: any): Promise<T> {
  return apiRequest<T>(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

async function fetchStaffMe(): Promise<StaffMeDto> {
  return apiGet<StaffMeDto>(`${BASE_URL}/Staff/me`)
}

async function fetchAuthMe(): Promise<AuthMeDto> {
  return apiGet<AuthMeDto>(`${BASE_URL}/auth/me`)
}

async function updateAuthMe(payload: AuthMeUpdateRequest): Promise<AuthMeDto> {
  // Ton backend doit exposer PUT /api/auth/me
  return apiPut<AuthMeDto>(`${BASE_URL}/auth/me`, payload)
}

// --- UI model (ce que ta page affiche) ---
type UserProfileView = {
  name: string
  email: string
  phone?: string
  address?: string
  position?: string
  department?: string
  joinDate?: string
  bio?: string
  avatar?: string
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const clean = (fullName || "").trim().replace(/\s+/g, " ")
  if (!clean) return { firstName: "", lastName: "" }
  const parts = clean.split(" ")
  if (parts.length === 1) return { firstName: parts[0], lastName: "" }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

const UserProfile = () => {
  const [userData, setUserData] = useState<UserProfileView | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedUserData, setEditedUserData] = useState<UserProfileView | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // feedback save
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // avatar fallback initials
  const initials = useMemo(() => {
    if (!userData?.name) return "U"
    const parts = userData.name.split(" ").filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }, [userData?.name])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        // 1) tenter Staff/me (si le user a un profil staff)
        const staff = await fetchStaffMe()

        const name = staff.fullName?.trim() || `${staff.firstName} ${staff.lastName}`.trim()
        const position = staff.role || localStorage.getItem("role") || "Staff"
        const department = staff.hotelName ? "Hotel Operations" : "Operations"
        const joinDate = staff.createdAtUtc || ""

        const profile: UserProfileView = {
          name,
          email: staff.email || "",
          phone: staff.phoneNumber || "",
          address: staff.hotelName ? staff.hotelName : `Hotel #${staff.hotelId}`,
          position,
          department,
          joinDate,
          bio: "", // backend ne renvoie pas "bio"
          avatar: "/placeholder.svg?height=100&width=100",
        }

        localStorage.setItem("displayName", profile.name)
        if (profile.email) localStorage.setItem("email", profile.email)

        if (mounted) {
          setUserData(profile)
          setEditedUserData(profile)
        }
        return
      } catch {
        // ignore -> fallback auth/me
      }

      try {
        // 2) fallback Auth/me
        const auth = await fetchAuthMe()
        const roles = auth.roles || []
        const role = roles[0] || localStorage.getItem("role") || "User"

        const name =
          [auth.firstName, auth.lastName].filter(Boolean).join(" ").trim() ||
          (auth.userName || auth.email || "User").toString()

        const profile: UserProfileView = {
          name,
          email: auth.email || "",
          phone: auth.phoneNumber || "",
          position: role,
          department: "Management",
          joinDate: "",
          bio: "",
          avatar: "/placeholder.svg?height=100&width=100",
        }

        localStorage.setItem("displayName", profile.name)
        if (profile.email) localStorage.setItem("email", profile.email)

        if (mounted) {
          setUserData(profile)
          setEditedUserData(profile)
        }
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || "Failed to load profile.")
          setUserData(null)
          setEditedUserData(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const handleEditProfile = async () => {
    if (!editedUserData) return

    setSaving(true)
    setSaveError(null)

    try {
      // On persiste via Auth/me (marche même si le user n'a pas de Staff)
      const { firstName, lastName } = splitFullName(editedUserData.name)

      const payload: AuthMeUpdateRequest = {
        firstName,
        lastName,
        email: editedUserData.email || "",
        phoneNumber: editedUserData.phone || "",
        // userName optionnel : si tu veux, tu peux le déduire du mail ou garder vide
      }

      const updated = await updateAuthMe(payload)

      // Rebuild UI avec ce que le backend renvoie (si backend renvoie firstName/lastName)
      const newName =
        [updated.firstName, updated.lastName].filter(Boolean).join(" ").trim() ||
        editedUserData.name

      const newProfile: UserProfileView = {
        ...editedUserData,
        name: newName,
        email: updated.email || editedUserData.email || "",
        phone: updated.phoneNumber || editedUserData.phone || "",
      }

      setUserData(newProfile)
      setEditedUserData(newProfile)
      setIsEditing(false)

      localStorage.setItem("displayName", newProfile.name)
      if (newProfile.email) localStorage.setItem("email", newProfile.email)
    } catch (e: any) {
      setSaveError(e?.message || "Failed to save changes.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-4 text-sm text-gray-600">Loading profile...</div>
  }

  if (error) {
    return <div className="p-4 text-sm text-red-600">{error}</div>
  }

  if (!userData || !editedUserData) {
    return <div className="p-4 text-sm text-gray-600">No profile data available.</div>
  }

  // --- EDIT MODE ---
  if (isEditing) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Edit Profile</h2>

        {saveError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {saveError}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={editedUserData.name}
              onChange={(e) => setEditedUserData({ ...editedUserData, name: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={editedUserData.email}
              onChange={(e) => setEditedUserData({ ...editedUserData, email: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={editedUserData.phone || ""}
              onChange={(e) => setEditedUserData({ ...editedUserData, phone: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={editedUserData.address || ""}
              onChange={(e) => setEditedUserData({ ...editedUserData, address: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              value={editedUserData.position || ""}
              onChange={(e) => setEditedUserData({ ...editedUserData, position: e.target.value })}
              disabled
            />
            <p className="mt-1 text-xs text-gray-500">
              Position is derived from role and is not editable here.
            </p>
          </div>

          <div>
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={editedUserData.department || ""}
              onChange={(e) => setEditedUserData({ ...editedUserData, department: e.target.value })}
              disabled
            />
            <p className="mt-1 text-xs text-gray-500">
              Department is derived from your profile and is not editable here.
            </p>
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={editedUserData.bio || ""}
              onChange={(e) => setEditedUserData({ ...editedUserData, bio: e.target.value })}
              disabled
            />
            <p className="mt-1 text-xs text-gray-500">
              Bio is not supported by the backend yet.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              setIsEditing(false)
              setEditedUserData(userData)
              setSaveError(null)
            }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleEditProfile} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    )
  }

  // --- VIEW MODE ---
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Profile</h2>
        <Button variant="outline" onClick={() => setIsEditing(true)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <Avatar className="h-32 w-32">
          <AvatarImage src={userData.avatar} alt={userData.name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <h3 className="text-2xl font-semibold">{userData.name}</h3>
        <Badge variant="secondary">{userData.position || "User"}</Badge>
      </div>

      <div className="space-y-4">
        {!!userData.email && (
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-gray-500" />
            <span>{userData.email}</span>
          </div>
        )}

        {!!userData.phone && (
          <div className="flex items-center space-x-2">
            <Phone className="h-5 w-5 text-gray-500" />
            <span>{userData.phone}</span>
          </div>
        )}

        {!!userData.address && (
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-gray-500" />
            <span>{userData.address}</span>
          </div>
        )}

        {!!userData.department && (
          <div className="flex items-center space-x-2">
            <Briefcase className="h-5 w-5 text-gray-500" />
            <span>{userData.department}</span>
          </div>
        )}

        {!!userData.joinDate && (
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span>Joined on {new Date(userData.joinDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {userData.bio && (
        <div>
          <h4 className="text-lg font-semibold mb-2">Bio</h4>
          <p>{userData.bio}</p>
        </div>
      )}
    </div>
  )
}

export default UserProfile
