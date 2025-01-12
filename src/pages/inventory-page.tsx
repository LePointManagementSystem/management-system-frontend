import React, { useState } from 'react'
import { Plus, Edit, Trash2, Search} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorderPoint: number;
  expirationDate: string;
}

const categories = [
  "Produce",
  "Meat",
  "Seafood",
  "Dairy",
  "Bakery",
  "Dry Goods",
  "Beverages",
  "Spices",
  "Cleaning Supplies"
]

const units = [
  "kg",
  "g",
  "L",
  "mL",
  "piece",
  "dozen",
  "package",
  "bottle",
  "can"
]

const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([
    { id: '1', name: 'Tomatoes', category: 'Produce', quantity: 50, unit: 'kg', reorderPoint: 20, expirationDate: '2023-07-15' },
    { id: '2', name: 'Chicken Breast', category: 'Meat', quantity: 30, unit: 'kg', reorderPoint: 15, expirationDate: '2023-07-10' },
    { id: '3', name: 'Olive Oil', category: 'Dry Goods', quantity: 20, unit: 'L', reorderPoint: 5, expirationDate: '2024-01-01' },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);
  const [newItem, setNewItem] = useState<Omit<InventoryItem, 'id'>>({ 
    name: '', 
    category: '', 
    quantity: 0, 
    unit: '', 
    reorderPoint: 0,
    expirationDate: ''
  });

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddItem = () => {
    const id = Math.random().toString(36).substr(2, 9);
    setInventory([...inventory, { ...newItem, id }]);
    setNewItem({ name: '', category: '', quantity: 0, unit: '', reorderPoint: 0, expirationDate: '' });
    setIsAddDialogOpen(false);
  };

  const handleEditItem = () => {
    if (currentItem) {
      setInventory(inventory.map(item => item.id === currentItem.id ? currentItem : item));
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteItem = (id: string) => {
    setInventory(inventory.filter(item => item.id !== id));
  };

  const isLowStock = (item: InventoryItem) => item.quantity <= item.reorderPoint;
  const isExpiringSoon = (item: InventoryItem) => {
    const expirationDate = new Date(item.expirationDate);
    const today = new Date();
    const differenceInDays = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return differenceInDays <= 7 && differenceInDays >= 0;
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Restaurant Inventory Management</CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Inventory Item</DialogTitle>
                <DialogDescription>
                  Enter the details of the new inventory item here. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Category
                  </Label>
                  <Select
                    onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="quantity" className="text-right">
                    Quantity
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="unit" className="text-right">
                    Unit
                  </Label>
                  <Select
                    onValueChange={(value) => setNewItem({ ...newItem, unit: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="reorderPoint" className="text-right">
                    Reorder Point
                  </Label>
                  <Input
                    id="reorderPoint"
                    type="number"
                    value={newItem.reorderPoint}
                    onChange={(e) => setNewItem({ ...newItem, reorderPoint: parseInt(e.target.value) })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="expirationDate" className="text-right">
                    Expiration Date
                  </Label>
                  <Input
                    id="expirationDate"
                    type="date"
                    value={newItem.expirationDate}
                    onChange={(e) => setNewItem({ ...newItem, expirationDate: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAddItem}>Add Item</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-5 w-5 text-gray-500" />
            <Input
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Reorder Point</TableHead>
                <TableHead>Expiration Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.reorderPoint}</TableCell>
                  <TableCell>{item.expirationDate}</TableCell>
                  <TableCell>
                    {isLowStock(item) && (
                      <Badge variant="destructive" className="mr-2">
                        Low Stock
                      </Badge>
                    )}
                    {isExpiringSoon(item) && (
                      <Badge variant="warning" className="bg-yellow-500 text-white">
                        Expiring Soon
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => setCurrentItem(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Edit Inventory Item</DialogTitle>
                            <DialogDescription>
                              Make changes to the inventory item here. Click save when you're done.
                            </DialogDescription>
                          </DialogHeader>
                          {currentItem && (
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-name" className="text-right">
                                  Name
                                </Label>
                                <Input
                                  id="edit-name"
                                  value={currentItem.name}
                                  onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
                                  className="col-span-3"
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-category" className="text-right">
                                  Category
                                </Label>
                                <Select
                                  onValueChange={(value) => setCurrentItem({ ...currentItem, category: value })}
                                  defaultValue={currentItem.category}
                                >
                                  <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.map((category) => (
                                      <SelectItem key={category} value={category}>{category}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-quantity" className="text-right">
                                  Quantity
                                </Label>
                                <Input
                                  id="edit-quantity"
                                  type="number"
                                  value={currentItem.quantity}
                                  onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) })}
                                  className="col-span-3"
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-unit" className="text-right">
                                  Unit
                                </Label>
                                <Select
                                  onValueChange={(value) => setCurrentItem({ ...currentItem, unit: value })}
                                  defaultValue={currentItem.unit}
                                >
                                  <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {units.map((unit) => (
                                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-reorderPoint" className="text-right">
                                  Reorder Point
                                </Label>
                                <Input
                                  id="edit-reorderPoint"
                                  type="number"
                                  value={currentItem.reorderPoint}
                                  onChange={(e) => setCurrentItem({ ...currentItem, reorderPoint: parseInt(e.target.value) })}
                                  className="col-span-3"
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-expirationDate" className="text-right">
                                  Expiration Date
                                </Label>
                                <Input
                                  id="edit-expirationDate"
                                  type="date"
                                  value={currentItem.expirationDate}
                                  onChange={(e) => setCurrentItem({ ...currentItem, expirationDate: e.target.value })}
                                  className="col-span-3"
                                />
                              </div>
                            </div>
                          )}
                          <DialogFooter>
                            <Button type="submit" onClick={handleEditItem}>Save changes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button variant="outline" size="icon" onClick={() => handleDeleteItem(item.id)}>
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

export default InventoryPage

