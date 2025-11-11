import React from 'react';
import { Bell, Menu, Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UserDropdown from './user-dropdown';

interface HeaderProps {
  toggleSidebar: () => void;
  onProfileClick: () => void;
  onLogout: () => void;
  onAddUser?: () => void; // new handler for user registration
}

const Header: React.FC<HeaderProps> = ({
  toggleSidebar,
  onProfileClick,
  onLogout,
  onAddUser,
}) => {
  const role = localStorage.getItem('role');

  return (
    <header className="bg-white shadow-md">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-4">
            <Menu className="h-6 w-6" />
          </Button>
          <h2 className="text-xl font-semibold">Le Point 95</h2>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Input type="search" placeholder="Search..." className="pl-8" />
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          </div>

          {role === 'Admin' && (
            <Button variant="outline" size="sm" onClick={onAddUser}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          )}

          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>

          <UserDropdown onProfileClick={onProfileClick} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
};

export default Header;
