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
  const [newStaffMember, setNewStaffMember] = useState<StaffCreateRequest>({
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
      setStaff(data);
    } catch (err) {
      console.error('Failed to fetch staff', err);
      alert('Failed to load staff.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingStaffId(null);
    setNewStaffMember({
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
    setNewStaffMember({
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
    if (!newStaffMember.firstName.trim() || !newStaffMember.lastName.trim() || !newStaffMember.email.trim()) {
      alert('First name, last name and email are required.');
      return;
    }

    try {
      if (editingStaffId !== null) {
        const updated = await updateStaff(editingStaffId, newStaffMember);
        setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await addStaff(newStaffMember);
        setStaff((prev) => [...prev, created]);
      }
      setIsAddDialogOpen(false);
      setEditingStaffId(null);
      setNewStaffMember({
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
    { name: 'First Name', selector: (row) => row.firstName, sortable: true },
    { name: 'Last Name', selector: (row) => row.lastName, sortable: true },
    { name: 'Role', selector: (row) => row.role, sortable: true },
    { name: 'Email', selector: (row) => row.email, sortable: true },
    { name: 'Phone', selector: (row) => row.phoneNumber, sortable: true },
    { name: 'Hotel ID', selector: (row) => String(row.hotelId), sortable: true },
    { name: 'Active', selector: (row) => (row.isActive ? 'Yes' : 'No'), sortable: true },
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
            <Button onClick={handleOpenAdd}><Plus className="mr-2 h-4 w-4" /> Add Staff</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingStaffId !== null ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
              <DialogDescription>
                Enter the details of the staff member here. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="firstName" className="text-right">First Name</Label>
                <Input id="firstName" value={newStaffMember.firstName} onChange={(e) => setNewStaffMember({ ...newStaffMember, firstName: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lastName" className="text-right">Last Name</Label>
                <Input id="lastName" value={newStaffMember.lastName} onChange={(e) => setNewStaffMember({ ...newStaffMember, lastName: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <Input id="role" value={newStaffMember.role} onChange={(e) => setNewStaffMember({ ...newStaffMember, role: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" type="email" value={newStaffMember.email} onChange={(e) => setNewStaffMember({ ...newStaffMember, email: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Phone</Label>
                <Input id="phone" value={newStaffMember.phoneNumber} onChange={(e) => setNewStaffMember({ ...newStaffMember, phoneNumber: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="hotelId" className="text-right">Hotel ID</Label>
                <Input id="hotelId" type="number" value={String(newStaffMember.hotelId)} onChange={(e) => setNewStaffMember({ ...newStaffMember, hotelId: Number(e.target.value || 0) })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isActive" className="text-right">Active</Label>
                <div className="col-span-3">
                  <Checkbox id="isActive" checked={newStaffMember.isActive} onCheckedChange={(v) => setNewStaffMember({ ...newStaffMember, isActive: Boolean(v) })} />
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
            columns={columns}
            data={staff}
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
