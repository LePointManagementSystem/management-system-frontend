import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from "react-router-dom";
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
import BookingsPage from "./pages/bookings-page";
import SearchPage from "./pages/search-page";
import CashTransactionsPage from "./pages/cash-transactions-page";
import ReportsDashboardPage from "./pages/reports/reports-dashboard-page";
// ✅ NEW
import ProtectedRoute from "./components/ProtectedRoute";
import RequireRole from "./components/RequireRole";
import UserAccountsPage from "./pages/user-accounts-page";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout><Outlet /></Layout>} >
            <Route index element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/search" element={<SearchPage />} />

            <Route path="/hotel-management" element={<HotelManagementPage />} />
            <Route path="/restaurant" element={<RestaurantPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/reports/restaurant" element={<RestaurantReportPage />} />
            <Route path="/reports/financial" element={<FinancialReportPage />} />
            <Route path="/reports/occupancy" element={<OccupancyReportPage />} />
            <Route path="/reports" element={<ReportsDashboardPage />} />
            <Route path="/room-booking" element={<RoomBookingPage />} />
            <Route path="/bookings" element={<BookingsPage />} />

            {/* ✅ Petty cash */}
            <Route path="/cash" element={<CashTransactionsPage />} />

            {/* Admin only */}
            <Route element={<RequireRole allowed={["Admin"]} />}>
              <Route path="/user-accounts" element={<UserAccountsPage />} />
            </Route>
          </Route>
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
