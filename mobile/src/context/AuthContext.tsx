import React, { createContext, useState, useEffect, useContext } from 'react';
import { User } from '../types';
import { authStorage } from '../services/authStorage';
import { authAPI, notificationAPI } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  unreadCount: number;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  updateUserProfile: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = async () => {
    try {
      const res = await authAPI.getMe().then(() => notificationAPI.getUnreadCount()).catch(() => null);
      if (res && res.data && res.data.success) {
        setUnreadCount(res.data.data.unread_count || 0);
      }
    } catch {
      // ignore
    }
  };

  const loadSession = async () => {
    try {
      const savedUser = await authStorage.getUser();
      const token = await authStorage.getAccessToken();
      if (token && savedUser) {
        setUser(savedUser);
        try {
          const res = await authAPI.getMe();
          if (res.data.success) {
            setUser(res.data.data);
            await authStorage.saveSession(token, (await authStorage.getRefreshToken()) || '', res.data.data);
          }
        } catch {
          // token might be stale
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (user) {
      refreshUnreadCount();
      const interval = setInterval(refreshUnreadCount, 4000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [user]);

  const login = async (credentials: any) => {
    const res = await authAPI.login(credentials);
    if (res.data.success) {
      const { user, access, refresh } = res.data.data;
      await authStorage.saveSession(access, refresh, user);
      setUser(user);
      refreshUnreadCount();
    } else {
      throw new Error(res.data.message || 'Login failed');
    }
  };

  const register = async (data: any) => {
    const res = await authAPI.register(data);
    if (res.data.success) {
      const { user, access, refresh } = res.data.data;
      await authStorage.saveSession(access, refresh, user);
      setUser(user);
      refreshUnreadCount();
    } else {
      throw new Error(res.data.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      const refresh = await authStorage.getRefreshToken();
      await authAPI.logout({ refresh });
    } catch {
      // ignore network errors on logout
    } finally {
      await authStorage.clearSession();
      setUser(null);
      setUnreadCount(0);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await authAPI.getMe();
      if (res.data.success) {
        setUser(res.data.data);
        const token = await authStorage.getAccessToken();
        const refresh = await authStorage.getRefreshToken();
        if (token) {
          await authStorage.saveSession(token, refresh || '', res.data.data);
        }
      }
    } catch {
      // ignore
    }
  };

  const updateUserProfile = async (data: any) => {
    const res = await authAPI.updateProfile(data);
    if (res.data.success) {
      setUser(res.data.data);
      const token = await authStorage.getAccessToken();
      const refresh = await authStorage.getRefreshToken();
      if (token) {
        await authStorage.saveSession(token, refresh || '', res.data.data);
      }
    } else {
      throw new Error(res.data.message || 'Profile update failed');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        unreadCount,
        login,
        register,
        logout,
        refreshUser,
        refreshUnreadCount,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
