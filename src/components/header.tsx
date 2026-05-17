import React from 'react';
import { Bell, Menu, Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { decodeJwt, getRolesFromClaims, pickPrimaryRole } from '@/utils/jwt';

interface HeaderProps {
  toggleSidebar: () => void;
  onProfileClick: () => void;
  onLogout: () => void;
  onAddUser?: () => void;
}

/**
 * BUG FIX: `const role = 'Admin'` was hardcoded here.
 * This meant ALL users (Staff, Receptionist, etc.) saw the "Add User" button
 * and admin-only controls regardless of their actual role.
 *
 * Fix: role is now read from the decoded JWT (signed, cannot be forged)
 * and falls back to sessionStorage.role as a secondary source.
 *
 * BUG FIX #8 (extended): Changed localStorage → sessionStorage.
 * The login page writes the token and role to sessionStorage; reads must match.
 */
function getActualRole(): string {
  const token  = sessionStorage.getItem("token"); // BUG FIX #8: was localStorage
  const claims = token ? decodeJwt(token) : null;
  const roles  = getRolesFromClaims(claims);
  if (roles.length > 0) return pickPrimaryRole(roles);
  // Fallback to sessionStorage.role (set at login)
  return sessionStorage.getItem("role") || "Staff"; // BUG FIX #8: was localStorage
}

const Header: React.FC<HeaderProps> = ({
  toggleSidebar,
  onProfileClick,
  onLogout,
  onAddUser,
}) => {
  const role = getActualRole();

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

          <h2 className="text-lg md:text-xl font-semibold truncate">
            InnManager
          </h2>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">

          <div className="relative hidden md:block">
            <Input
              type="search"
              placeholder="Search..."
              className="pl-8 w-[200px] lg:w-[250px]"
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          </div>

          {/* Only show "Add User" button to Admin users */}
          {role === 'Admin' && onAddUser && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onAddUser}
                className="hidden md:flex"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>

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
        </div>
      </div>
    </header>
  );
};

export default Header;
