import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import { LoginPage } from "./pages/login-page";
import DashboardPage from "./pages/dashboard-page";
import Layout from "./components/Layout";
import HotelManagementPage from "./pages/hotel-management-page";
import RestaurantPage from "./pages/restaurant-page";
import StaffPage from "./pages/staff-page";

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
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
