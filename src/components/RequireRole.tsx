import { decodeJwt } from "@/utils/jwt";
import { Navigate, Outlet } from "react-router-dom";

interface RequireRoleProps {
  allowed: string[];
}

const DOTNET_ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

// BUG FIX #8 (extended): Changed localStorage → sessionStorage.
// The login page writes the token and role to sessionStorage; reads must match.
export default function RequireRole({ allowed }: RequireRoleProps) {
  const token = sessionStorage.getItem("token"); // BUG FIX #8: was localStorage
  if (!token) return <Navigate to="/login" replace />;

  const claims = decodeJwt(token);

  // .NET Identity uses the long-form claim name for roles.
  // Fall back to short-form and then to sessionStorage for compatibility.
  const jwtRole = claims?.[DOTNET_ROLE_CLAIM] ?? claims?.role ?? claims?.roles;
  const storedRole = sessionStorage.getItem("role"); // BUG FIX #8: was localStorage

  const roleValue = jwtRole ?? storedRole;
  const userRoles = Array.isArray(roleValue) ? roleValue : roleValue ? [roleValue] : [];

  const hasRole = userRoles.some((r) => allowed.includes(r));
  return hasRole ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
