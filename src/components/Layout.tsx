// Path: src/components/Layout.tsx
import { useMemo, useState } from "react";
import { ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

import Sidenav from "./side-nav";
import UserProfile from "./user-profile";

// ✅ Notifications Bell component
import { NotificationsBell } from "@/components/notifications-bell";

// ✅ Global Search (new)
import { GlobalSearch } from "@/components/global-search";

interface LayoutProps {
  children: React.ReactNode;
}

type Role = "Admin" | "Manager" | "Receptionist" | "Staff" | "HR" | "User";

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const toggleSidebar = () => setIsSidebarOpen((v) => !v);

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("roles");
    localStorage.removeItem("hotelId");

    // ✅ important pour le dropdown + avatar
    localStorage.removeItem("displayName");
    localStorage.removeItem("email");

    navigate("/login");
  };

  // ✅ rôle dynamique (pas seulement Admin/Staff)
  const userRole = (localStorage.getItem("role") || "Staff") as Role;

  // ✅ nom/email pour avatar
  const displayName = useMemo(
    () => localStorage.getItem("displayName") || localStorage.getItem("email") || "User",
    []
  );

  const initials = useMemo(() => {
    const txt = (displayName || "User").trim();
    const parts = txt.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [displayName]);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidenav isSidebarOpen={isSidebarOpen} role={userRole} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-md">
          <div className="flex items-center justify-between p-4">
            {/* Left */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                <Menu className="h-6 w-6" />
              </Button>
              <h2 className="text-xl font-semibold">Le Point 95</h2>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              {/* ✅ Global Search */}
              <GlobalSearch />

              {/* ✅ Notifications */}
              <NotificationsBell />

              {/* ✅ Profile dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src="/placeholder.svg?height=32&width=32"
                        alt={displayName}
                      />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-[425px]">
                  <UserProfile />
                </DialogContent>
              </Dialog>

              {/* ✅ Dropdown menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>Settings</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-600"
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
