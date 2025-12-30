import { Navigate, Outlet } from "react-router-dom";

type Role = "Admin" | "Manager" | "Receptionist" | "Staff" | "HR" | "User";

export default function RequireRole({ allowed }: { allowed: Role[] }) {
  const role = (localStorage.getItem("role") || "") as Role;
  if (!role || !allowed.includes(role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
