import React, { useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User } from "lucide-react"

interface UserDropdownProps {
  onProfileClick: () => void
  onLogout: () => void
}

const UserDropdown: React.FC<UserDropdownProps> = ({ onProfileClick, onLogout }) => {
  const displayName = useMemo(
    () => localStorage.getItem("displayName") || "User",
    []
  )

  const email = useMemo(
    () => localStorage.getItem("email") || "",
    []
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {displayName}
            </p>
            {email && (
              <p className="text-xs leading-none text-muted-foreground">
                {email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onProfileClick}>
          Profile
        </DropdownMenuItem>

        <DropdownMenuItem disabled>
          Settings
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={onLogout}
          className="text-red-600 focus:text-red-600"
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default UserDropdown
