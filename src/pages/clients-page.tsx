import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Edit,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Guest } from "@/types/client";
import {
  addGuest,
  deleteGuest,
  fetchGuests,
  updateGuest,
} from "@/services/client-service";

type DialogMode = "add" | "edit" | "delete" | null;

const EMPTY_FORM = { firstName: "", lastName: "", cin: "" };

function validateForm(
  fields: { firstName: string; lastName: string; cin: string }
): string | null {
  if (!fields.firstName.trim() || !fields.lastName.trim()) {
    return "First name and last name are required.";
  }
  const cin = fields.cin.trim();
  if (cin.length < 5) return "CIN must be at least 5 characters.";
  if (cin.length > 30) return "CIN cannot exceed 30 characters.";
  return null;
}

const ITEMS_PER_PAGE = 10;

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedClient, setSelectedClient] = useState<Guest | null>(null);

  const [formFields, setFormFields] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setPageError(null);
      try {
        const data = await fetchGuests();
        setClients(data);
      } catch {
        setPageError(
          "Unable to load clients. Please check your connection and try again."
        );
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filteredClients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      return name.includes(q) || c.cin.toLowerCase().includes(q);
    });
  }, [clients, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / ITEMS_PER_PAGE));
  const pagedClients = filteredClients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 6000);
  }

  function openAddDialog() {
    setFormFields(EMPTY_FORM);
    setFormError(null);
    setDialogMode("add");
  }

  function openEditDialog(client: Guest) {
    setSelectedClient(client);
    setFormFields({
      firstName: client.firstName,
      lastName: client.lastName,
      cin: client.cin,
    });
    setFormError(null);
    setDialogMode("edit");
  }

  function openDeleteDialog(client: Guest) {
    setSelectedClient(client);
    setDialogMode("delete");
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedClient(null);
    setFormError(null);
    setDeleteError(null);
  }

  async function handleAddClient() {
    const error = validateForm(formFields);
    if (error) { setFormError(error); return; }
    setIsSaving(true);
    setFormError(null);
    try {
      const saved = await addGuest({
        firstName: formFields.firstName.trim(),
        lastName: formFields.lastName.trim(),
        cin: formFields.cin.trim(),
      });
      setClients((prev) => [...prev, saved]);
      closeDialog();
      showSuccess(
        `Client ${saved.firstName} ${saved.lastName} has been added successfully.`
      );
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to add client.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEditClient() {
    if (!selectedClient?.id) return;
    const error = validateForm(formFields);
    if (error) { setFormError(error); return; }
    setIsSaving(true);
    setFormError(null);
    try {
      const updated: Omit<Guest, "id"> = {
        firstName: formFields.firstName.trim(),
        lastName: formFields.lastName.trim(),
        cin: formFields.cin.trim(),
      };
      await updateGuest(selectedClient.id, updated);
      setClients((prev) =>
        prev.map((c) =>
          c.id === selectedClient.id ? { ...c, ...updated } : c
        )
      );
      closeDialog();
      showSuccess(
        `Client ${updated.firstName} ${updated.lastName} has been updated.`
      );
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Failed to update client."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteClient() {
    if (!selectedClient?.id) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteGuest(selectedClient.id);
      setClients((prev) => prev.filter((c) => c.id !== selectedClient.id));
      const name = `${selectedClient.firstName} ${selectedClient.lastName}`;
      closeDialog();
      showSuccess(`Client ${name} has been removed.`);
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete client."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (dialogMode === "add") handleAddClient();
      if (dialogMode === "edit") handleEditClient();
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Client Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Loading…"
              : `${clients.length} client${clients.length !== 1 ? "s" : ""} registered`}
          </p>
        </div>
        <Button onClick={openAddDialog} disabled={isLoading}>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
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

      {/* ── Page-level error ── */}
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
            placeholder="Search by name or CIN…"
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
            {filteredClients.length} result
            {filteredClients.length !== 1 ? "s" : ""}
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
              <TableHead className="font-semibold">CIN</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-16 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Loading clients…
                  </p>
                </TableCell>
              </TableRow>
            ) : pagedClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-16 text-center">
                  <UserX className="mx-auto h-8 w-8 text-muted-foreground opacity-40" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {searchTerm
                      ? "No clients match your search."
                      : "No clients registered yet. Click \"Add Client\" to get started."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              pagedClients.map((client, idx) => (
                <TableRow key={client.id} className="hover:bg-muted/40">
                  <TableCell className="text-center text-muted-foreground text-xs">
                    {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {client.firstName} {client.lastName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {client.cin}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        title="Edit client"
                        onClick={() => openEditDialog(client)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        title="Delete client"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => openDeleteDialog(client)}
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

      {/* ══════════════ ADD DIALOG ══════════════ */}
      <Dialog
        open={dialogMode === "add"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      >
        <DialogContent className="sm:max-w-[420px]" onKeyDown={handleKeyDown}>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Fill in the client details below and click Save.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-firstName">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-firstName"
                placeholder="e.g. Jean"
                value={formFields.firstName}
                onChange={(e) =>
                  setFormFields((f) => ({ ...f, firstName: e.target.value }))
                }
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-lastName">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-lastName"
                placeholder="e.g. Dupont"
                value={formFields.lastName}
                onChange={(e) =>
                  setFormFields((f) => ({ ...f, lastName: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-cin">
                CIN <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-cin"
                placeholder="Min. 5 characters"
                value={formFields.cin}
                onChange={(e) =>
                  setFormFields((f) => ({ ...f, cin: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                National identity number (5–30 characters)
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <span className="mr-auto text-xs text-muted-foreground self-center hidden sm:block">
              Press <kbd className="px-1 py-0.5 rounded border text-xs font-mono">Enter</kbd> to save
            </span>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleAddClient} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════ EDIT DIALOG ══════════════ */}
      <Dialog
        open={dialogMode === "edit"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      >
        <DialogContent className="sm:max-w-[420px]" onKeyDown={handleKeyDown}>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update the client information below and click Save.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-firstName">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-firstName"
                value={formFields.firstName}
                onChange={(e) =>
                  setFormFields((f) => ({ ...f, firstName: e.target.value }))
                }
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-lastName">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-lastName"
                value={formFields.lastName}
                onChange={(e) =>
                  setFormFields((f) => ({ ...f, lastName: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-cin">
                CIN <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-cin"
                value={formFields.cin}
                onChange={(e) =>
                  setFormFields((f) => ({ ...f, cin: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                National identity number (5–30 characters)
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <span className="mr-auto text-xs text-muted-foreground self-center hidden sm:block">
              Press <kbd className="px-1 py-0.5 rounded border text-xs font-mono">Enter</kbd> to save
            </span>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleEditClient} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
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
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-foreground">
                {selectedClient?.firstName} {selectedClient?.lastName}
              </span>
              ? This action cannot be undone.
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
                onClick={handleDeleteClient}
                disabled={isDeleting}
              >
                {isDeleting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete Client
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsPage;
