'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/lib/services/authService';
import { getAuthToken, setAuthSession, clearAuthSession } from '@/lib/auth';

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
  login: (token: string, remember?: boolean) => Promise<void>;
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
          setAuthSession({ ...userData, roles: [userData.role], accessToken: token });
        } catch (error) {
          console.error('Failed to fetch user', error);
          clearAuthSession();
        }
      } else {
        clearAuthSession();
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (token: string, remember: boolean = true) => {
    if (remember) {
      localStorage.setItem('auth_token', token);
      sessionStorage.removeItem('auth_token');
    } else {
      sessionStorage.setItem('auth_token', token);
      localStorage.removeItem('auth_token');
    }
    const userData = await authService.getMe(token);
    setUser(userData);
    setAuthSession({ ...userData, roles: [userData.role], accessToken: token });
    
    // Attempt to merge guest cart into user cart
    import('@/lib/services/cartService').then(({ CartService }) => {
      CartService.mergeCart().catch(err => console.error("Merge cart failed", err));
    });
  };

  const logout = () => {
    clearAuthSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
