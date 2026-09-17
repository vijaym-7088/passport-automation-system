import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on a hard refresh.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(email, password) {
        const data = await api('/auth/login', { method: 'POST', body: { email, password } });
        setToken(data.token);
        setUser(data.user);
        return data.user;
      },
      async register(payload) {
        const data = await api('/auth/register', { method: 'POST', body: payload });
        setToken(data.token);
        setUser(data.user);
        return data.user;
      },
      logout() {
        setToken(null);
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
