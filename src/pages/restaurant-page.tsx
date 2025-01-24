import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Utensils, DollarSign, Users, ShoppingCart } from 'lucide-react'

const RestaurantPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Restaurant Management</h2>
        <Button>New Order</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GHT1,231.89</div>
            <p className="text-xs text-muted-foreground">+10.1% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Today</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+150</div>
            <p className="text-xs text-muted-foreground">+23% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">2 more than yesterday</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { id: '001', customer: 'John Doe', items: 3, total: '$45.99', status: 'Completed' },
                { id: '002', customer: 'Jane Smith', items: 2, total: '$32.50', status: 'In Progress' },
                { id: '003', customer: 'Bob Johnson', items: 1, total: '$18.75', status: 'Pending' },
                { id: '004', customer: 'Alice Brown', items: 4, total: '$67.20', status: 'Completed' },
                { id: '005', customer: 'Charlie Davis', items: 2, total: '$29.99', status: 'In Progress' },
              ].map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.id}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>{order.items}</TableCell>
                  <TableCell>{order.total}</TableCell>
                  <TableCell>{order.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Low Stock Ingredients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: "Tomatoes", quantity: "2 kg", icon: <ShoppingCart className="h-4 w-4" /> },
              { name: "Chicken", quantity: "5 kg", icon: <ShoppingCart className="h-4 w-4" /> },
              { name: "Olive Oil", quantity: "1 L", icon: <ShoppingCart className="h-4 w-4" /> },
              { name: "Pasta", quantity: "3 kg", icon: <ShoppingCart className="h-4 w-4" /> },
              { name: "Cheese", quantity: "2 kg", icon: <ShoppingCart className="h-4 w-4" /> },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  {item.icon}
                  <span className="ml-2 text-sm font-medium">{item.name}</span>
                </div>
                <span className="text-xs font-medium text-red-500">{item.quantity}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RestaurantPage

