// contexts/AuthContext.tsx
import React from "react";
import type { User } from "@/lib/types";
import { useEffect, useState } from "react";
import { AuthContext } from "./auth-context-definition";
import { refreshToken } from "@/lib/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const checkAuth = async () => {
    try {
      // Call your backend to verify the JWT in the cookie
      const response = await apiRequest("/api/me", {
        credentials: "include", // Important for cookies
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);

        async function refresh() {
          try {
            const success = await refreshToken();
            if (!success) {
              setIsAuthenticated(false);
              setUser(null);
            } else {
              setTimeout(refresh, 10 * 60 * 1000);
            }
          } catch {
            setIsAuthenticated(false);
            setUser(null);
          }
        }

        setTimeout(refresh, 10 * 60 * 1000);

        return {
          user: userData,
          isAuthenticated: true,
        };
      } else {
        setIsAuthenticated(false);
        setUser(null);
        return {
          user: null,
          isAuthenticated: false,
        };
      }
    } catch {
      setIsAuthenticated(false);
      setUser(null);
      return {
        user: null,
        isAuthenticated: false,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      // Redirect to your OAuth provider or login endpoint
      window.location.href = "/login";
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

async function apiRequest(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const makeRequest = () =>
    fetch(url, {
      ...options,
      credentials: "include",
    });

  let response = await makeRequest();

  // If we get a 401, try to refresh the token
  if (response.status === 401) {
    const refreshSuccess = await refreshToken();

    if (refreshSuccess) {
      // Retry the original request with the new token
      response = await makeRequest();
    } else {
      // Refresh failed, redirect to login
      throw new Error("Authentication failed");
    }
  }

  return response;
}
