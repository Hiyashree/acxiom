import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

// Keeps track of the logged-in user for the whole app.
// user is undefined while loading, null when logged out.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    api('/api/auth/me').then(setUser).catch(() => setUser(null));

    const onUnauthorized = () => setUser(null);
    window.addEventListener('unauthorized', onUnauthorized);
    return () => window.removeEventListener('unauthorized', onUnauthorized);
  }, []);

  async function login(email, password) {
    setUser(await api('/api/auth/login', { method: 'POST', body: { email, password } }));
  }

  async function register(form) {
    setUser(await api('/api/auth/register', { method: 'POST', body: form }));
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
