import { useContext } from "react";
import { AuthContext } from "@/contexts/auth-context-definition";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const useAuthRequired = () => {
  const data = useAuth();
  if (!data.user) {
    // TODO: should probably redirect to login page
    throw new Error("User is not authenticated");
  }
  return {
    ...data,
    user: data.user,
  };
};
