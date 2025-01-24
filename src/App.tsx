import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import { LoginPage } from "./pages/login-page";
import DashboardPage from "./pages/dashboard-page";
import Layout from "./components/Layout";
import HotelManagementPage from "./pages/hotel-management-page";
import RestaurantPage from "./pages/restaurant-page";
import StaffPage from "./pages/staff-page";
import ClientsPage from "./pages/clients-page";
import InventoryPage from "./pages/inventory-page";
import RestaurantReportPage from "./pages/reports/restaurant-report-page";
import FinancialReportPage from "./pages/reports/financial-report-page";
import OccupancyReportPage from "./pages/reports/occupancy-report-page";
import RoomBookingPage from "./pages/room-booking-page";


function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route path="/" element={<Layout><Outlet /></Layout>} >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/hotel-management" element={<HotelManagementPage />} />
          <Route path="/restaurant" element={<RestaurantPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/reports/restaurant" element={<RestaurantReportPage />} />
          <Route path="/reports/financial" element={<FinancialReportPage />} />
          <Route path="/reports/occupancy" element={<OccupancyReportPage />} />
          <Route path="/room-booking" element={<RoomBookingPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
