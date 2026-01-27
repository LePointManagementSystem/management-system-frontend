import React, { useEffect, useState } from "react";
import DataTable, { TableColumn } from "react-data-table-component";
import { Plus, Edit, Trash2 } from "lucide-react";
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
import { Guest } from "@/types/client";
import { addGuest, fetchGuest } from "@/services/client-service";

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Guest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState<Guest | null>(null);

  // ✅ email retiré du state de création
  const [newClient, setNewClient] = useState<Omit<Guest, "id" | "email">>({
    firstName: "",
    lastName: "",
    cin: "",
  });

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

  // ✅ recherche uniquement par nom + cin (pas email)
  const filteredClients = clients.filter((client) => {
    const q = searchTerm.toLowerCase();
    return (
      `${client.firstName} ${client.lastName}`.toLowerCase().includes(q) ||
      (client.cin?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleAddClient = async () => {
    try {
      // ✅ on n’envoie pas email
      const savedGuest = await addGuest({
        firstName: newClient.firstName,
        lastName: newClient.lastName,
        cin: newClient.cin,
      } as any);

      setClients((prev) => [...prev, savedGuest]);
      setNewClient({ firstName: "", lastName: "", cin: "" });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding guest:", error);
    }
  };

  const handleEditClient = () => {
    if (currentClient) {
      setClients(
        clients.map((client) =>
          client.id === currentClient.id ? currentClient : client
        )
      );
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteClient = (id?: string) => {
    setClients(clients.filter((client) => client.id !== id));
  };

  // ✅ colonnes SANS Email
  const columns: TableColumn<Guest>[] = [
    {
      name: "First Name",
      selector: (row) => row.firstName,
      sortable: true,
    },
    {
      name: "Last Name",
      selector: (row) => row.lastName,
      sortable: true,
    },
    {
      name: "CIN",
      selector: (row) => row.cin,
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex space-x-2">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentClient(row)}
              >
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
                    <Label htmlFor="edit-firstName">First Name</Label>
                    <Input
                      id="edit-firstName"
                      value={currentClient.firstName}
                      onChange={(e) =>
                        setCurrentClient({
                          ...currentClient,
                          firstName: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-lastName">Last Name</Label>
                    <Input
                      id="edit-lastName"
                      value={currentClient.lastName}
                      onChange={(e) =>
                        setCurrentClient({
                          ...currentClient,
                          lastName: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-cin">CIN</Label>
                    <Input
                      id="edit-cin"
                      value={currentClient.cin}
                      onChange={(e) =>
                        setCurrentClient({
                          ...currentClient,
                          cin: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* ✅ Email supprimé de l'edit UI aussi */}
                </div>
              )}

              <DialogFooter>
                <Button type="submit" onClick={handleEditClient}>
                  Save changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="icon"
            onClick={() => handleDeleteClient(row.id)}
          >
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
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={newClient.firstName}
                  onChange={(e) =>
                    setNewClient({ ...newClient, firstName: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={newClient.lastName}
                  onChange={(e) =>
                    setNewClient({ ...newClient, lastName: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="cin">CIN</Label>
                <Input
                  id="cin"
                  value={newClient.cin}
                  onChange={(e) =>
                    setNewClient({ ...newClient, cin: e.target.value })
                  }
                />
              </div>

              {/* ✅ Email supprimé du formulaire */}
            </div>

            <DialogFooter>
              <Button type="submit" onClick={handleAddClient}>
                Add Client
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={filteredClients}
        pagination
        highlightOnHover
        selectableRows
      />
    </div>
  );
};

export default ClientsPage;
