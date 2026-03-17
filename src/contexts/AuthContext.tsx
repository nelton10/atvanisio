import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserSession } from '@/types';
import { getSession, saveSession, clearSession } from '@/lib/store';

interface AuthContextType {
  user: UserSession | null;
  login: (name: string, role: 'gestao' | 'prof', remember: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    setUser(getSession());
  }, []);

  const login = useCallback((name: string, role: 'gestao' | 'prof', remember: boolean) => {
    const session: UserSession = { name, role };
    saveSession(session, remember);
    setUser(session);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
