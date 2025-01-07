import { Link } from 'react-router-dom'

interface SidenavProps {
  isSidebarOpen: boolean;
}

const Sidenav: React.FC<SidenavProps> = ({ isSidebarOpen }) => {
  return (
    <aside className={`bg-gray-800 text-white w-64 min-h-screen ${isSidebarOpen ? '' : 'hidden'}`}>
      <div className="p-4">
        <h1 className="text-2xl font-semibold">Management System</h1>
      </div>
      <nav className="mt-8">
        <Link to="/dashboard" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 hover:text-white">
          Dashboard
        </Link>
        <Link to="/restaurant" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 hover:text-white">
          Restaurant
        </Link>
        <Link to="#" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 hover:text-white">
          Inventory
        </Link>
        <Link to="#" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 hover:text-white">
          Bookings
        </Link>
        <Link to="#" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 hover:text-white">
          Staff
        </Link>
        <Link to="#" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 hover:text-white">
          Reports
        </Link>
        <Link to="/hotel-management" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 hover:text-white">
          Hotel Management
        </Link>
      </nav>
    </aside>
  )
}

export default Sidenav

