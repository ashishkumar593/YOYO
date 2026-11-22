'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from './api';

export interface User {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'DEVELOPER';
  status?: string;
  fullName?: string;
  createdAt?: string;
  profile?: {
    id?: string;
    fullName?: string;
    companyName?: string;
    avatarUrl?: string;
    notificationPreferences?: any;
  } | null;
  quota?: {
    monthlyTokenLimit: number;
    currentMonthTokensUsed: number;
    monthlyRequestLimit: number;
    currentMonthRequestsUsed: number;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  oauthLogin: (
    provider: 'google' | 'github',
    payload: { email: string; fullName?: string; avatarUrl?: string; token?: string; code?: string }
  ) => Promise<any>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  oauthLogin: async () => {},
  register: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('yoyo_access_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const data = await apiRequest('/api/auth/me');
      setUser(data);
    } catch {
      localStorage.removeItem('yoyo_access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('yoyo_access_token', res.accessToken);
    if (res.refreshToken) {
      localStorage.setItem('yoyo_refresh_token', res.refreshToken);
    }
    await refreshUser();
    return res;
  };

  const oauthLogin = async (
    provider: 'google' | 'github',
    payload: { email: string; fullName?: string; avatarUrl?: string; token?: string; code?: string }
  ) => {
    const res = await apiRequest(`/api/auth/oauth/${provider}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    localStorage.setItem('yoyo_access_token', res.accessToken);
    if (res.refreshToken) {
      localStorage.setItem('yoyo_refresh_token', res.refreshToken);
    }
    await refreshUser();
    return res;
  };

  const register = async (email: string, password: string, fullName?: string) => {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
    localStorage.setItem('yoyo_access_token', res.accessToken);
    if (res.refreshToken) {
      localStorage.setItem('yoyo_refresh_token', res.refreshToken);
    }
    await refreshUser();
  };

  const logout = () => {
    localStorage.removeItem('yoyo_access_token');
    localStorage.removeItem('yoyo_refresh_token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, oauthLogin, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

