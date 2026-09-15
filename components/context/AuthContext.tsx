"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, LoginResponse } from "@/lib/api/types";
import { ulpfApi } from "@/lib/api/ulpf";

interface AuthContextType {
  user: User | null;
  role: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await ulpfApi.getCurrentUser(3000);
      setUser(currentUser);
    } catch (err: any) {
      const isAuthError =
        err?.code === "HTTP_401" ||
        err?.code === "HTTP_403" ||
        err?.message?.includes("401") ||
        err?.message?.includes("403");
      if (isAuthError) {
        setUser(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("logforge_access_token");
          localStorage.removeItem("logforge_user");
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    // 1. Instant hydration from localStorage (never block with spinner if cached)
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("logforge_user");
      const token = localStorage.getItem("logforge_access_token");

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed && active) {
            setUser(parsed);
            setIsLoading(false);
          }
        } catch {
          localStorage.removeItem("logforge_user");
        }
      } else if (!token) {
        setIsLoading(false);
      }

      // 2. Background verification with backend (silent, 3s timeout)
      if (token) {
        ulpfApi
          .getCurrentUser(3000)
          .then((freshUser) => {
            if (active) {
              setUser(freshUser);
              setIsLoading(false);
            }
          })
          .catch((err: any) => {
            if (active) {
              const isAuthError =
                err?.code === "HTTP_401" ||
                err?.code === "HTTP_403" ||
                err?.message?.includes("401") ||
                err?.message?.includes("403");
              if (isAuthError) {
                setUser(null);
                localStorage.removeItem("logforge_access_token");
                localStorage.removeItem("logforge_user");
              }
              setIsLoading(false);
            }
          });
      }

      // 3. Cross-tab synchronization (StorageEvent fires across different tabs on same origin)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === "logforge_user" || e.key === "logforge_access_token") {
          const updatedUser = localStorage.getItem("logforge_user");
          if (updatedUser) {
            try {
              setUser(JSON.parse(updatedUser));
              setIsLoading(false);
            } catch {}
          } else {
            setUser(null);
            setIsLoading(false);
          }
        }
      };

      window.addEventListener("storage", handleStorageChange);
      return () => {
        active = false;
        window.removeEventListener("storage", handleStorageChange);
      };
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<LoginResponse> => {
    setIsLoading(true);
    try {
      const res = await ulpfApi.login({ username, password });
      setUser(res.user);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await ulpfApi.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      // ADMIN role implicitly grants all permissions
      if (user.roles?.includes("ADMIN")) return true;
      return Boolean(user.permissions?.includes(permission));
    },
    [user]
  );

  const hasRole = useCallback(
    (roleName: string): boolean => {
      if (!user) return false;
      return Boolean(user.roles?.includes(roleName));
    },
    [user]
  );

  const primaryRole = user?.roles?.[0] || null;
  const permissions = user?.permissions || [];

  return (
    <AuthContext.Provider
      value={{
        user,
        role: primaryRole,
        permissions,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
        refreshUser,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
