import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isWeb = Capacitor.getPlatform() === 'web';

export function getPlatform() {
  return Capacitor.getPlatform();
}

export function isCapacitorNative() {
  return Capacitor.isNativePlatform();
}
