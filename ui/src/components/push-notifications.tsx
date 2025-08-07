import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Switch } from "./ui/switch";
import { useAuth } from "../hooks/use-auth";
import {
  pushNotificationService,
  type NotificationPayload,
} from "../lib/push-notifications";

export function PushNotifications() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    initializePushNotifications();
  }, []);

  const initializePushNotifications = async () => {
    setIsSupported(pushNotificationService.supported);

    if (pushNotificationService.supported) {
      setPermission(Notification.permission);

      const success = await pushNotificationService.initialize();
      if (success) {
        const subscription = await pushNotificationService.getSubscription();
        setIsSubscribed(!!subscription);
      }
    }
  };

  const handlePermissionRequest = async () => {
    if (!pushNotificationService.supported) return;

    setIsLoading(true);
    try {
      const permission = await pushNotificationService.requestPermission();
      setPermission(permission);
    } catch (error) {
      console.error("Failed to request permission:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user || !pushNotificationService.supported) return;

    setIsLoading(true);
    try {
      if (permission !== "granted") {
        const newPermission = await pushNotificationService.requestPermission();
        setPermission(newPermission);
        if (newPermission !== "granted") {
          return;
        }
      }

      const subscription = await pushNotificationService.subscribe();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Failed to subscribe:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const success = await pushNotificationService.unsubscribe();
      if (success) {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const payload: NotificationPayload = {
        title: "Test Notification",
        body: "This is a test notification from ODOT!",
        icon: "/vite.svg",
        data: { test: true },
      };

      await pushNotificationService.sendTestNotification(payload);
    } catch (error) {
      console.error("Failed to send test notification:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2">Push Notifications</h3>
        <p className="text-muted-foreground">
          Push notifications are not supported in this browser.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Push Notifications</h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable Notifications</p>
            <p className="text-sm text-muted-foreground">
              Get notified about important updates
            </p>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={isSubscribed ? handleUnsubscribe : handleSubscribe}
            disabled={isLoading || permission === "denied"}
          />
        </div>

        {permission === "default" && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm mb-2">
              You need to grant permission to receive notifications.
            </p>
            <Button
              onClick={handlePermissionRequest}
              disabled={isLoading}
              size="sm"
            >
              {isLoading ? "Requesting..." : "Grant Permission"}
            </Button>
          </div>
        )}

        {permission === "denied" && (
          <div className="p-4 bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive">
              Notifications are blocked. Please enable them in your browser
              settings.
            </p>
          </div>
        )}

        {permission === "granted" && (
          <div className="space-y-2">
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ Permission granted! You can now receive notifications.
              </p>
            </div>

            {isSubscribed && (
              <Button
                onClick={handleTestNotification}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                {isLoading ? "Sending..." : "Send Test Notification"}
              </Button>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>Status: {permission}</p>
          <p>Subscribed: {isSubscribed ? "Yes" : "No"}</p>
          <p>Supported: {isSupported ? "Yes" : "No"}</p>
        </div>
      </div>
    </Card>
  );
}
