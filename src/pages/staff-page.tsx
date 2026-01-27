import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Plus, Trash2, Download } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import DataTable, { TableColumn } from 'react-data-table-component';
import { fetchStaff, addStaff, updateStaff, deleteStaff } from '@/services/staff-service';
import { Staff, StaffCreateRequest } from '@/types/staff';
import { Hotel } from '@/types/hotel';
import { getHotels } from '@/services/hotel-service';
import { exportStaffExcel } from '@/services/reporting-service';

const StaffPage: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);

  // ✅ RH-only vs has login
  const [hasLoginAccount, setHasLoginAccount] = useState(true);

  // ✅ Export loading
  const [exporting, setExporting] = useState(false);

  const [form, setForm] = useState<StaffCreateRequest>({
    firstName: '',
    lastName: '',
    role: '',
    email: '',        // RH-only will keep this empty
    phoneNumber: '',
    hotelId: 1,
    isActive: true,
  });

  useEffect(() => {
    loadStaff();
    loadHotels();
  }, []);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const data = await fetchStaff();
      const items = Array.isArray(data)
        ? data
        : (typeof data === 'object' && data !== null && Array.isArray((data as any).data)
          ? (data as any).data
          : []);
      setStaff(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Failed to fetch staff', err);
      alert('Failed to load staff.');
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const loadHotels = async () => {
    try {
      const raw = await getHotels();
      const list = Array.isArray(raw) ? raw : (raw && (raw as any).data) ? (raw as any).data : [];
      setHotels(list);
    } catch (err) {
      console.log("Failed to load Hotels", err);
      setHotels([]);
    }
  };

  const hotelsMap = useMemo(() => {
    const m: Record<number, string> = {};
    for (const h of hotels || []) {
      m[h.id] = h.name ?? `${h.id}`;
    }
    return m;
  }, [hotels]);

  const resetForm = () => {
    setEditingStaffId(null);
    setHasLoginAccount(true);
    setForm({
      firstName: '',
      lastName: '',
      role: '',
      email: '',
      phoneNumber: '',
      hotelId: 1,
      isActive: true,
    });
  };

  const openAdd = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEdit = (row: Staff) => {
    setEditingStaffId(row.id);

    const emailValue = (row as any).email ?? '';
    const hasEmail = String(emailValue).trim().length > 0;

    setHasLoginAccount(hasEmail);

    setForm({
      firstName: row.firstName ?? '',
      lastName: row.lastName ?? '',
      role: row.role ?? '',
      email: String(emailValue ?? ''),
      phoneNumber: (row as any).phoneNumber ?? '',
      hotelId: row.hotelId ?? 1,
      isActive: row.isActive ?? true,
    });

    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this staff member?')) return;
    try {
      await deleteStaff(id);
      setStaff((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to delete staff', err);
      alert('Failed to delete staff.');
    }
  };

  const handleSave = async () => {
    const firstName = String(form.firstName ?? '').trim();
    const lastName = String(form.lastName ?? '').trim();
    const email = String(form.email ?? '').trim();

    if (!firstName || !lastName) {
      alert('First name and last name are required.');
      return;
    }
    if (hasLoginAccount && !email) {
      alert('Email is required when "Has Login Account" is checked.');
      return;
    }

    const payload: StaffCreateRequest = {
      ...form,
      firstName,
      lastName,
      email: hasLoginAccount ? email : '',
      phoneNumber: String(form.phoneNumber ?? ''),
      role: String(form.role ?? ''),
      hotelId: Number(form.hotelId ?? 0),
      isActive: Boolean(form.isActive),
    };

    try {
      if (editingStaffId !== null) {
        const updated = await updateStaff(editingStaffId, payload);
        setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await addStaff(payload);
        setStaff((prev) => [...prev, created]);
      }

      setIsAddDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save staff', err);

      if (hasLoginAccount) {
        alert(
          "Failed to save staff. If this person should be able to login, create the user account first (Access Management), then create the staff profile here using the same email."
        );
      } else {
        alert('Failed to save staff.');
      }
    }
  };

  // ✅ Export Staff Excel
  const handleExportStaff = async () => {
    try {
      setExporting(true);
      await exportStaffExcel(); // <= ton service
    } catch (err) {
      console.error("Export staff failed", err);
      alert("Failed to export staff excel.");
    } finally {
      setExporting(false);
    }
  };

  const columns: TableColumn<Staff>[] = [
    { name: 'First Name', selector: (r) => r.firstName, sortable: true },
    { name: 'Last Name', selector: (r) => r.lastName, sortable: true },
    { name: 'Role', selector: (r) => r.role, sortable: true },
    { name: 'Email', selector: (r) => ((r as any).email ?? ''), sortable: true },
    { name: 'Phone', selector: (r) => ((r as any).phoneNumber ?? ''), sortable: true },
    { name: 'Hotel Name', selector: (r) => hotelsMap[r.hotelId] ?? String(r.hotelId), sortable: true },
    { name: 'Active', selector: (r) => (r.isActive ? 'Yes' : 'No'), sortable: true },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handleDelete(row.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Staff Management</h2>

        {/* ✅ Actions Right */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportStaff}
            disabled={exporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Exporting..." : "Export Excel"}
          </Button>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd}>
                <Plus className="mr-2 h-4 w-4" /> Add Staff
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[460px]">
              <DialogHeader>
                <DialogTitle>
                  {editingStaffId !== null ? 'Edit Staff Member' : 'Add New Staff Member'}
                </DialogTitle>
                <DialogDescription>
                  RH employees can be created without login.
                  For booking staff, create the login account first in <b>Access Management</b>,
                  then create the Staff profile here using the same email.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="firstName" className="text-right">First Name</Label>
                  <Input
                    id="firstName"
                    value={form.firstName ?? ''}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="lastName" className="text-right">Last Name</Label>
                  <Input
                    id="lastName"
                    value={form.lastName ?? ''}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">Role</Label>
                  <Input
                    id="role"
                    value={form.role ?? ''}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="hasLogin" className="text-right">Has Login</Label>
                  <div className="col-span-3 flex items-center gap-3">
                    <Checkbox
                      id="hasLogin"
                      checked={hasLoginAccount}
                      onCheckedChange={(v) => {
                        const checked = Boolean(v);
                        setHasLoginAccount(checked);
                        if (!checked) setForm({ ...form, email: '' });
                      }}
                    />
                    <span className="text-sm text-gray-600">
                      {hasLoginAccount
                        ? "Linked to a login account (email required)."
                        : "RH-only staff (no login)."}
                    </span>
                  </div>
                </div>

                {hasLoginAccount && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email ?? ''}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                )}

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phoneNumber ?? ''}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="hotelId" className="text-right">Hotel</Label>
                  <Input
                    id="hotelId"
                    type="number"
                    value={String(form.hotelId ?? 1)}
                    onChange={(e) => setForm({ ...form, hotelId: Number(e.target.value || 0) })}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="isActive" className="text-right">Active</Label>
                  <div className="col-span-3">
                    <Checkbox
                      id="isActive"
                      checked={Boolean(form.isActive)}
                      onCheckedChange={(v) => setForm({ ...form, isActive: Boolean(v) })}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" onClick={handleSave}>
                  {editingStaffId !== null ? 'Save Changes' : 'Add Staff Member'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff List</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={Array.isArray(columns) ? columns : []}
            data={Array.isArray(staff) ? staff : []}
            pagination
            highlightOnHover
            selectableRows
            progressPending={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffPage;
