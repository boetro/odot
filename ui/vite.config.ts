import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  server: {
    proxy:
      process.env.NODE_ENV === "development"
        ? {
            "/api": {
              target: process.env.VITE_API_URL || "http://localhost:8080",
              changeOrigin: true,
            },
            "/health": {
              target: process.env.VITE_API_URL || "http://localhost:8080",
              changeOrigin: true,
            },
            "/swagger": {
              target: process.env.VITE_API_URL || "http://localhost:8080",
              changeOrigin: true,
            },
          }
        : {},
  },
});
