import { useState } from 'react'
import { Plus, Search, Edit, Trash2, Mail, Phone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface StaffMember {
    id: number;
    name: string;
    role: string;
    email: string;
    phone: string;
    status: 'Active' | 'On Leave' | 'Terminated';
}

const initialStaff: StaffMember[] = [
    { id: 1, name: 'John Doe', role: 'Manager', email: 'john@example.com', phone: '123-456-7890', status: 'Active' },
    { id: 2, name: 'Jane Smith', role: 'Receptionist', email: 'jane@example.com', phone: '234-567-8901', status: 'Active' },
    { id: 3, name: 'Mike Johnson', role: 'Housekeeper', email: 'mike@example.com', phone: '345-678-9012', status: 'On Leave' },
    { id: 4, name: 'Sarah Brown', role: 'Chef', email: 'sarah@example.com', phone: '456-789-0123', status: 'Active' },
    { id: 5, name: 'Tom Wilson', role: 'Maintenance', email: 'tom@example.com', phone: '567-890-1234', status: 'Terminated' },
];

const StaffPage = () => {
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

    const filteredStaff = staff.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddStaff = () => {
        setStaff([...staff, { ...newStaffMember, id: staff.length + 1 }]);
        setNewStaffMember({ name: '', role: '', email: '', phone: '', status: 'Active' });
        setIsAddDialogOpen(false);
    };

    const handleDeleteStaff = (id: number) => {
        setStaff(staff.filter(member => member.id !== id));
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
                    <div className="flex items-center space-x-2 mb-4">
                   
                        <Input
                            type='search'
                            placeholder="Search staff..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStaff.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell className="font-medium">{member.name}</TableCell>
                                    <TableCell>{member.role}</TableCell>
                                    <TableCell>
                                        <a href={`mailto:${member.email}`} className="flex items-center text-blue-600 hover:underline">
                                            <Mail className="h-4 w-4 mr-1" />
                                            {member.email}
                                        </a>
                                    </TableCell>
                                    <TableCell>
                                        <a href={`tel:${member.phone}`} className="flex items-center text-blue-600 hover:underline">
                                            <Phone className="h-4 w-4 mr-1" />
                                            {member.phone}
                                        </a>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${member.status === 'Active' ? 'bg-green-100 text-green-800' :
                                                member.status === 'On Leave' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                            }`}>
                                            {member.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex space-x-2">
                                            <Button variant="outline" size="icon">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="outline" size="icon" onClick={() => handleDeleteStaff(member.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

export default StaffPage

