import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Customers from './pages/Customers.jsx';
import Leads from './pages/Leads.jsx';
import Opportunities from './pages/Opportunities.jsx';
import FollowUps from './pages/FollowUps.jsx';
import Activities from './pages/Activities.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';
import AuditLog from './pages/AuditLog.jsx';

// Shows the app only to logged-in users.
function RequireLogin() {
  const { user } = useAuth();
  if (user === undefined) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Loading…</div>;
  }
  return user ? <Layout /> : <Navigate to="/login" replace />;
}

// Shows a page only to some roles. The server checks the role too.
function RequireRole({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user.role) ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<RequireLogin />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/opportunities" element={<Opportunities />} />
        <Route path="/follow-ups" element={<FollowUps />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/reports" element={<RequireRole roles={['Admin', 'Manager']}><Reports /></RequireRole>} />
        <Route path="/users" element={<RequireRole roles={['Admin']}><Users /></RequireRole>} />
        <Route path="/audit-log" element={<RequireRole roles={['Admin']}><AuditLog /></RequireRole>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
