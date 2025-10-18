import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import DataTable, { TableColumn } from 'react-data-table-component';
import { fetchStaff, addStaff, updateStaff, deleteStaff } from '@/services/staff-service';
import { Staff, StaffCreateRequest } from '@/types/staff';

const StaffPage: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [form, setForm] = useState<StaffCreateRequest>({
    firstName: '',
    lastName: '',
    role: '',
    email: '',
    phoneNumber: '',
    hotelId: 1,
    isActive: true,
  });

  useEffect(() => {
    loadStaff();
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
      if (!Array.isArray(items)) {
        console.warn("Unexpected staff response shape:", data);
        setStaff([]);
      } else {
        setStaff(items);
      }
    } catch (err) {
      console.error('Failed to fetch staff', err);
      alert('Failed to load staff.');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingStaffId(null);
    setForm({
      firstName: '',
      lastName: '',
      role: '',
      email: '',
      phoneNumber: '',
      hotelId: 1,
      isActive: true,
    });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (row: Staff) => {
    setEditingStaffId(row.id);
    setForm({
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      email: row.email,
      phoneNumber: row.phoneNumber,
      hotelId: row.hotelId,
      isActive: row.isActive,
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
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      alert('First name, last name and email are required.');
      return;
    }

    try {
      if (editingStaffId !== null) {
        const updated = await updateStaff(editingStaffId, form);
        setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await addStaff(form);
        setStaff((prev) => [...prev, created]);
      }
      setIsAddDialogOpen(false);
      setEditingStaffId(null);
      setForm({
        firstName: '',
        lastName: '',
        role: '',
        email: '',
        phoneNumber: '',
        hotelId: 1,
        isActive: true,
      });
    } catch (err) {
      console.error('Failed to save staff', err);
      alert('Failed to save staff.');
    }
  };

  const columns: TableColumn<Staff>[] = [
    { name: 'First Name', selector: (r) => r.firstName, sortable: true },
    { name: 'Last Name', selector: (r) => r.lastName, sortable: true },
    { name: 'Role', selector: (r) => r.role, sortable: true },
    { name: 'Email', selector: (r) => r.email, sortable: true },
    { name: 'Phone', selector: (r) => r.phoneNumber, sortable: true },
    { name: 'Hotel ID', selector: (r) => String(r.hotelId), sortable: true },
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
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Staff</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingStaffId !== null ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
              <DialogDescription>Enter the details and click save.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="firstName" className="text-right">First Name</Label>
                <Input id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="col-span-3" />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lastName" className="text-right">Last Name</Label>
                <Input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="col-span-3" />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <Input id="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="col-span-3" />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="col-span-3" />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Phone</Label>
                <Input id="phone" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} className="col-span-3" />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="hotelId" className="text-right">Hotel ID</Label>
                <Input id="hotelId" type="number" value={String(form.hotelId)} onChange={(e) => setForm({ ...form, hotelId: Number(e.target.value || 0) })} className="col-span-3" />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isActive" className="text-right">Active</Label>
                <div className="col-span-3">
                  <Checkbox id="isActive" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: Boolean(v) })} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" onClick={handleSave}>{editingStaffId !== null ? 'Save Changes' : 'Add Staff Member'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
