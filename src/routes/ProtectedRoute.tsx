import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps any student-facing route. If there's no session, bounce to
 * /login and remember where they were headed so we can send them
 * back after signing in. If the session exists but the profile isn't
 * finished yet, the student can't reach the rest of the app until
 * they complete it.
 */
export function ProtectedRoute() {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullscreenSpinner />;

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (profile && !profile.registration_complete) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <Outlet />;
}

/**
 * Wraps /complete-profile itself. Requires a session but does NOT
 * require registration_complete (that would be circular) — instead,
 * if the profile is already complete, send the student on to their
 * dashboard instead of showing the form again.
 */
export function CompleteProfileRoute() {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullscreenSpinner />;

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (profile?.registration_complete) {
    return <Navigate to="/dashboard" replace />;
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
