// contexts/AuthContext.tsx
import React from "react";
import type { User } from "@/lib/types";
import { useEffect, useState } from "react";
import { AuthContext } from "./auth-context-definition";
import { apiRequest, refreshToken } from "@/lib/api";
import { TokenStorage } from "@/lib/token-storage";
import { isNative } from "@/lib/platform";
import { useOAuthCallback } from "@/hooks/use-oauth-callback";

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
            await clearAuthState();
          }
        } catch {
          await clearAuthState();
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

    const clearAuthState = async () => {
      setIsAuthenticated(false);
      setUser(null);
      if (isNative) {
        await TokenStorage.clearTokens();
      }
      return {
        user: null,
        isAuthenticated: false,
      };
    };

    const tryRefreshAndRetry = async () => {
      try {
        const refreshSuccess = await refreshToken();
        if (refreshSuccess) {
          const response = await apiRequest("/api/me");
          if (response.ok) {
            const userData = await response.json();
            return setAuthenticatedUser(userData);
          }
        }
      } catch {
        // Refresh failed
      }
      return await clearAuthState();
    };

    try {
      // For mobile, check if we have valid stored tokens first
      if (isNative) {
        const hasTokens = await TokenStorage.hasValidTokens();
        if (!hasTokens) {
          return await clearAuthState();
        }
      }

      // Call backend to verify authentication
      const response = await apiRequest("/api/me");

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

  // Handle successful OAuth login for mobile platforms
  const handleMobileLogin = async (
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
    userData: User,
  ) => {
    if (!isNative) {
      console.warn("handleMobileLogin called on non-native platform");
      return false;
    }

    try {
      const success = await TokenStorage.storeTokens({
        accessToken,
        refreshToken,
        expiresAt,
      });

      if (success) {
        setUser(userData);
        setIsAuthenticated(true);
        return true;
      }
    } catch (error) {
      console.error("Failed to handle mobile login:", error);
    }
    return false;
  };

  const logout = async () => {
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });
      setIsAuthenticated(false);
      setUser(null);
      if (isNative) {
        await TokenStorage.clearTokens();
      }
    } catch (error) {
      console.error("Logout failed:", error);
      // Clear local state even if server call fails
      setIsAuthenticated(false);
      setUser(null);
      if (isNative) {
        await TokenStorage.clearTokens();
      }
    }
  };

  // Set up OAuth callback handler for mobile
  useOAuthCallback(handleMobileLogin);

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
        handleMobileLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
