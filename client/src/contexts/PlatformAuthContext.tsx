import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { platformService } from '../services/platform.service';
import type { PlatformAdmin } from '../services/platform.service';

interface PlatformAuthContextType {
  admin: PlatformAdmin | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const PlatformAuthContext = createContext<PlatformAuthContextType | undefined>(undefined);

export function PlatformAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const adminData = await platformService.getMe();
        setAdmin(adminData);
      } catch {
        setAdmin(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await platformService.login(username, password);
    setAdmin(result.admin);
  }, []);

  const logout = useCallback(async () => {
    try {
      await platformService.logout();
    } finally {
      setAdmin(null);
    }
  }, []);

  return (
    <PlatformAuthContext.Provider value={{ admin, isLoading, login, logout }}>
      {children}
    </PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth(): PlatformAuthContextType {
  const context = useContext(PlatformAuthContext);
  if (!context) {
    throw new Error('usePlatformAuth muss innerhalb eines PlatformAuthProvider verwendet werden');
  }
  return context;
}
