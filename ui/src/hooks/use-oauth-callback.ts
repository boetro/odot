import { useEffect } from "react";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { isNative } from "@/lib/platform";

export function useOAuthCallback(
  handleMobileLogin: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
    userData: any,
  ) => Promise<boolean>,
) {
  useEffect(() => {
    if (!isNative) return;

    const handleDeepLink = async (event: URLOpenListenerEvent) => {
      const url = event.url;
      console.log("Deep link received:", url);

      // Check if this is an OAuth callback
      if (url.startsWith("com.odot.app://oauth/callback")) {
        try {
          const urlObj = new URL(url);
          const accessToken = urlObj.searchParams.get("access_token");
          const refreshToken = urlObj.searchParams.get("refresh_token");
          const expiresAt = urlObj.searchParams.get("expires_at");
          const userDataStr = urlObj.searchParams.get("user");

          if (accessToken && refreshToken && expiresAt && userDataStr) {
            const userData = JSON.parse(decodeURIComponent(userDataStr));
            const success = await handleMobileLogin(
              accessToken,
              refreshToken,
              parseInt(expiresAt),
              userData,
            );

            if (!success) {
              console.error("Failed to handle mobile login");
            }
          } else {
            console.error("Missing OAuth parameters in callback URL");
          }
        } catch (error) {
          console.error("Error parsing OAuth callback:", error);
        }
      }
    };

    // Add listener for URL open events
    App.addListener("appUrlOpen", handleDeepLink);

    return () => {
      App.removeAllListeners();
    };
  }, [handleMobileLogin]);
}
