import { createContext, useContext, useMemo, useState, useEffect } from 'react';
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

  useEffect(() => {
    if (user) localStorage.setItem('userInfo', JSON.stringify(user));
    else localStorage.removeItem('userInfo');
  }, [user]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data);
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setUser(data);
    return data;
  };

  const logout = () => setUser(null);

  const updateUser = (data) => setUser((prev) => ({ ...prev, ...data }));

  const value = useMemo(
    () => ({ user, login, register, logout, updateUser, setUser }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
