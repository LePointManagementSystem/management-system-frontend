import { NavLink } from "react-router-dom";
import {
  Home,
  ClipboardList,
  Users,
  Hotel,
  Briefcase,
  Wallet,
  CalendarPlus,
  ShieldCheck,
} from "lucide-react";

interface MenuItem {
  path: string;
  label: string;
  icon: JSX.Element;
}

const baseMenuItems: MenuItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: <Home className="h-5 w-5" /> },
  { path: "/room-booking", label: "New Booking", icon: <CalendarPlus className="h-5 w-5" /> },
  { path: "/bookings", label: "Bookings", icon: <ClipboardList className="h-5 w-5" /> },
  { path: "/cash", label: "Petty Cash", icon: <Wallet className="h-5 w-5" /> },
  { path: "/staff", label: "Staff", icon: <Briefcase className="h-5 w-5" /> },
  { path: "/clients", label: "Clients", icon: <Users className="h-5 w-5" /> },
];

type Role = "Admin" | "Manager" | "Staff" | "Receptionist" | string;

const adjustedMenuItems = (role: Role) => {
  if (role === "Admin" || role === "Manager") {
    return baseMenuItems.concat([
      { path: "/hotel-management", label: "Hotel Management", icon: <Hotel className="h-5 w-5" /> },
      { path: "/user-accounts", label: "Access Management", icon: <ShieldCheck className="h-5 w-5" /> },
    ]);
  }

  return baseMenuItems;
};

interface SidenavProps {
  isSidebarOpen: boolean;
  role: Role;
}

const Sidenav: React.FC<SidenavProps> = ({ isSidebarOpen, role }) => {
  const items = adjustedMenuItems(role);

  return (
    <aside className={`bg-gray-800 text-white w-64 min-h-screen ${isSidebarOpen ? "" : "hidden"}`}>
      <div className="p-4">
        <h1 className="text-2xl font-extrabold tracking-tight">
          <span className="text-[#40c4a7]">Inn</span>
          <span className="text-white">Manager</span>
        </h1>
        <p className="text text-gray-400 tracking-wide">Hotel Management</p>
      </div>

      <nav>
        {items.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 py-2.5 px-4 rounded transition duration-200 ${
                isActive ? "bg-gray-700 text-white" : "hover:bg-gray-700 hover:text-white"
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidenav;
