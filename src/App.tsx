import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AdminRoute } from "./routes/AdminRoute";

import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import AdminLogin from "./pages/Login/AdminLogin";

// Placeholders — build these out next.
function StudentDashboard() {
  return <div className="p-8 text-white">Student dashboard (placeholder)</div>;
}
function AdminDashboard() {
  return <div className="p-8 text-white">Admin dashboard (placeholder)</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Student area — anything nested here requires a session */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<StudentDashboard />} />
            {/* /trips, /payments, /rooms etc. go here later */}
          </Route>

          {/* Admin area — requires session AND profile.role === 'admin' */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            {/* /admin/payments, /admin/rooms, /admin/students etc. go here later */}
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
