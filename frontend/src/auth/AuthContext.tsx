import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { clearToken, getToken, setToken } from "../api/client";

interface AuthContextValue {
  isAuthenticated: boolean;
  signIn: (accessToken: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());

  useEffect(() => {
    const handleUnauthorized = () => setTokenState(null);
    window.addEventListener("task-tracker:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("task-tracker:unauthorized", handleUnauthorized);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(token),
      signIn: (accessToken: string) => {
        setToken(accessToken);
        setTokenState(accessToken);
      },
      signOut: () => {
        clearToken();
        setTokenState(null);
      },
    }),
    [token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
