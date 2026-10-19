import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useApp } from './context/AppContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Inbox from './pages/Inbox.jsx';
import Sent from './pages/Sent.jsx';
import Compose from './pages/Compose.jsx';
import MessageView from './pages/MessageView.jsx';
import Settings from './pages/Settings.jsx';

// Not logged in? Go to login, then come back to the page (e.g. a link from an email)
function Private({ children }) {
  const { user, loading } = useApp();
  const location = useLocation();
  if (loading) return <div className="boot">Loading…</div>;
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

function Public({ children }) {
  const { user, loading } = useApp();
  const location = useLocation();
  if (loading) return <div className="boot">Loading…</div>;
  return user ? <Navigate to={location.state?.from || '/'} replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Public><Login /></Public>} />
      <Route path="/register" element={<Public><Register /></Public>} />
      <Route path="/forgot-password" element={<Public><ForgotPassword /></Public>} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Private><Layout /></Private>}>
        <Route index element={<Inbox />} />
        <Route path="sent" element={<Sent />} />
        <Route path="compose" element={<Compose />} />
        <Route path="settings" element={<Settings />} />
        <Route path="message/:id" element={<MessageView />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
