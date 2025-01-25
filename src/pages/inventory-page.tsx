import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Edit, Plus, Trash2 } from "lucide-react";
import DataTable, { TableColumn } from 'react-data-table-component';
import { Badge } from "@/components/ui/badge";
import { DialogDescription, DialogTitle } from '@radix-ui/react-dialog';
import { Label } from '@radix-ui/react-label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@radix-ui/react-select';

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
  const [newItem, setNewItem] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    category: '',
    quantity: 0,
    unit: '',
    reorderPoint: 0,
    expirationDate: ''
  });

  const columns: TableColumn<InventoryItem>[] = [
    {
      name: 'Name',
      selector: (row: InventoryItem) => row.name,
      sortable: true,
    },
    {
      name: 'Category',
      selector: (row: InventoryItem) => row.category,
      sortable: true,
    },
    {
      name: 'Quantity',
      selector: (row: InventoryItem) => row.quantity,
      sortable: true,
    },
    {
      name: 'Unit',
      selector: (row: InventoryItem) => row.unit,
      sortable: true,
    },
    {
      name: 'Reorder Point',
      selector: (row: InventoryItem) => row.reorderPoint,
      sortable: true,
    },
    {
      name: 'Expiration Date',
      selector: (row: InventoryItem) => row.expirationDate,
      sortable: true,
    },
    {
      name: 'Status',
      cell: (row: InventoryItem) => (
        <div>
          {row.quantity <= row.reorderPoint && (
            <Badge variant="destructive" className="mr-2">
              Low Stock
            </Badge>
          )}
          {new Date(row.expirationDate) <= new Date() && (
            <Badge variant="warning" className="bg-yellow-500 text-white">
              Expired
            </Badge>
          )}
        </div>
      ),
      sortable: false,
    },
    {
      name: 'Actions',
      cell: (row: InventoryItem) => (
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={() => handleEditItem(row)}>
            <Edit className='h-4 w-4' />
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleDeleteItem(row.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      sortable: false,
    },
  ];

  const handleAddItem = () => {
    const id = Math.random().toString(36).substr(2, 9);
    setInventory([...inventory, { ...newItem, id }]);
    setNewItem({ name: '', category: '', quantity: 0, unit: '', reorderPoint: 0, expirationDate: '' });
    setIsAddDialogOpen(false);
  };

  const handleEditItem = (item: InventoryItem) => {
    // Handle the item edit functionality
    console.log('Edit item', item);
  };

  const handleDeleteItem = (id: string) => {
    setInventory(inventory.filter(item => item.id !== id));
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
       <div  className="flex justify-between items-center">
           <h2 className="text-3xl font-bold mb-6">Inventory</h2>    
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
          </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
         
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Input
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <DataTable

            columns={columns}
            data={filteredInventory}
            pagination
            fixedHeader
            highlightOnHover
            subHeader
            selectableRows
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryPage;

