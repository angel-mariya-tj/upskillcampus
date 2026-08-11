import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';

interface User {
  userId: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  merchant?: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string, role: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('servanta_token'));
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const data = res.data.data;
      const u: User = {
        userId: data.user_id,
        name: data.name,
        email: data.email,
        role: data.role_name,
        merchant: data.merchant,
      };
      setUser(u);
      localStorage.setItem('servanta_user', JSON.stringify(u));
    } catch {
      logout();
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: u, token: t } = res.data.data;
    setToken(t);
    setUser(u);
    localStorage.setItem('servanta_token', t);
    localStorage.setItem('servanta_user', JSON.stringify(u));
  };

  const register = async (name: string, email: string, password: string, phone: string, role: string) => {
    const res = await api.post('/auth/register', { name, email, password, phone, role });
    const { user: u, token: t } = res.data.data;
    setToken(t);
    setUser(u);
    localStorage.setItem('servanta_token', t);
    localStorage.setItem('servanta_user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('servanta_token');
    localStorage.removeItem('servanta_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
