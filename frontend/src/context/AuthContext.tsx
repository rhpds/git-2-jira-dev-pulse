/**
 * Authentication Context
 * Manages user authentication state, tokens, and profile
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { UserProfile } from "../api/auth";
import {
  login as apiLogin,
  register as apiRegister,
  refreshToken as apiRefreshToken,
  getProfile,
  setAuthToken,
  clearAuthToken,
} from "../api/auth";

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string,
    orgName?: string
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "dp_access_token";
const REFRESH_KEY = "dp_refresh_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const handleTokens = useCallback(
    (accessToken: string, refreshToken: string) => {
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_KEY, refreshToken);
      setAuthToken(accessToken);
    },
    []
  );

  const clearTokens = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    clearAuthToken();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await getProfile();
      setState((prev) => ({
        ...prev,
        user: profile,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }));
    } catch {
      // Try refresh token
      const refreshTokenValue = localStorage.getItem(REFRESH_KEY);
      if (refreshTokenValue) {
        try {
          const tokens = await apiRefreshToken(refreshTokenValue);
          handleTokens(tokens.access_token, tokens.refresh_token);
          const profile = await getProfile();
          setState({
            user: profile,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return;
        } catch {
          // Refresh failed
        }
      }
      clearTokens();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, [handleTokens, clearTokens]);

  // Initialize auth state on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      setAuthToken(token);
      refreshUser();
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const tokens = await apiLogin(email, password);
      handleTokens(tokens.access_token, tokens.refresh_token);
      const profile = await getProfile();
      setState({
        user: profile,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      const message =
        err.response?.data?.detail || "Login failed. Please try again.";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw new Error(message);
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    orgName?: string
  ) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const tokens = await apiRegister(email, password, fullName, orgName);
      handleTokens(tokens.access_token, tokens.refresh_token);
      const profile = await getProfile();
      setState({
        user: profile,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      const message =
        err.response?.data?.detail ||
        "Registration failed. Please try again.";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw new Error(message);
    }
  };

  const logout = () => {
    clearTokens();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  };

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
