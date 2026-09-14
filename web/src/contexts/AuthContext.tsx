'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/lib/services/authService';
import { getAuthToken } from '@/lib/auth';

interface User {
  id: string | number;
  email: string;
  fullName: string;
  role: string;
  phone?: string;
  isEmailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const userData = await authService.getMe(token);
          setUser(userData);
        } catch (error) {
          console.error('Failed to fetch user', error);
          localStorage.removeItem('auth_token');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (token: string) => {
    localStorage.setItem('auth_token', token);
    const userData = await authService.getMe(token);
    setUser(userData);
    
    // Attempt to merge guest cart into user cart
    import('@/lib/services/cartService').then(({ CartService }) => {
      CartService.mergeCart().catch(err => console.error("Merge cart failed", err));
    });
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
