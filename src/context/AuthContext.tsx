import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, CurrencyCode } from '../types';
import { api, getStoredToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  quickStart: (name: string, preferredCurrency?: CurrencyCode, password?: string, email?: string) => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      setUser(res.user);
      if (res.user?.name) {
        localStorage.setItem('hisaabdo_last_identifier', res.user.name);
      }
    } catch {
      localStorage.removeItem('splitwise_auth_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const quickStart = async (name: string, preferredCurrency: CurrencyCode = 'INR', password?: string, email?: string) => {
    const res = await api.quickStart(name, preferredCurrency, password, email);
    setUser(res.user);
    if (res.user?.name) {
      localStorage.setItem('hisaabdo_last_identifier', res.user.name);
    }
  };

  const login = async (identifier: string, password: string) => {
    const res = await api.login(identifier, password);
    setUser(res.user);
    if (res.user?.name) {
      localStorage.setItem('hisaabdo_last_identifier', res.user.name);
    }
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    setUser(res.user);
    if (res.user?.name) {
      localStorage.setItem('hisaabdo_last_identifier', res.user.name);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('splitwise_auth_token');
    setUser(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    const res = await api.updateProfile(updates);
    setUser(res.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        quickStart,
        login,
        register,
        logout,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
