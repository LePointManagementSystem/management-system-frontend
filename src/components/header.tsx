import React from 'react';
import { Bell, Menu, Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UserDropdown from './user-dropdown';

interface HeaderProps {
  toggleSidebar: () => void;
  onProfileClick: () => void;
  onLogout: () => void;
  onAddUser?: () => void; 
}

const Header: React.FC<HeaderProps> = ({
  toggleSidebar,
  onProfileClick,
  onLogout,
  onAddUser,
}) => {
  const role = 'Admin'

  return (
    <header className="bg-white shadow-md">
      <div className="flex items-center justify-between p-3 md:p-4">

      
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Hide part of title on small screens */}
          <h2 className="text-lg md:text-xl font-semibold truncate">
            InnManager
          </h2>
        </div>

  
        <div className="flex items-center space-x-2 md:space-x-4">

        \
          <div className="relative hidden md:block">
            <Input
              type="search"
              placeholder="Search..."
              className="pl-8 w-[200px] lg:w-[250px]"
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          </div>

         
          {role === 'Admin' && onAddUser && (
            <>
              {/* Desktop */}
              <Button
                variant="outline"
                size="sm"
                onClick={onAddUser}
                className="hidden md:flex"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>

              {/* Mobile (icon only) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onAddUser}
                className="md:hidden"
              >
                <UserPlus className="h-5 w-5" />
              </Button>
            </>
          )}

        
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>

         
          <UserDropdown
            onProfileClick={onProfileClick}
            onLogout={onLogout}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
