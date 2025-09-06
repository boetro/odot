// contexts/AuthContext.tsx
import React from "react";
import type { User } from "@/lib/types";
import { useEffect, useState } from "react";
import { AuthContext } from "./auth-context-definition";
import { API_BASE_URL, apiRequest, refreshToken } from "@/lib/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const checkAuth = async () => {
    const setAuthenticatedUser = (userData: User) => {
      setUser(userData);
      setIsAuthenticated(true);

      async function refresh() {
        try {
          const success = await refreshToken();
          if (!success) {
            setIsAuthenticated(false);
            setUser(null);
          }
        } catch {
          setIsAuthenticated(false);
          setUser(null);
        }
      }

      // Calculate refresh timeout based on token expiration
      // Refresh 2 minutes before expiration, or use 10 minutes as fallback
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = userData.tokenExpiresAt - now;
      const refreshIn = Math.max(0, (expiresIn - 120) * 1000); // 2 minutes before expiration
      const timeout = refreshIn > 0 ? refreshIn : 10 * 60 * 1000; // fallback to 10 minutes

      setTimeout(refresh, timeout);

      return {
        user: userData,
        isAuthenticated: true,
      };
    };

    const setUnauthenticated = () => {
      setIsAuthenticated(false);
      setUser(null);
      return {
        user: null,
        isAuthenticated: false,
      };
    };

    const tryRefreshAndRetry = async () => {
      try {
        const refreshSuccess = await refreshToken();
        const url = `${API_BASE_URL}/api/me`;
        if (refreshSuccess) {
          const retryResponse = await fetch(url, {
            credentials: "include",
          });

          if (retryResponse.ok) {
            const userData = await retryResponse.json();
            return setAuthenticatedUser(userData);
          }
        }
      } catch {
        // Refresh failed
      }
      return setUnauthenticated();
    };

    try {
      // Call your backend to verify the JWT in the cookie
      const response = await apiRequest("/api/me", {
        credentials: "include", // Important for cookies
      });

      if (response.ok) {
        const userData = await response.json();
        return setAuthenticatedUser(userData);
      } else {
        return await tryRefreshAndRetry();
      }
    } catch {
      return await tryRefreshAndRetry();
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
