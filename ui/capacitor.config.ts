import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.odot.app",
  appName: "odot",
  webDir: "dist",
  server: {
    androidScheme: "http",
    allowNavigation: ["http://192.168.86.22:8080", "http://localhost:8080"],
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#ffffff",
      overlaysWebView: true,
    },
  },
  android: {
    webContentsDebuggingEnabled: true,
    overrideUserAgent:
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36 odot",
  },
};

export default config;
