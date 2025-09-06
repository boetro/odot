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
  },
};

export default config;
