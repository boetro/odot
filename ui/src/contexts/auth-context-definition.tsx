import { createContext } from "react";
import type { User } from "@/lib/types";

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<{ isAuthenticated: boolean; user: User | null }>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
