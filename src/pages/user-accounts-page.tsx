import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { createUserAccount, CreateUserAccountRequest, CreateUserRole } from "@/services/user-accounts-service";

const roles: CreateUserRole[] = ["Staff", "Receptionist", "Manager", "HR"];

export default function UserAccountsPage() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<CreateUserAccountRequest>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "Staff",
  });

  const reset = () =>
    setForm({ firstName: "", lastName: "", email: "", password: "", role: "Staff" });

  const submit = async () => {
    setError(null);
    setSuccess(null);

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password.trim()) {
      setError("First name, last name, email and password are required.");
      return;
    }

    setLoading(true);
    try {
      await createUserAccount({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
      });

      setSuccess(`Account created: ${form.email} (${form.role})`);
      reset();
      setOpen(false);
    } catch (e: any) {
      setError(e?.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Access Management</h2>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setError(null); setSuccess(null); setOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Create Account
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Create a login account</DialogTitle>
              <DialogDescription>
                Creates an Identity user and assigns role (Staff/Receptionist/Manager/HR).
                <br />
                <span className="font-medium">
                  After this, create the Staff profile (RH) to attach an Hotel scope.
                </span>
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">First Name</Label>
                <Input className="col-span-3" value={form.firstName}
                       onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Last Name</Label>
                <Input className="col-span-3" value={form.lastName}
                       onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Email</Label>
                <Input type="email" className="col-span-3" value={form.email}
                       onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Password</Label>
                <Input type="password" className="col-span-3" value={form.password}
                       onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Role</Label>
                <select
                  className="col-span-3 h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                >
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
              <Button onClick={submit} disabled={loading}>
                {loading ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {success && (
        <Alert>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle>Workflow</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2 text-gray-600">
          <p>1) Create an account here (login + role).</p>
          <p>2) Go to <b>Staff</b> page to create Staff profile (RH) and assign Hotel scope.</p>
          <p>3) Only Admin/Manager can book globally; other roles are scoped by Staff.HotelId.</p>
        </CardContent>
      </Card>
    </div>
  );
}
