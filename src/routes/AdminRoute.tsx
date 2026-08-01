import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FullscreenSpinner } from "./ProtectedRoute";

/**
 * Wraps everything under /admin/*. Nothing in the admin section
 * renders unless the signed-in user's profile.role === 'admin' —
 * a logged-in student hitting /admin/* gets redirected to the admin
 * login screen exactly like an anonymous visitor would.
 */
export function AdminRoute() {
  const { session, profile, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullscreenSpinner />;

  if (!session || !profile || !isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
