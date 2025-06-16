// utils/api.ts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

export async function refreshToken(): Promise<boolean> {
  if (isRefreshing) {
    return refreshPromise!;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
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
  const response = await fetch(url, {
    ...options,
    credentials: "include",
  });

  if (response.status === 401) {
    const refreshSuccess = await refreshToken();
    if (refreshSuccess) {
      // Retry the original request
      return fetch(url, {
        ...options,
        credentials: "include",
      });
    } else {
      // Redirect to login
      window.location.href = "/login";
      throw new Error("Authentication failed");
    }
  }

  return response;
}
