import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@workspace/api-client-react";
import { useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_STORAGE_KEY = "ikodi.localUser";

function readLocalUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isValidUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistLocalUser(user: User | null) {
  if (typeof window === "undefined") return;
  if (!user) {
    window.localStorage.removeItem(LOCAL_USER_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(user));
}

function isValidUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;
  return "id" in value && "username" in value && "role" in value;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => readLocalUser());
  
  const { data: currentUser, isLoading, error } = useGetCurrentUser({
    query: {
      retry: false,
    }
  } as any);

  const setUser = (nextUser: User | null) => {
    setUserState(nextUser);
    persistLocalUser(nextUser);
  };

  useEffect(() => {
    if (isValidUser(currentUser)) {
      setUser(currentUser);
    } else if (currentUser === null && !readLocalUser()) {
      setUser(null);
    } else if (!currentUser && !error && !readLocalUser()) {
      setUser(null);
    }
  }, [currentUser, error]);

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
