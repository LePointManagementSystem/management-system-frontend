import { NavLink } from 'react-router-dom'
import { Home, Utensils, ClipboardList, Users, FileText, Hotel, Briefcase } from 'lucide-react';


interface MenuItem {
    path: string;
    label: string;
    icon: JSX.Element;
}

const menuItems: MenuItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: <Home className="h-5 w-5" /> },
    { path: '/restaurant', label: 'Restaurant', icon: <Utensils className="h-5 w-5" /> },
    { path: '/hotel-management', label: 'Hotel Management', icon: <Hotel className="h-5 w-5" /> },
    { path: '/room-booking', label: 'Bookings', icon: <Users className="h-5 w-5" /> },
    { path: '/staff', label: 'Staff Management', icon: <Briefcase className="h-5 w-5" /> },
    { path: '/clients', label: ' Client Management', icon: <Users className="h-5 w-5" /> }
];


const adjustedMenuItems = (role: 'admin' | 'staff') => {
    const adminMenuItems = menuItems.concat([
        { path: '/inventory', label: 'Inventory', icon: <ClipboardList className="h-5 w-5" /> },
        { path: '/reports/restaurant', label: 'Restaurant Report', icon: <FileText className="h-5 w-5" /> },
        { path: '/reports/occupancy', label: 'Occupancy Reports', icon: <FileText className="h-5 w-5" /> },
        { path: '/reports/financial', label: 'Financial Reports', icon: <FileText className="h-5 w-5" /> },
    ]);
    
    return role === 'admin' ? adminMenuItems : menuItems;
};

interface SidenavProps {
    isSidebarOpen: boolean;
    role: 'admin' | 'staff';
}

const Sidenav: React.FC<SidenavProps> = ({ isSidebarOpen, role }) => {

    const items = adjustedMenuItems(role);

    return (
        <aside className={`bg-gray-800 text-white w-64 min-h-screen ${isSidebarOpen ? '' : 'hidden'}`}>
            <div className="p-4">
                <h1 className="text-2xl font-semibold">Management System</h1>
            </div>
            <nav className="mt-8">
                {items.map((item, index) => (
                    <NavLink
                        key={index}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 py-2.5 px-4 rounded transition duration-200 ${isActive ? 'bg-gray-700 text-white' : 'hover:bg-gray-700 hover:text-white'
                            }`
                        }
                    >
                        {item.icon}
                        {item.label}
                    </NavLink>
                ))}
            </nav>
        </aside>
    )
}

export default Sidenav

