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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Guest } from "@/types/client";
import { addGuest, fetchGuest } from "@/services/client-service";

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Guest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState<Guest | null>(null);

  // ✅ Messages d'erreur/succès utilisateur
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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
        setPageError(null);
      } catch (error) {
        console.error("Failed to load guests:", error);
        setPageError("Impossible de charger les clients. Vérifie ta connexion et réessaie.");
      }
    };
    loadGuests();
  }, []);

  const filteredClients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return clients;

    return clients.filter((c) => {
      const fullName = `${c.firstName ?? ""} ${c.lastName ?? ""}`.toLowerCase();
      const cin = (c.cin ?? "").toLowerCase();
      return fullName.includes(q) || cin.includes(q);
    });
  }, [clients, searchTerm]);

  // ✅ Validation + feedback utilisateur
  const handleAddClient = async () => {
    setFormError(null);

    // Validation nom
    if (!newClient.firstName.trim() || !newClient.lastName.trim()) {
      setFormError("Le prénom et le nom sont obligatoires.");
      return;
    }

    // Validation CIN
    const cinTrimmed = newClient.cin.trim();
    if (cinTrimmed.length < 5) {
      setFormError("Le CIN doit contenir au moins 5 caractères.");
      return;
    }
    if (cinTrimmed.length > 30) {
      setFormError("Le CIN ne peut pas dépasser 30 caractères.");
      return;
    }

    try {
      const payload = {
        firstName: newClient.firstName.trim(),
        lastName: newClient.lastName.trim(),
        cin: cinTrimmed,
      };

      const savedGuest = await addGuest(payload as any);
      setClients((prev) => [...prev, savedGuest]);

      setNewClient({ firstName: "", lastName: "", cin: "" });
      setIsAddDialogOpen(false);
    } catch (error: any) {
      console.error("Error adding guest:", error);
      setFormError(error?.message || "Erreur lors de l'ajout du client.");
    }
  };

  const handleEditClient = () => {
    if (!currentClient) return;

    // Validation aussi pour l'édition
    if (!currentClient.firstName?.trim() || !currentClient.lastName?.trim()) {
      setFormError("Le prénom et le nom sont obligatoires.");
      return;
    }
    if ((currentClient.cin ?? "").trim().length < 5) {
      setFormError("Le CIN doit contenir au moins 5 caractères.");
      return;
    }

    setClients((prev) =>
      prev.map((c) => (c.id === currentClient.id ? currentClient : c))
    );
    setIsEditDialogOpen(false);
    setFormError(null);
  };

  const handleDeleteClient = (id?: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

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
          <Dialog open={isEditDialogOpen} onOpenChange={(o) => { setIsEditDialogOpen(o); if (!o) setFormError(null); }}>
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

              {formError && (
                <Alert variant="destructive">
                  <AlertTitle>Erreur</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

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

        <Dialog open={isAddDialogOpen} onOpenChange={(o) => { setIsAddDialogOpen(o); if (!o) setFormError(null); }}>
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

            {formError && (
              <Alert variant="destructive">
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

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
                  placeholder="Min 5 caractères"
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

      {pageError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

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