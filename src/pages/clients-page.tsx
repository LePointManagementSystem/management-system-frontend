import React, { useEffect, useState } from 'react';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Guest } from '@/types/client';
import { fetchGuest } from '@/services/client-service';


const ClientsPage: React.FC = () => {
    const [clients, setClients] = useState<Guest[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [currentClient, setCurrentClient] = useState<Guest | null>(null);
    const [newClient, setNewClient] = useState<Omit<Guest, 'id'>>({ firstName: '',lastName: '', email: '', cin: '' });

   
    useEffect(() => {
    const loadGuests = async () => {
        try {
            const data = await fetchGuest();
            setClients(data);
        } catch (error) {
            console.error("Failed to load guests:", error);
        }
    };

    loadGuests();
}, []);

 const filteredClients = clients.filter(
        (client) =>
            (`${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase())
    );



    const handleAddClient = () => {
        const id = Math.random().toString(36).substr(2, 9);
        setClients([...clients, { ...newClient, id }]);
        setNewClient({ firstName: '',lastName:'', email: '', cin: '' });
        setIsAddDialogOpen(false);
    };

    const handleEditClient = () => {
        if (currentClient) {
            setClients(clients.map((client) => (client.id === currentClient.id ? currentClient : client)));
            setIsEditDialogOpen(false);
        }
    };

    const handleDeleteClient = (id: string) => {
        setClients(clients.filter((client) => client.id !== id));
    };

    // Define columns for the DataTable
    const columns: TableColumn<Guest>[] = [
        {
            name: 'firstName',
            selector: (row) => row.firstName,
            sortable: true,
        },
        {
            name: 'lastName',
            selector: (row) => row.lastName,
            sortable: true,
        },
        {
            name: 'Email',
            selector: (row) => row.email,
            sortable: true,
        },
        {
            name: 'CIN ',
            selector: (row) => row.cin,
            sortable: true,
        },
        {
            name: 'Actions',
            cell: (row) => (
                <div className="flex space-x-2">
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" onClick={() => setCurrentClient(row)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Edit Client</DialogTitle>
                                <DialogDescription>
                                    Make changes to the client information here. Click save when you're done.
                                </DialogDescription>
                            </DialogHeader>
                            {currentClient && (
                                <div className="grid gap-4 py-4">
                                    <div>
                                        <Label htmlFor="edit-name">First Name</Label>
                                        <Input
                                            id="edit-name"
                                            value={currentClient.firstName}
                                            onChange={(e) => setCurrentClient({ ...currentClient, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-name">Last Name</Label>
                                        <Input
                                            id="edit-name"
                                            value={currentClient.lastName}
                                            onChange={(e) => setCurrentClient({ ...currentClient, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-email">Email</Label>
                                        <Input
                                            id="edit-email"
                                            type="email"
                                            value={currentClient.email}
                                            onChange={(e) => setCurrentClient({ ...currentClient, email: e.target.value })}
                                        />
                                    </div>
                                 
                                </div>
                            )}
                            <DialogFooter>
                                <Button type="submit" onClick={handleEditClient}>
                                    Save changes
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="icon" onClick={() => handleDeleteClient(row.id)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Client Management</h1>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Client
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add New Client</DialogTitle>
                            <DialogDescription>
                                Enter the details of the new client here. Click save when you're done.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div>
                                <Label htmlFor="name">First Name</Label>
                                <Input
                                    id="name"
                                    value={newClient.firstName}
                                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="name">Last Name</Label>
                                <Input
                                    id="name"
                                    value={newClient.lastName}
                                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={newClient.email}
                                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                />
                            </div>
                           
                            <div>
                                <Label htmlFor="cin">Phone</Label>
                                <Input
                                    id="cin"
                                    value={newClient.cin}
                                    onChange={(e) => setNewClient({ ...newClient, cin: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" onClick={handleAddClient}>
                                Add Client
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            {/* <Input
        placeholder="Search clients..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      /> */}
            <DataTable
                columns={columns}
                data={filteredClients}
                pagination
                highlightOnHover
                selectableRows />
        </div>
    );
};

export default ClientsPage;
