import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

const TOKEN_KEY = '@careconnect_access_token';
const REFRESH_KEY = '@careconnect_refresh_token';
const USER_KEY = '@careconnect_user';

export const authStorage = {
  saveSession: async (access: string, refresh: string, user: User) => {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, access);
      await AsyncStorage.setItem(REFRESH_KEY, refresh);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save auth session', e);
    }
  },

  getAccessToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  getRefreshToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },

  getUser: async (): Promise<User | null> => {
    try {
      const data = await AsyncStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  clearSession: async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error('Failed to clear session', e);
    }
  }
};
