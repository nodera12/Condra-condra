import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types.ts';
import { api, authStorage } from '../lib/api.ts';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, username: string, pass: string) => Promise<void>;
  googleLogin: (payload: { email: string; name?: string; googleId?: string; avatarUrl?: string }) => Promise<void>;
  adminLogin: (password: string) => Promise<void>;
  quickAdminLogin: (password?: string) => Promise<void>;
  makeMeAdmin: (password?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  requireAuthAction: (callback: () => void, promptMessage?: string) => void;
  authModalOpen: boolean;
  authModalMode: 'login' | 'register' | 'forgot';
  authModalPrompt: string;
  openAuthModal: (mode?: 'login' | 'register' | 'forgot', promptMessage?: string) => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [authModalPrompt, setAuthModalPrompt] = useState<string>('Please log in or create an account to continue.');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const refreshUser = useCallback(async () => {
    const token = authStorage.getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const me = await api.getMe();
      setUser(me);
    } catch (err) {
      console.warn('Session verification failed, logging out');
      authStorage.removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    authStorage.setToken(res.token);
    setUser(res.user);
    closeAuthModal();
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const register = async (email: string, username: string, pass: string) => {
    const res = await api.register({ email, username, password: pass });
    authStorage.setToken(res.token);
    setUser(res.user);
    closeAuthModal();
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const googleLogin = async (payload: { email: string; name?: string; googleId?: string; avatarUrl?: string }) => {
    const res = await api.googleAuth(payload);
    authStorage.setToken(res.token);
    setUser(res.user);
    closeAuthModal();
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const adminLogin = async (password: string) => {
    const res = await api.adminLogin({ email: 'nworkaebube@gmail.com', password });
    authStorage.setToken(res.token);
    setUser(res.user);
    closeAuthModal();
  };

  const quickAdminLogin = async (password?: string) => {
    const res = await api.quickAdminLogin(password || '080633Aa@');
    authStorage.setToken(res.token);
    setUser(res.user);
    closeAuthModal();
  };

  const makeMeAdmin = async (password?: string) => {
    const res = await api.makeMeAdmin(password || '080633Aa@');
    authStorage.setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    authStorage.removeToken();
    setUser(null);
  };

  const openAuthModal = (mode: 'login' | 'register' | 'forgot' = 'login', promptMessage?: string) => {
    setAuthModalMode(mode);
    setAuthModalPrompt(promptMessage || 'Please log in or create an account to continue.');
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setPendingAction(null);
  };

  const requireAuthAction = (callback: () => void, promptMessage?: string) => {
    if (user) {
      callback();
    } else {
      setPendingAction(() => callback);
      openAuthModal('login', promptMessage || 'Please log in or create an account to continue.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin' && user?.email?.toLowerCase() === 'nworkaebube@gmail.com',
        login,
        register,
        googleLogin,
        adminLogin,
        quickAdminLogin,
        makeMeAdmin,
        logout,
        refreshUser,
        requireAuthAction,
        authModalOpen,
        authModalMode,
        authModalPrompt,
        openAuthModal,
        closeAuthModal,
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
