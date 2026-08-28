import { createContext, useContext, useMemo, useState, useEffect, useRef } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo')) || null;
    } catch {
      return null;
    }
  });
  const [bootstrapping, setBootstrapping] = useState(() => {
    try {
      return Boolean(JSON.parse(localStorage.getItem('userInfo'))?.token);
    } catch {
      return false;
    }
  });
  const logoutRef = useRef(() => {});

  const logout = () => setUser(null);

  logoutRef.current = logout;

  useEffect(() => {
    if (user) localStorage.setItem('userInfo', JSON.stringify(user));
    else localStorage.removeItem('userInfo');
  }, [user]);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        const url = String(error.config?.url || '');
        const isAuthAttempt =
          url.includes('/auth/login') || url.includes('/auth/register');

        if (status === 401 && !isAuthAttempt) {
          logoutRef.current();
          if (window.location.pathname.startsWith('/staff')) {
            const redirect = encodeURIComponent(
              `${window.location.pathname}${window.location.search || ''}`
            );
            window.location.replace(`/login?redirect=${redirect}`);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      let stored = null;
      try {
        stored = JSON.parse(localStorage.getItem('userInfo'));
      } catch {
        stored = null;
      }

      if (!stored?.token) {
        if (!cancelled) {
          setUser(null);
          setBootstrapping(false);
        }
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        if (!cancelled) {
          setUser({ ...data, token: stored.token });
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data);
    setBootstrapping(false);
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setUser(data);
    setBootstrapping(false);
    return data;
  };

  const updateUser = (data) => setUser((prev) => ({ ...prev, ...data }));

  const value = useMemo(
    () => ({ user, bootstrapping, login, register, logout, updateUser, setUser }),
    [user, bootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
