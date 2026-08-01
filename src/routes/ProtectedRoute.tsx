import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps any student-facing route. If there's no session, bounce to
 * /login and remember where they were headed so we can send them
 * back after signing in.
 */
export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullscreenSpinner />;

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}

export function FullscreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
    </div>
  );
}
