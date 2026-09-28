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
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('hisaabdo_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const token = getStoredToken();
    if (!token) return false;
    const cached = localStorage.getItem('hisaabdo_cached_user');
    return !cached;
  });

  const saveCachedUser = (u: User | null) => {
    setUser(u);
    try {
      if (u) {
        localStorage.setItem('hisaabdo_cached_user', JSON.stringify(u));
        if (u.name) localStorage.setItem('hisaabdo_last_identifier', u.name);
      } else {
        localStorage.removeItem('hisaabdo_cached_user');
      }
    } catch {
      // ignore
    }
  };

  const initAuth = async () => {
    const token = getStoredToken();
    if (!token) {
      saveCachedUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      saveCachedUser(res.user);
    } catch {
      localStorage.removeItem('splitwise_auth_token');
      localStorage.removeItem('hisaabdo_cached_user');
      localStorage.removeItem('hisaabdo_cached_groups');
      localStorage.removeItem('hisaabdo_cached_activities');
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
    saveCachedUser(res.user);
  };

  const login = async (identifier: string, password: string) => {
    const res = await api.login(identifier, password);
    saveCachedUser(res.user);
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    saveCachedUser(res.user);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('splitwise_auth_token');
    localStorage.removeItem('hisaabdo_cached_user');
    localStorage.removeItem('hisaabdo_cached_groups');
    localStorage.removeItem('hisaabdo_cached_activities');
    localStorage.removeItem('hisaabdo_cached_users');
    setUser(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    const res = await api.updateProfile(updates);
    saveCachedUser(res.user);
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
