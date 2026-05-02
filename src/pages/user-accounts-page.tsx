import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Users, ShieldCheck,
} from "lucide-react";
import { createUserAccount, CreateUserRole } from "@/services/user-accounts-service";

const ROLES: { value: CreateUserRole; label: string; description: string }[] = [
  { value: "Staff",        label: "Staff",        description: "Basic access, limited to assigned hotel" },
  { value: "Receptionist", label: "Receptionist", description: "Manages bookings and guests" },
  { value: "Manager",      label: "Manager",      description: "Multi-hotel oversight and reports" },
  { value: "HR",           label: "HR",           description: "Staff management, no booking access" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PasswordStrength = "weak" | "medium" | "strong";

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return "weak";
  if (score <= 3) return "medium";
  return "strong";
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  return null;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: CreateUserRole;
}

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "Staff",
};

export default function UserAccountsPage() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<{ email: string; role: string } | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const strength = form.password ? getPasswordStrength(form.password) : null;

  const strengthLabel: Record<PasswordStrength, string> = {
    weak: "Weak", medium: "Medium", strong: "Strong",
  };
  const strengthColor: Record<PasswordStrength, string> = {
    weak: "bg-red-500", medium: "bg-yellow-500", strong: "bg-green-500",
  };
  const strengthWidth: Record<PasswordStrength, string> = {
    weak: "w-1/3", medium: "w-2/3", strong: "w-full",
  };

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setError(null);
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};

    if (!form.firstName.trim()) errors.firstName = "First name is required.";
    if (!form.lastName.trim())  errors.lastName  = "Last name is required.";

    if (!form.email.trim()) {
      errors.email = "Email is required.";
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      errors.email = "Invalid email format.";
    }

    const pwdErr = validatePassword(form.password);
    if (pwdErr) {
      errors.password = pwdErr;
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setForm(EMPTY_FORM);
      setFieldErrors({});
      setError(null);
      setShowPassword(false);
      setShowConfirm(false);
    }
    setOpen(val);
  };

  const submit = async () => {
    if (!validate()) return;
    setError(null);
    setLoading(true);

    try {
      await createUserAccount({
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email.trim(),
        password:  form.password,
        role:      form.role,
      });

      setCreatedUser({ email: form.email.trim(), role: form.role });
      handleOpenChange(false);
    } catch (e: any) {
      setError(e?.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedRoleInfo = ROLES.find((r) => r.value === form.role);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Access Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create login accounts for hotel staff members.
          </p>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Account
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Create a login account
              </DialogTitle>
              <DialogDescription>
                Fill in the details below. The staff member will be able to
                sign in using these credentials.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive" className="mt-1">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4 py-2">

              {/* First / Last name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="e.g. John"
                    value={form.firstName}
                    onChange={(e) => setField("firstName", e.target.value)}
                    className={fieldErrors.firstName ? "border-red-500" : ""}
                  />
                  {fieldErrors.firstName && (
                    <p className="text-xs text-red-500">{fieldErrors.firstName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lastName">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="e.g. Smith"
                    value={form.lastName}
                    onChange={(e) => setField("lastName", e.target.value)}
                    className={fieldErrors.lastName ? "border-red-500" : ""}
                  />
                  {fieldErrors.lastName && (
                    <p className="text-xs text-red-500">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. john.smith@hotel.com"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  className={fieldErrors.email ? "border-red-500" : ""}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-500">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    className={`pr-10 ${fieldErrors.password ? "border-red-500" : ""}`}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {form.password && strength && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strengthColor[strength]} ${strengthWidth[strength]}`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Strength: <span className="font-medium">{strengthLabel[strength]}</span>
                    </p>
                  </div>
                )}

                {fieldErrors.password && (
                  <p className="text-xs text-red-500">{fieldErrors.password}</p>
                )}

                <ul className="text-xs text-muted-foreground space-y-0.5 pl-0.5">
                  {[
                    { ok: form.password.length >= 8,    text: "At least 8 characters" },
                    { ok: /[A-Z]/.test(form.password),  text: "One uppercase letter" },
                    { ok: /[a-z]/.test(form.password),  text: "One lowercase letter" },
                    { ok: /[0-9]/.test(form.password),  text: "One number" },
                  ].map(({ ok, text }) => (
                    <li key={text} className={`flex items-center gap-1.5 ${ok ? "text-green-600" : ""}`}>
                      <span className="font-mono">{ok ? "✓" : "·"}</span> {text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={form.confirmPassword}
                    onChange={(e) => setField("confirmPassword", e.target.value)}
                    className={`pr-10 ${fieldErrors.confirmPassword ? "border-red-500" : ""}`}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    aria-label={showConfirm ? "Hide" : "Show"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-red-500">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <Label>
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.role}
                  onValueChange={(val) => setField("role", val as CreateUserRole)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <span className="font-medium">{r.label}</span>
                        <span className="text-muted-foreground text-xs ml-2">— {r.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRoleInfo && (
                  <p className="text-xs text-muted-foreground">{selectedRoleInfo.description}</p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 mt-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success banner */}
      {createdUser && (
        <Alert className="border-green-200 bg-green-50 text-green-900">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Account created successfully!</AlertTitle>
          <AlertDescription className="space-y-2 mt-1">
            <p>
              <span className="font-medium">{createdUser.email}</span> can now sign in
              with the <Badge variant="outline" className="ml-1 text-green-700 border-green-400">{createdUser.role}</Badge> role.
            </p>
            <p className="text-green-700 text-sm">
              Next step: go to the <strong>Staff</strong> page to create the HR profile
              and assign a hotel to this user.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-1 border-green-400 text-green-800 hover:bg-green-100 gap-1"
              onClick={() => navigate("/staff")}
            >
              Go to Staff page <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Workflow guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-primary" />
            How to create a complete access?
          </CardTitle>
          <CardDescription>
            Follow these two steps to give a staff member full access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                1
              </span>
              <div>
                <p className="font-medium">
                  Create a login account{" "}
                  <span className="text-muted-foreground font-normal text-sm">(this page)</span>
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Set the email, password and role. The user will then be able to sign in.
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-bold">
                2
              </span>
              <div>
                <p className="font-medium">
                  Create a Staff profile{" "}
                  <button
                    type="button"
                    className="text-primary underline underline-offset-2 text-sm ml-1 hover:text-primary/80"
                    onClick={() => navigate("/staff")}
                  >
                    → Go to Staff page
                  </button>
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Link the user to a hotel and complete their HR profile (phone, position…).
                  Without this step, the user will not have access to any hotel.
                </p>
              </div>
            </li>
          </ol>

          <div className="mt-5 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            <strong>Note:</strong> <strong>Admin</strong> and <strong>Manager</strong> roles have
            global access to all hotels. Other roles are limited to the hotel assigned in their
            Staff profile.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
