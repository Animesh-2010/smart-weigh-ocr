import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, AuthSession } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (session: AuthSession) => Promise<void>;
  logout: () => Promise<void>;
  getValidToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EXPIRY_BUFFER = 60; // refresh 60s before expiry

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const stored = await AsyncStorage.getItem('supabase_session');
      if (stored) {
        const parsed: AuthSession = JSON.parse(stored);
        // If token is expired or about to expire, refresh it
        if (parsed.expiresAt <= Math.floor(Date.now() / 1000) + EXPIRY_BUFFER) {
          try {
            const refreshed = await api.refresh(parsed.refreshToken);
            await persistSession(refreshed);
          } catch {
            // Refresh failed — clear session
            await AsyncStorage.removeItem('supabase_session');
            setIsLoading(false);
            return;
          }
        }
        setUser(parsed.user);
        setToken(parsed.token);
        setSession(parsed);
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const persistSession = useCallback(async (s: AuthSession) => {
    setUser(s.user);
    setToken(s.token);
    setSession(s);
    await AsyncStorage.setItem('supabase_session', JSON.stringify(s));
  }, []);

  const login = useCallback(async (s: AuthSession) => {
    await persistSession(s);
  }, [persistSession]);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    setSession(null);
    await AsyncStorage.removeItem('supabase_session');
  }, []);

  const getValidToken = useCallback(async (): Promise<string> => {
    if (!session) throw new Error('Not signed in');
    if (session.expiresAt > Math.floor(Date.now() / 1000) + EXPIRY_BUFFER) {
      return session.token;
    }
    // Token expired — refresh
    try {
      const refreshed = await api.refresh(session.refreshToken);
      await persistSession(refreshed);
      return refreshed.token;
    } catch {
      await logout();
      throw new Error('Session expired. Please login again.');
    }
  }, [session, persistSession, logout]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, getValidToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
