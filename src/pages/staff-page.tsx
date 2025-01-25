import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import React, { useState } from 'react';
import DataTable, { TableColumn } from 'react-data-table-component';

interface StaffMember {
    id: number;
    name: string;
    role: string;
    email: string;
    phone: string;
    status: 'Active' | 'On Leave' | 'Terminated';
}

const StaffPage: React.FC = () => {
    const initialStaff: StaffMember[] = [
        { id: 1, name: 'John Doe', role: 'Manager', email: 'john@example.com', phone: '123-456-7890', status: 'Active' },
        { id: 2, name: 'Jane Smith', role: 'Receptionist', email: 'jane@example.com', phone: '234-567-8901', status: 'Active' },
        { id: 3, name: 'Mike Johnson', role: 'Housekeeper', email: 'mike@example.com', phone: '345-678-9012', status: 'On Leave' },
        { id: 4, name: 'Sarah Brown', role: 'Chef', email: 'sarah@example.com', phone: '456-789-0123', status: 'Active' },
        { id: 5, name: 'Tom Wilson', role: 'Maintenance', email: 'tom@example.com', phone: '567-890-1234', status: 'Terminated' },
    ];

    const [staff, setStaff] = useState<StaffMember[]>(initialStaff);

    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newStaffMember, setNewStaffMember] = useState<Omit<StaffMember, 'id'>>({
        name: '',
        role: '',
        email: '',
        phone: '',
        status: 'Active',
    });


    const columns: TableColumn<StaffMember>[] = [
        {
            name: 'Name',
            selector: (row: StaffMember) => row.name,
            sortable: true,
        },
        {
            name: 'Role',
            selector: (row: StaffMember) => row.role,
            sortable: true,
        },
        {
            name: 'Email',
            selector: (row: StaffMember) => row.email,
            cell: (row: StaffMember) => (
                <a href={`mailto:${row.email}`} className="text-blue-600 hover:underline">
                    {row.email}
                </a>
            ),
        },
        {
            name: 'Phone',
            selector: (row: StaffMember) => row.phone,
            cell: (row: StaffMember) => (
                <a href={`tel:${row.phone}`} className="text-blue-600 hover:underline">
                    {row.phone}
                </a>
            ),
        },
        {
            name: 'Status',
            selector: (row: StaffMember) => row.status,
            cell: (row: StaffMember) => (
                <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${row.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : row.status === 'On Leave'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                        }`}
                >
                    {row.status}
                </span>
            ),
        },
        {
            name: 'Actions',
            cell: (row: StaffMember) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => handleEdit(row)}
                        className="text-blue-600 hover:underline"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDelete(row.id)}
                        className="text-red-600 hover:underline"
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    const handleEdit = (row: StaffMember) => {
        console.log('Edit:', row);
        // Add your edit logic here
    };

    const handleDelete = (id: number) => {
        setStaff(staff.filter((member) => member.id !== id));
    };

    const customStyles = {
        rows: {
            style: {
                minHeight: '50px',
            },
        },
        headCells: {
            style: {
                backgroundColor: '#f0faf7',
                fontWeight: 'bold',
                fontSize: '16px',
            },
        },
        cells: {
            style: {
                fontSize: '14px',
            },
        },
    };

    const filteredStaff = staff.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddStaff = () => {
        setStaff([...staff, { ...newStaffMember, id: staff.length + 1 }]);
        setNewStaffMember({ name: '', role: '', email: '', phone: '', status: 'Active' });
        setIsAddDialogOpen(false);
    };



    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Staff Management</h2>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Add Staff</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add New Staff Member</DialogTitle>
                            <DialogDescription>
                                Enter the details of the new staff member here. Click save when you're done.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Name
                                </Label>
                                <Input
                                    id="name"
                                    value={newStaffMember.name}
                                    onChange={(e) => setNewStaffMember({ ...newStaffMember, name: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="role" className="text-right">
                                    Role
                                </Label>
                                <Input
                                    id="role"
                                    value={newStaffMember.role}
                                    onChange={(e) => setNewStaffMember({ ...newStaffMember, role: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={newStaffMember.email}
                                    onChange={(e) => setNewStaffMember({ ...newStaffMember, email: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="phone" className="text-right">
                                    Phone
                                </Label>
                                <Input
                                    id="phone"
                                    value={newStaffMember.phone}
                                    onChange={(e) => setNewStaffMember({ ...newStaffMember, phone: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-right">
                                    Status
                                </Label>
                                <Select
                                    onValueChange={(value: 'Active' | 'On Leave' | 'Terminated') => setNewStaffMember({ ...newStaffMember, status: value })}
                                    defaultValue={newStaffMember.status}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="On Leave">On Leave</SelectItem>
                                        <SelectItem value="Terminated">Terminated</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" onClick={handleAddStaff}>Add Staff Member</Button>
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
                          
                        />
            
                </CardContent>
            </Card>
        </div>



    );
};

export default StaffPage;
