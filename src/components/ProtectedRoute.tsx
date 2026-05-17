import { Navigate, Outlet, useLocation } from "react-router-dom";
import { decodeJwt } from "@/utils/jwt";

/**
 * BUG FIX #8 (extended): Clears all auth-related storage on logout / token expiry.
 * Now clears BOTH sessionStorage (current) and localStorage (legacy) so stale
 * tokens from before the fix don't interfere.
 */
function clearAuthStorage(): void {
  const keys = ["token", "role", "roles", "hotelId", "displayName", "email"];
  keys.forEach((k) => {
    sessionStorage.removeItem(k);
    localStorage.removeItem(k);
  });
}

/**
 * IMPROVEMENT: Now also checks JWT expiry (exp claim).
 * Previously a user with an expired token stayed logged in
 * on the front end until the server returned a 401 on an API call.
 * Now the redirect to /login happens immediately on page load.
 *
 * BUG FIX #8 (extended): Changed localStorage → sessionStorage.
 * The login page writes the token to sessionStorage; all reads must use the same store.
 */
export default function ProtectedRoute() {
  const location = useLocation();
  const token    = sessionStorage.getItem("token"); // BUG FIX #8: was localStorage

  // No token at all — redirect to login
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Token present but expired — clear storage and redirect
  const claims = decodeJwt(token);
  const exp    = claims?.exp as number | undefined;
  if (exp && Date.now() / 1000 > exp) {
    clearAuthStorage();
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
