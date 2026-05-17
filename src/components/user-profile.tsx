import { useEffect, useMemo, useState } from "react"
import { Calendar, Edit, Eye, EyeOff, KeyRound, Mail, MapPin, Phone, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

// ── Types ─────────────────────────────────────────────────────────────────────

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

type UpdateProfileRequest = {
  firstName?: string
  lastName?: string
  email?: string
  phoneNumber?: string
}

type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
}

// ── API helpers ───────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL

// BUG FIX #8: Changed localStorage → sessionStorage for token reads.
async function apiRequest<T>(url: string, options: RequestInit): Promise<T> {
  const token = sessionStorage.getItem("token") // BUG FIX #8: was localStorage
  if (!token) throw new Error("No token found. Please log in again.")

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
  try { json = raw ? JSON.parse(raw) : null } catch { json = null }

  if (!res.ok) {
    const msg = json?.message || json?.title || json?.error || raw || `Request failed (${res.status})`
    throw new Error(msg)
  }

  return (json?.data ?? json) as T
}

const apiGet  = <T,>(url: string) => apiRequest<T>(url, { method: "GET" })
const apiPut  = <T,>(url: string, body: unknown) =>
  apiRequest<T>(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

const fetchStaffMe   = () => apiGet<StaffMeDto>(`${BASE_URL}/Staff/me`)
const fetchAuthMe    = () => apiGet<AuthMeDto>(`${BASE_URL}/auth/me`)
const updateAuthMe   = (payload: UpdateProfileRequest) => apiPut<AuthMeDto>(`${BASE_URL}/auth/me`, payload)
const changePassword = (payload: ChangePasswordRequest) => apiPut<void>(`${BASE_URL}/auth/change-password`, payload)

// ── Internal view model ───────────────────────────────────────────────────────

type ProfileView = {
  firstName: string
  lastName:  string
  email:     string
  phone:     string
  hotelName: string
  role:      string
  joinDate:  string
}

const HAITI_TZ = "America/Port-au-Prince"

function formatDateHaiti(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat("en-US", {
    timeZone: HAITI_TZ,
    year:  "numeric",
    month: "long",
    day:   "2-digit",
  }).format(d)
}

function validatePassword(pw: string): string | null {
  if (pw.length < 8)          return "At least 8 characters required."
  if (!/[A-Z]/.test(pw))     return "Must contain at least one uppercase letter."
  if (!/[a-z]/.test(pw))     return "Must contain at least one lowercase letter."
  if (!/[0-9]/.test(pw))     return "Must contain at least one number."
  return null
}

// ── Component ─────────────────────────────────────────────────────────────────

const UserProfile = () => {
  const [profile, setProfile]     = useState<ProfileView | null>(null)
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [editing, setEditing]         = useState(false)
  const [editForm, setEditForm]       = useState<{ firstName: string; lastName: string; email: string; phone: string }>({ firstName: "", lastName: "", email: "", phone: "" })
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [pwSection, setPwSection]     = useState(false)
  const [pwForm, setPwForm]           = useState({ current: "", next: "", confirm: "" })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwSaving, setPwSaving]       = useState(false)
  const [pwError, setPwError]         = useState<string | null>(null)
  const [pwSuccess, setPwSuccess]     = useState(false)
  const [pwFieldErrors, setPwFieldErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})

  const initials = useMemo(() => {
    if (!profile) return "U"
    const fn = profile.firstName.trim()
    const ln = profile.lastName.trim()
    if (!fn && !ln) return "U"
    if (!ln) return fn.slice(0, 2).toUpperCase()
    return (fn[0] + ln[0]).toUpperCase()
  }, [profile])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setLoadError(null)

      try {
        const staff = await fetchStaffMe()
        const view: ProfileView = {
          firstName: staff.firstName?.trim() ?? "",
          lastName:  staff.lastName?.trim()  ?? "",
          email:     staff.email             ?? "",
          phone:     staff.phoneNumber       ?? "",
          hotelName: staff.hotelName         ?? (staff.hotelId ? `Hotel #${staff.hotelId}` : ""),
          // BUG FIX #8: Read role from sessionStorage.
          role:      staff.role              ?? sessionStorage.getItem("role") ?? "Staff",
          joinDate:  staff.createdAtUtc      ?? "",
        }
        if (mounted) {
          setProfile(view)
          setEditForm({ firstName: view.firstName, lastName: view.lastName, email: view.email, phone: view.phone })
          // BUG FIX #8: Write display metadata to sessionStorage.
          sessionStorage.setItem("displayName", `${view.firstName} ${view.lastName}`.trim() || "User")
          if (view.email) sessionStorage.setItem("email", view.email)
        }
        return
      } catch {
        // Staff/me failed — fall back to auth/me
      }

      try {
        const auth = await fetchAuthMe()
        const view: ProfileView = {
          firstName: auth.firstName?.trim() ?? "",
          lastName:  auth.lastName?.trim()  ?? "",
          email:     auth.email             ?? "",
          phone:     auth.phoneNumber       ?? "",
          hotelName: "",
          role:      auth.roles?.[0] ?? sessionStorage.getItem("role") ?? "User", // BUG FIX #8
          joinDate:  "",
        }
        if (mounted) {
          setProfile(view)
          setEditForm({ firstName: view.firstName, lastName: view.lastName, email: view.email, phone: view.phone })
          const displayName = [view.firstName, view.lastName].filter(Boolean).join(" ").trim()
            || auth.userName || auth.email || "User"
          sessionStorage.setItem("displayName", displayName) // BUG FIX #8
          if (view.email) sessionStorage.setItem("email", view.email)
        }
      } catch (e: any) {
        if (mounted) setLoadError(e?.message || "Failed to load profile.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  const handleSave = async () => {
    if (!editForm.firstName.trim()) { setSaveError("First name is required."); return }
    if (!editForm.email.trim())     { setSaveError("Email is required."); return }

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const updated = await updateAuthMe({
        firstName:   editForm.firstName.trim(),
        lastName:    editForm.lastName.trim(),
        email:       editForm.email.trim(),
        phoneNumber: editForm.phone.trim(),
      })

      const newProfile: ProfileView = {
        ...profile!,
        firstName: updated.firstName?.trim() ?? editForm.firstName,
        lastName:  updated.lastName?.trim()  ?? editForm.lastName,
        email:     updated.email             ?? editForm.email,
        phone:     updated.phoneNumber       ?? editForm.phone,
      }

      setProfile(newProfile)
      setEditing(false)
      setSaveSuccess(true)
      sessionStorage.setItem("displayName", `${newProfile.firstName} ${newProfile.lastName}`.trim() || "User") // BUG FIX #8
      if (newProfile.email) sessionStorage.setItem("email", newProfile.email) // BUG FIX #8

      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e: any) {
      setSaveError(e?.message || "Failed to save changes.")
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setEditing(false)
    setSaveError(null)
    if (profile) setEditForm({ firstName: profile.firstName, lastName: profile.lastName, email: profile.email, phone: profile.phone })
  }

  const handleChangePassword = async () => {
    const errors: typeof pwFieldErrors = {}
    if (!pwForm.current.trim()) errors.current = "Current password is required."
    const nextErr = validatePassword(pwForm.next)
    if (nextErr) errors.next = nextErr
    if (pwForm.next !== pwForm.confirm) errors.confirm = "Passwords do not match."

    if (Object.keys(errors).length > 0) { setPwFieldErrors(errors); return }

    setPwSaving(true)
    setPwError(null)
    setPwSuccess(false)
    setPwFieldErrors({})

    try {
      await changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next })
      setPwSuccess(true)
      setPwForm({ current: "", next: "", confirm: "" })
      setTimeout(() => { setPwSuccess(false); setPwSection(false) }, 3000)
    } catch (e: any) {
      setPwError(e?.message || "Failed to change password.")
    } finally {
      setPwSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading profile…
      </div>
    )
  }

  if (loadError) {
    return <div className="p-6 text-sm text-red-600">{loadError}</div>
  }

  if (!profile) {
    return <div className="p-6 text-sm text-muted-foreground">No profile data available.</div>
  }

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "User"

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Edit Profile</h2>
          <Button variant="ghost" size="icon" onClick={cancelEdit} disabled={saving}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {saveError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {saveError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ep-first">First Name <span className="text-red-500">*</span></Label>
            <Input
              id="ep-first"
              value={editForm.firstName}
              onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
              placeholder="e.g. Marie"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-last">Last Name</Label>
            <Input
              id="ep-last"
              value={editForm.lastName}
              onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
              placeholder="e.g. Dupont"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ep-email">Email Address <span className="text-red-500">*</span></Label>
          <Input
            id="ep-email"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="your@email.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ep-phone">Phone Number</Label>
          <Input
            id="ep-phone"
            type="tel"
            value={editForm.phone}
            onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+509 xxxx xxxx"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={cancelEdit} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving
              ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Saving…</>
              : <><Save className="h-4 w-4" /> Save Changes</>}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {saveSuccess && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Profile updated successfully.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Profile</h2>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-2">
          <Edit className="h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      <div className="flex flex-col items-center gap-3 py-2">
        <Avatar className="h-20 w-20 text-lg font-semibold">
          <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h3 className="text-lg font-semibold">{fullName}</h3>
          <Badge variant="secondary" className="mt-1">{profile.role}</Badge>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        {profile.email && (
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{profile.email}</span>
          </div>
        )}

        {profile.phone && (
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{profile.phone}</span>
          </div>
        )}

        {profile.hotelName && (
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{profile.hotelName}</span>
          </div>
        )}

        {profile.joinDate && (
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Member since {formatDateHaiti(profile.joinDate)}</span>
          </div>
        )}
      </div>

      <Separator />

      <div>
        <button
          type="button"
          className="flex w-full items-center justify-between text-sm font-medium hover:text-primary transition-colors"
          onClick={() => { setPwSection((v) => !v); setPwError(null); setPwSuccess(false); setPwFieldErrors({}) }}
        >
          <span className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Change Password
          </span>
          <span className="text-xs text-muted-foreground">{pwSection ? "Hide" : "Show"}</span>
        </button>

        {pwSection && (
          <div className="mt-4 space-y-4 rounded-lg border bg-muted/30 p-4">

            {pwError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{pwError}</div>
            )}
            {pwSuccess && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                Password changed successfully!
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="pw-current">Current Password</Label>
              <div className="relative">
                <Input
                  id="pw-current"
                  type={showCurrent ? "text" : "password"}
                  value={pwForm.current}
                  onChange={(e) => { setPwForm((f) => ({ ...f, current: e.target.value })); setPwFieldErrors((fe) => ({ ...fe, current: undefined })) }}
                  className={`pr-10 ${pwFieldErrors.current ? "border-red-500" : ""}`}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwFieldErrors.current && <p className="text-xs text-red-500">{pwFieldErrors.current}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pw-new">New Password</Label>
              <div className="relative">
                <Input
                  id="pw-new"
                  type={showNext ? "text" : "password"}
                  value={pwForm.next}
                  onChange={(e) => { setPwForm((f) => ({ ...f, next: e.target.value })); setPwFieldErrors((fe) => ({ ...fe, next: undefined })) }}
                  className={`pr-10 ${pwFieldErrors.next ? "border-red-500" : ""}`}
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNext((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showNext ? "Hide password" : "Show password"}
                >
                  {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwFieldErrors.next && <p className="text-xs text-red-500">{pwFieldErrors.next}</p>}

              {pwForm.next && (
                <ul className="text-xs text-muted-foreground space-y-0.5 pl-0.5 mt-1">
                  {[
                    { ok: pwForm.next.length >= 8,    text: "At least 8 characters" },
                    { ok: /[A-Z]/.test(pwForm.next),  text: "One uppercase letter" },
                    { ok: /[a-z]/.test(pwForm.next),  text: "One lowercase letter" },
                    { ok: /[0-9]/.test(pwForm.next),  text: "One number" },
                  ].map(({ ok, text }) => (
                    <li key={text} className={`flex items-center gap-1.5 ${ok ? "text-green-600" : ""}`}>
                      <span className="font-mono">{ok ? "✓" : "·"}</span> {text}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pw-confirm">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="pw-confirm"
                  type={showConfirm ? "text" : "password"}
                  value={pwForm.confirm}
                  onChange={(e) => { setPwForm((f) => ({ ...f, confirm: e.target.value })); setPwFieldErrors((fe) => ({ ...fe, confirm: undefined })) }}
                  className={`pr-10 ${pwFieldErrors.confirm ? "border-red-500" : ""}`}
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide" : "Show"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwFieldErrors.confirm && <p className="text-xs text-red-500">{pwFieldErrors.confirm}</p>}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setPwSection(false); setPwForm({ current: "", next: "", confirm: "" }); setPwError(null); setPwFieldErrors({}) }}
                disabled={pwSaving}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleChangePassword} disabled={pwSaving} className="gap-2">
                {pwSaving
                  ? <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Saving…</>
                  : <><KeyRound className="h-3.5 w-3.5" /> Update Password</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserProfile
