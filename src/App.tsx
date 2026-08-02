import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, CompleteProfileRoute } from "./routes/ProtectedRoute";
import { AdminRoute } from "./routes/AdminRoute";

import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import AdminLogin from "./pages/Login/AdminLogin";
import CompleteProfile from "./pages/CompleteProfile/CompleteProfile";
import StudentDashboard from "./pages/Dashboard/StudentDashboard";
import TripDetail from "./pages/Dashboard/TripDetail";
import Settings from "./pages/Settings/Settings";
import AdminDashboard from "./pages/admin/AdminDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Session required, profile completion not required */}
          <Route element={<CompleteProfileRoute />}>
            <Route path="/complete-profile" element={<CompleteProfile />} />
          </Route>

          {/* Session + completed profile required */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/trip/:tripId" element={<TripDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Session + admin role required */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}