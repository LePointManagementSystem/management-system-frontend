import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  CheckCircle,
  Download,
  Edit,
  Loader2,
  Plus,
  Power,
  Search,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Staff, StaffCreateRequest } from "@/types/staff";
import { Hotel } from "@/types/hotel";
import {
  addStaff,
  deleteStaff,
  fetchStaff,
  toggleStaffStatus,
  updateStaff,
} from "@/services/staff-service";
import { getHotels } from "@/services/hotel-service";
import { exportStaffExcel } from "@/services/reporting-service";

const STAFF_ROLES = [
  "Receptionist",
  "Manager",
  "Supervisor",
  "Housekeeping",
  "Maintenance",
  "Chef",
  "Waiter",
  "Security",
  "Valet",
  "Concierge",
  "Accountant",
  "IT",
];

type DialogMode = "add" | "edit" | "delete" | null;

interface FormFields {
  firstName: string;
  lastName: string;
  role: string;
  phoneNumber: string;
  hotelId: string;
  hasLogin: boolean;
  email: string;
  isActive: boolean;
}

const EMPTY_FORM: FormFields = {
  firstName: "",
  lastName: "",
  role: "",
  phoneNumber: "",
  hotelId: "",
  hasLogin: false,
  email: "",
  isActive: true,
};

function validateForm(f: FormFields): string | null {
  if (!f.firstName.trim() || !f.lastName.trim())
    return "First name and last name are required.";
  if (!f.role) return "Please select a role.";
  if (!f.hotelId) return "Please select a hotel.";
  if (f.hasLogin && !f.email.trim())
    return "Email is required when linked to a login account.";
  if (f.hasLogin && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
    return "Please enter a valid email address.";
  return null;
}

const ITEMS_PER_PAGE = 10;

const StaffPage: React.FC = () => {
  const location = useLocation();

  const [staff, setStaff] = useState<Staff[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [formFields, setFormFields] = useState<FormFields>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("search");
    if (q?.trim()) setSearchTerm(q.trim());
  }, [location.search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  async function loadAll() {
    setIsLoading(true);
    setPageError(null);
    try {
      const [staffData, hotelData] = await Promise.all([
        fetchStaff(),
        getHotels().catch(() => [] as Hotel[]),
      ]);
      setStaff(staffData);
      setHotels(hotelData);
    } catch {
      setPageError("Unable to load staff. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const filteredStaff = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) => {
      const name = `${s.firstName} ${s.lastName}`.toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      const role = s.role.toLowerCase();
      const phone = (s.phoneNumber ?? "").toLowerCase();
      const hotel = (s.hotelName ?? "").toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        role.includes(q) ||
        phone.includes(q) ||
        hotel.includes(q)
      );
    });
  }, [staff, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / ITEMS_PER_PAGE));
  const pagedStaff = filteredStaff.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 6000);
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedStaff(null);
    setFormFields(EMPTY_FORM);
    setFormError(null);
    setDeleteError(null);
  }

  function openAdd() {
    setFormFields(EMPTY_FORM);
    setFormError(null);
    setDialogMode("add");
  }

  function openEdit(member: Staff) {
    setSelectedStaff(member);
    const hasEmail = Boolean(member.email?.trim());
    setFormFields({
      firstName: member.firstName,
      lastName: member.lastName,
      role: member.role,
      phoneNumber: member.phoneNumber ?? "",
      hotelId: String(member.hotelId),
      hasLogin: hasEmail,
      email: member.email ?? "",
      isActive: member.isActive,
    });
    setFormError(null);
    setDialogMode("edit");
  }

  function openDelete(member: Staff) {
    setSelectedStaff(member);
    setDeleteError(null);
    setDialogMode("delete");
  }

  function buildPayload(): StaffCreateRequest {
    return {
      firstName: formFields.firstName.trim(),
      lastName: formFields.lastName.trim(),
      role: formFields.role,
      email: formFields.hasLogin ? formFields.email.trim() : null,
      phoneNumber: formFields.phoneNumber.trim() || null,
      hotelId: Number(formFields.hotelId),
      isActive: formFields.isActive,
    };
  }

  async function handleSave() {
    const err = validateForm(formFields);
    if (err) { setFormError(err); return; }
    setIsSaving(true);
    setFormError(null);
    try {
      const payload = buildPayload();
      if (dialogMode === "add") {
        const created = await addStaff(payload);
        setStaff((prev) => [...prev, created]);
        closeDialog();
        showSuccess(`${created.firstName} ${created.lastName} has been added to the staff.`);
      } else if (dialogMode === "edit" && selectedStaff) {
        const updated = await updateStaff(selectedStaff.id, payload);
        setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        closeDialog();
        showSuccess(`${updated.firstName} ${updated.lastName} has been updated.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save staff member.";
      if (formFields.hasLogin && (msg.toLowerCase().includes("user") || msg.toLowerCase().includes("email"))) {
        setFormError(
          "Could not link this email to a login account. Create the user account first in Access Management, then create the staff profile here using the same email."
        );
      } else {
        setFormError(msg);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedStaff) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteStaff(selectedStaff.id);
      setStaff((prev) => prev.filter((s) => s.id !== selectedStaff.id));
      const name = `${selectedStaff.firstName} ${selectedStaff.lastName}`;
      closeDialog();
      showSuccess(`${name} has been removed from the staff.`);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete staff member.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleToggleStatus(member: Staff) {
    setTogglingId(member.id);
    try {
      const updated = await toggleStaffStatus(member.id, !member.isActive);
      setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch {
      setPageError("Failed to update staff status. Please try again.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportStaffExcel();
    } catch {
      setPageError("Failed to export staff list. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (dialogMode === "add" || dialogMode === "edit")) {
      handleSave();
    }
  }

  const hotelName = (id: number) => {
    const h = hotels.find((h) => h.id === id);
    return h?.name ?? (id > 0 ? `Hotel #${id}` : "—");
  };

  return (
    <div className="p-6 space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Loading…"
              : `${staff.length} staff member${staff.length !== 1 ? "s" : ""} registered`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting || isLoading}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {exporting ? "Exporting…" : "Export Excel"}
          </Button>
          <Button onClick={openAdd} disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            Add Staff
          </Button>
        </div>
      </div>

      {/* ── Success banner ── */}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Page error ── */}
      {pageError && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      {/* ── Search ── */}
      <div className="flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, role, hotel, phone…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {searchTerm && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSearchTerm("")}
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {searchTerm && (
          <span className="text-sm text-muted-foreground">
            {filteredStaff.length} result{filteredStaff.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 text-center font-semibold">#</TableHead>
              <TableHead className="font-semibold">Full Name</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Hotel</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Loading staff…</p>
                </TableCell>
              </TableRow>
            ) : pagedStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <UserX className="mx-auto h-8 w-8 text-muted-foreground opacity-40" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {searchTerm
                      ? "No staff members match your search."
                      : "No staff registered yet. Click \"Add Staff\" to get started."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              pagedStaff.map((member, idx) => (
                <TableRow key={member.id} className="hover:bg-muted/40">
                  <TableCell className="text-center text-muted-foreground text-xs">
                    {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                  </TableCell>

                  <TableCell>
                    <div className="font-medium">
                      {member.firstName} {member.lastName}
                    </div>
                    {member.email && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {member.email}
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {member.role || "—"}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-sm">
                    {member.hotelName ?? hotelName(member.hotelId)}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {member.phoneNumber || "—"}
                  </TableCell>

                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 gap-1.5"
                      onClick={() => handleToggleStatus(member)}
                      disabled={togglingId === member.id}
                      title={member.isActive ? "Click to deactivate" : "Click to activate"}
                    >
                      {togglingId === member.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Power className="h-3 w-3" />
                      )}
                      <Badge
                        variant={member.isActive ? "default" : "outline"}
                        className={
                          member.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
                            : "text-muted-foreground"
                        }
                      >
                        {member.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </Button>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        title="Edit staff member"
                        onClick={() => openEdit(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        title="Delete staff member"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => openDelete(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════ ADD / EDIT DIALOG ══════════════ */}
      <Dialog
        open={dialogMode === "add" || dialogMode === "edit"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      >
        <DialogContent className="sm:max-w-[480px]" onKeyDown={handleKeyDown}>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit" ? "Edit Staff Member" : "Add New Staff Member"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "edit"
                ? "Update the staff member's information below."
                : "Fill in the details below. For staff who need system access, check \"Linked to Login Account\" and use the same email as their user account created in Access Management."}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-2">
            {/* First Name */}
            <div className="space-y-1.5">
              <Label htmlFor="sf-firstName">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sf-firstName"
                placeholder="e.g. Jean"
                value={formFields.firstName}
                onChange={(e) =>
                  setFormFields((f) => ({ ...f, firstName: e.target.value }))
                }
                autoFocus
              />
            </div>

            {/* Last Name */}
            <div className="space-y-1.5">
              <Label htmlFor="sf-lastName">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sf-lastName"
                placeholder="e.g. Dupont"
                value={formFields.lastName}
                onChange={(e) =>
                  setFormFields((f) => ({ ...f, lastName: e.target.value }))
                }
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label>
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formFields.role}
                onValueChange={(v) => setFormFields((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role…" />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hotel */}
            <div className="space-y-1.5">
              <Label>
                Hotel <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formFields.hotelId}
                onValueChange={(v) => setFormFields((f) => ({ ...f, hotelId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a hotel…" />
                </SelectTrigger>
                <SelectContent>
                  {hotels.map((h) => (
                    <SelectItem key={h.id} value={String(h.id)}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="sf-phone">Phone</Label>
              <Input
                id="sf-phone"
                type="tel"
                placeholder="e.g. +509 3700 0000"
                value={formFields.phoneNumber}
                onChange={(e) =>
                  setFormFields((f) => ({ ...f, phoneNumber: e.target.value }))
                }
              />
            </div>

            {/* Has Login Account */}
            <div className="flex items-start gap-3 rounded-md border p-3 bg-muted/30">
              <Checkbox
                id="sf-hasLogin"
                checked={formFields.hasLogin}
                onCheckedChange={(v) =>
                  setFormFields((f) => ({
                    ...f,
                    hasLogin: Boolean(v),
                    email: Boolean(v) ? f.email : "",
                  }))
                }
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="sf-hasLogin" className="cursor-pointer font-medium">
                  Linked to Login Account
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formFields.hasLogin
                    ? "This staff member can log in. Enter the same email used in Access Management."
                    : "HR-only staff with no system login access."}
                </p>
              </div>
            </div>

            {/* Email (conditional) */}
            {formFields.hasLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="sf-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sf-email"
                  type="email"
                  placeholder="e.g. jean.dupont@hotel.com"
                  value={formFields.email}
                  onChange={(e) =>
                    setFormFields((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
            )}

            {/* Is Active */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="sf-isActive"
                checked={formFields.isActive}
                onCheckedChange={(v) =>
                  setFormFields((f) => ({ ...f, isActive: Boolean(v) }))
                }
              />
              <Label htmlFor="sf-isActive" className="cursor-pointer">
                Active (can be scheduled and assigned to shifts)
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <span className="mr-auto text-xs text-muted-foreground self-center hidden sm:block">
              Press{" "}
              <kbd className="px-1 py-0.5 rounded border text-xs font-mono">
                Enter
              </kbd>{" "}
              to save
            </span>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dialogMode === "edit" ? "Save Changes" : "Add Staff Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════ DELETE CONFIRMATION DIALOG ══════════════ */}
      <Dialog
        open={dialogMode === "delete"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Staff Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently remove{" "}
              <span className="font-semibold text-foreground">
                {selectedStaff?.firstName} {selectedStaff?.lastName}
              </span>{" "}
              from the staff? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <Alert variant="destructive">
              <AlertTitle>Cannot Delete</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isDeleting}
            >
              {deleteError ? "Close" : "Cancel"}
            </Button>
            {!deleteError && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete Staff Member
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffPage;
