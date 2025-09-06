import { PushNotifications, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { isNative } from './platform';

export interface NotificationHandler {
  requestPermission(): Promise<boolean>;
  register(): Promise<string | null>;
  onNotificationReceived(callback: (notification: any) => void): void;
  onNotificationOpened(callback: (notification: any) => void): void;
}

// Web Push Notification Handler (existing functionality)
class WebNotificationHandler implements NotificationHandler {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async register(): Promise<string | null> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
        ),
      });
      return JSON.stringify(subscription);
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  onNotificationReceived(callback: (notification: any) => void): void {
    // Web notifications are handled by service worker
    // This could be used for foreground notifications
  }

  onNotificationOpened(callback: (notification: any) => void): void {
    // Handle notification clicks through service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'notification-click') {
        callback(event.data.notification);
      }
    });
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Native Push Notification Handler (Capacitor)
class NativeNotificationHandler implements NotificationHandler {
  async requestPermission(): Promise<boolean> {
    const result = await PushNotifications.requestPermissions();
    return result.receive === 'granted';
  }

  async register(): Promise<string | null> {
    try {
      await PushNotifications.register();

      return new Promise((resolve) => {
        PushNotifications.addListener('registration', (token) => {
          resolve(token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Registration error:', error);
          resolve(null);
        });
      });
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      return null;
    }
  }

  onNotificationReceived(callback: (notification: any) => void): void {
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      callback(notification);
    });
  }

  onNotificationOpened(callback: (notification: any) => void): void {
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      callback(action.notification);
    });
  }
}

// Factory function to get the appropriate notification handler
export function getNotificationHandler(): NotificationHandler {
  return isNative ? new NativeNotificationHandler() : new WebNotificationHandler();
}

// Convenience functions for backward compatibility
export async function requestNotificationPermission(): Promise<boolean> {
  const handler = getNotificationHandler();
  return handler.requestPermission();
}

export async function registerForPushNotifications(): Promise<string | null> {
  const handler = getNotificationHandler();
  return handler.register();
}

export function setupNotificationHandlers(
  onReceived?: (notification: any) => void,
  onOpened?: (notification: any) => void
) {
  const handler = getNotificationHandler();

  if (onReceived) {
    handler.onNotificationReceived(onReceived);
  }

  if (onOpened) {
    handler.onNotificationOpened(onOpened);
  }
}
