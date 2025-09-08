import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export const isNativePlatform = () => Capacitor.isNativePlatform();
export const isNative = Capacitor.isNativePlatform();

export const openUrl = async (url: string) => {
  if (isNativePlatform()) {
    // Add mobile flag to URL for reliable detection
    const urlObj = new URL(url);
    urlObj.searchParams.set("mobile", "true");

    // Open in in-app browser to maintain WebView context
    await Browser.open({
      url: urlObj.toString(),
      presentationStyle: "popover",
      toolbarColor: "#000000",
    });
  } else {
    // Web browser - use normal navigation
    window.location.href = url;
  }
};
