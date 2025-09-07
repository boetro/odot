import { createContext } from "react";
import type { User } from "@/lib/types";

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<{ isAuthenticated: boolean; user: User | null }>;
  handleMobileLogin: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
    userData: User,
  ) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
