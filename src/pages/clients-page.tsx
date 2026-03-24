import React, { useEffect, useMemo, useState } from "react";
import DataTable, { TableColumn } from "react-data-table-component";
import { Plus, Edit, Trash2, X } from "lucide-react";
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

  // ✅ Email supprimé de la création (tu enregistres sans email)
  const [newClient, setNewClient] = useState<
    Omit<Guest, "id" | "email">
  >({
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

  // ✅ Filtre: Nom + CIN (pas email)
  const filteredClients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return clients;

    return clients.filter((c) => {
      const fullName = `${c.firstName ?? ""} ${c.lastName ?? ""}`.toLowerCase();
      const cin = (c.cin ?? "").toLowerCase();
      return fullName.includes(q) || cin.includes(q);
    });
  }, [clients, searchTerm]);

  const handleAddClient = async () => {
    try {
      // ✅ payload sans email
      const payload = {
        firstName: newClient.firstName,
        lastName: newClient.lastName,
        cin: newClient.cin,
      };

      const savedGuest = await addGuest(payload as any);
      setClients((prev) => [...prev, savedGuest]);

      setNewClient({ firstName: "", lastName: "", cin: "" });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding guest:", error);
    }
  };

  const handleEditClient = () => {
    if (!currentClient) return;

    setClients((prev) =>
      prev.map((c) => (c.id === currentClient.id ? currentClient : c))
    );
    setIsEditDialogOpen(false);
  };

  const handleDeleteClient = (id?: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  // ✅ Colonnes SANS Email
  const columns: TableColumn<Guest>[] = [
    {
      name: "Name",
      selector: (row) => `${row.firstName} ${row.lastName}`,
      sortable: true,
    },
    {
      name: "CIN",
      selector: (row) => row.cin ?? "",
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
                      value={currentClient.firstName ?? ""}
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
                      value={currentClient.lastName ?? ""}
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
                      value={currentClient.cin ?? ""}
                      onChange={(e) =>
                        setCurrentClient({
                          ...currentClient,
                          cin: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Si tu veux garder Email editable (optionnel), décommente :
                  <div>
                    <Label htmlFor="edit-email">Email (optional)</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={currentClient.email ?? ""}
                      onChange={(e) =>
                        setCurrentClient({
                          ...currentClient,
                          email: e.target.value, // string ok
                        })
                      }
                    />
                  </div>
                  */}
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

  // ✅ Barre de recherche “pro” dans le subHeader du DataTable
  const subHeaderComponent = (
    <div className="flex w-full items-center gap-2 py-2">
      <div className="relative w-full max-w-sm">
        <Input
          placeholder="Search client by name or CIN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {searchTerm.trim() !== "" && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSearchTerm("")}
          title="Clear"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

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

              {/* ✅ pas d'email ici */}
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
        subHeader
        subHeaderComponent={subHeaderComponent}
        persistTableHead
      />
    </div>
  );
};

export default ClientsPage;
