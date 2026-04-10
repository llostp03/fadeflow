import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'clipflow_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.id === 'number') {
            setUserState({
              ...parsed,
              subscription_status:
                typeof parsed.subscription_status === 'string' ? parsed.subscription_status : '',
            });
          }
        }
      } catch {
        /* ignore corrupt storage */
      }
      setReady(true);
    })();
  }, []);

  const setUser = useCallback(async (next) => {
    if (next && typeof next.id === 'number') {
      const normalized = {
        ...next,
        subscription_status:
          typeof next.subscription_status === 'string' ? next.subscription_status : '',
      };
      setUserState(normalized);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      } catch {
        /* ignore */
      }
    } else {
      setUserState(null);
      try {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const value = useMemo(() => ({ user, setUser, ready }), [user, setUser, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
