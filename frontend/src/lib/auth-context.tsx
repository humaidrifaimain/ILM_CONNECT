'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch, setAuthToken } from './api';

export type UserRole = 'STUDENT' | 'LECTURER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User, token?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Immediately restore user from localStorage to prevent auth flicker
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('ilm_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        // ignore JSON parse error
      }
    }

    // 2. Validate session with backend
    const checkAuth = async () => {
      try {
        const userData = await apiFetch('/auth/me');
        setUser(userData);
        if (typeof window !== 'undefined') {
          localStorage.setItem('ilm_user', JSON.stringify(userData));
        }
      } catch (error: any) {
        if (error?.status === 401) {
          setUser(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('ilm_user');
            setAuthToken(null);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData: User, token?: string) => {
    setUser(userData);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ilm_user', JSON.stringify(userData));
      if (token) {
        setAuthToken(token);
      }
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ilm_user');
        setAuthToken(null);
      }
      window.location.href = '/auth/signin';
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
