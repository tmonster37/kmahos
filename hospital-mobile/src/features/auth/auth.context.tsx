import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { onUnauthorizedSession } from '@/lib/api/client';
import { authRepository, AuthRepository } from './auth.repository';
import { AccountInfoResponse, AuthStatus, LoginCredentials, RegisterRequest } from './auth.types';

export interface AuthContextValue {
  status: AuthStatus;
  user: AccountInfoResponse | null;
  login(credentials: LoginCredentials): Promise<AccountInfoResponse>;
  logout(): Promise<void>;
  register(request: RegisterRequest): Promise<AccountInfoResponse>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
  repository?: AuthRepository;
}

export function AuthProvider({ children, repository = authRepository }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AccountInfoResponse | null>(null);

  useEffect(() => {
    let active = true;

    const unsubscribe = onUnauthorizedSession(() => {
      if (active) {
        setUser(null);
        setStatus('signedOut');
      }
    });

    (async () => {
      try {
        const restored = await repository.restoreSession();
        if (!active) {
          return;
        }
        if (restored && restored.role === 'ROLE_PATIENT') {
          setUser(restored);
          setStatus('signedIn');
        } else {
          setUser(null);
          setStatus('signedOut');
        }
      } catch {
        if (active) {
          setUser(null);
          setStatus('signedOut');
        }
      }
    })();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [repository]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AccountInfoResponse> => {
      const account = await repository.login(credentials);
      setUser(account);
      setStatus('signedIn');
      return account;
    },
    [repository]
  );

  const logout = useCallback(async (): Promise<void> => {
    await repository.logout();
    setUser(null);
    setStatus('signedOut');
  }, [repository]);

  const register = useCallback(
    async (request: RegisterRequest): Promise<AccountInfoResponse> => {
      const account = await repository.register(request);
      setUser(account);
      setStatus('signedIn');
      return account;
    },
    [repository]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login,
      logout,
      register,
    }),
    [status, user, login, logout, register]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

