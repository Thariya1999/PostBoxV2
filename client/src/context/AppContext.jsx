import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));
  const [users, setUsers] = useState([]); // people I can send to
  const [toasts, setToasts] = useState([]);
  const [version, setVersion] = useState(0); // bumps on every live event so pages refetch

  const toast = useCallback((toastData) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, ...toastData }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const saveSession = ({ token, user }) => {
    localStorage.setItem('token', token);
    setUser(user);
  };
  const updateUser = (patch) => setUser((u) => ({ ...u, ...patch }));
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    setUsers([]);
  }, []);

  // Restore the session on page refresh
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  // The server rejected our token (expired, or password changed elsewhere)
  useEffect(() => {
    window.addEventListener('auth:expired', logout);
    return () => window.removeEventListener('auth:expired', logout);
  }, [logout]);

  // Load the recipient list + open the live connection while logged in
  const userId = user?._id;
  useEffect(() => {
    if (!userId) return;
    api.get('/users').then((res) => setUsers(res.data));

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const socket = io({ auth: { token: localStorage.getItem('token') } });

    socket.on('user:new', (u) => {
      if (u._id === userId) return;
      setUsers((list) =>
        list.some((x) => x._id === u._id)
          ? list
          : [...list, u].sort((a, b) => a.name.localeCompare(b.name))
      );
    });

    socket.on('message:new', (m) => {
      setVersion((v) => v + 1);
      toast({
        kind: 'new',
        title: `New message from ${m.sender.name}`,
        text: m.subject,
        onOpen: () => navigate(`/message/${m._id}`),
      });
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification(`New message from ${m.sender.name}`, { body: m.subject });
      }
    });

    socket.on('message:read', (r) => {
      setVersion((v) => v + 1);
      toast({
        kind: 'read',
        title: `${r.reader.name} read your message`,
        text: r.subject,
        onOpen: () => navigate('/sent'),
      });
    });

    return () => socket.disconnect();
  }, [userId, toast, navigate]);

  const value = {
    user, loading, users, version, toasts,
    saveSession, updateUser, logout, toast, dismissToast,
    bump: () => setVersion((v) => v + 1),
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
