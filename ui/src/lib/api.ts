// utils/api.ts
import { isNative } from "./platform";
import { TokenStorage } from "./token-storage";

// Get API base URL based on environment and platform
const getApiBaseUrl = () => {
  console.log("Debug API config:", {
    isNative,
    isDev: import.meta.env.DEV,
    VITE_MOBILE_API_URL: import.meta.env.VITE_MOBILE_API_URL,
    VITE_API_URL: import.meta.env.VITE_API_URL,
  });

  if (typeof window !== "undefined" && isNative) {
    // For mobile apps, use the production API URL or configured URL
    const url =
      import.meta.env.VITE_MOBILE_API_URL ||
      import.meta.env.VITE_API_URL ||
      "http://192.168.86.22:8080";
    console.log("Using mobile API URL:", url);
    return url;
  }
  // For web development, use relative URLs (proxy handles it)
  if (import.meta.env.DEV) {
    console.log("Using dev mode (empty base URL for proxy)");
    return "";
  }
  // For web production, use configured URL
  const url = import.meta.env.VITE_API_URL || "";
  console.log("Using web production API URL:", url);
  return url;
};

export const API_BASE_URL = getApiBaseUrl();

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

export async function refreshToken(): Promise<boolean> {
  if (isRefreshing) {
    return refreshPromise!;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const url = `${API_BASE_URL}/api/auth/refresh`;

      if (isNative) {
        // Mobile: Send refresh token in request body
        const refreshToken = await TokenStorage.getRefreshToken();
        if (!refreshToken) {
          return false;
        }

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
          }),
        });

        if (response.ok) {
          // Parse response and update stored tokens
          const data = await response.json();
          if (data.access_token && data.expires_in) {
            // Calculate expires_at from expires_in (seconds from now)
            const expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
            await TokenStorage.updateAccessToken(data.access_token, expiresAt);
          }
          return true;
        }
        return false;
      } else {
        // Web: Use cookies
        const response = await fetch(url, {
          method: "POST",
          credentials: "include",
        });
        return response.ok;
      }
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// API interceptor for handling 401s
export async function apiRequest(url: string, options: RequestInit = {}) {
  // Construct full URL for API requests
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  // Prepare headers
  const headers = new Headers(options.headers);

  // For native platforms, add Authorization header with access token
  if (isNative) {
    const accessToken = await TokenStorage.getAccessToken();
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  const requestOptions: RequestInit = {
    ...options,
    headers,
  };

  // For web platforms, include credentials for cookies
  if (!isNative) {
    requestOptions.credentials = "include";
  }

  const response = await fetch(fullUrl, requestOptions);

  if (response.status === 401) {
    const refreshSuccess = await refreshToken();
    if (refreshSuccess) {
      // Retry the original request with updated token
      if (isNative) {
        const newAccessToken = await TokenStorage.getAccessToken();
        if (newAccessToken) {
          headers.set("Authorization", `Bearer ${newAccessToken}`);
        }
      }

      return fetch(fullUrl, {
        ...requestOptions,
        headers,
      });
    } else {
      // Clear stored tokens on mobile and redirect to login
      if (isNative) {
        await TokenStorage.clearTokens();
      }
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Authentication failed");
    }
  }

  return response;
}
