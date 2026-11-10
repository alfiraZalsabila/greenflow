import type {
  AuthUser,
  LoginInput,
  RegisterInput,
} from "@greenflow/shared";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api, isUnauthorized } from "@/api/client";

const ME_QUERY_KEY = ["auth", "me"] as const;

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery<AuthUser | null>({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      try {
        const data = await api.get<{ user: AuthUser }>("/auth/me");
        return data.user;
      } catch (error) {
        if (isUnauthorized(error)) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const login = useCallback(
    async (input: LoginInput) => {
      const data = await api.post<{ user: AuthUser }>("/auth/login", input);
      queryClient.setQueryData(ME_QUERY_KEY, data.user);
      return data.user;
    },
    [queryClient],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const data = await api.post<{ user: AuthUser }>("/auth/register", input);
      queryClient.setQueryData(ME_QUERY_KEY, data.user);
      return data.user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "auth",
      });
      queryClient.setQueryData(ME_QUERY_KEY, null);
    }
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      isLoading: meQuery.isPending,
      isAdmin: meQuery.data?.peran === "admin",
      login,
      register,
      logout,
      refreshUser,
    }),
    [meQuery.data, meQuery.isPending, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  }
  return context;
}
