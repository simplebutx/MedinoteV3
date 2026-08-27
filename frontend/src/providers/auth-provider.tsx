import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import {
  clearStoredSession,
  readStoredSession,
  storeSession,
} from '@/services/auth-storage';

type AuthUser = {
  name: string;
  email: string;
  role?: string;
  accessToken?: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isHydrating: boolean;
  user: AuthUser | null;
  signIn: (payload: AuthUser) => Promise<void>;
  signUp: (payload: AuthUser) => Promise<void>;
  updateUser: (payload: Partial<AuthUser>) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        // 앱 재실행 시 저장된 로그인 정보를 복구한다.
        const storedUser = await readStoredSession();

        if (mounted) {
          setUser(storedUser);
        }
      } catch {
        await clearStoredSession();

        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsHydrating(false);
        }
      }
    }

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: user !== null,
      isHydrating,
      user,
      signIn: async (payload) => {
        // 로그인 성공 시 메모리 상태와 로컬 저장소를 함께 갱신한다.
        setUser(payload);
        await storeSession(payload);
      },
      signUp: async (payload) => {
        // 필요 시 회원가입 직후 로그인 상태로 이어붙일 때 사용한다.
        setUser(payload);
        await storeSession(payload);
      },
      updateUser: async (payload) => {
        setUser((currentUser) => {
          if (!currentUser) {
            return currentUser;
          }

          // 보호 API 응답으로 받은 최신 사용자 정보를 덮어쓴다.
          const nextUser = { ...currentUser, ...payload };
          void storeSession(nextUser);
          return nextUser;
        });
      },
      signOut: async () => {
        // 로그아웃 시 메모리와 저장소를 모두 비운다.
        setUser(null);
        await clearStoredSession();
      },
    }),
    [isHydrating, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export type { AuthUser };
