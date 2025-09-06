// utils/api.ts
import { isNative } from "./platform";

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
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
      });

      return response.ok;
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

  const response = await fetch(fullUrl, {
    ...options,
    credentials: "include",
  });

  if (response.status === 401) {
    const refreshSuccess = await refreshToken();
    if (refreshSuccess) {
      // Retry the original request
      return fetch(fullUrl, {
        ...options,
        credentials: "include",
      });
    } else {
      // Redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Authentication failed");
    }
  }

  return response;
}
