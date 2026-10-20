import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  // Restore the session from a saved token on first load.
  useEffect(() => {
    if (!getToken()) return;
    api('/api/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => {}) // a 401 already logs out via the unauthorized handler; a network error keeps the token
      .finally(() => setLoading(false));
  }, []);

  async function authenticate(mode, email, password, display_name) {
    const body = mode === 'register' ? { email, password, display_name } : { email, password };
    const data = await api(`/api/auth/${mode}`, { method: 'POST', body });
    setToken(data.token);
    setUser(data.user);
  }

  async function updateProfile(changes) {
    const data = await api('/api/profile', { method: 'PATCH', body: changes });
    setUser(data.user);
  }

  return (
    <AuthContext.Provider value={{ user, loading, authenticate, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
