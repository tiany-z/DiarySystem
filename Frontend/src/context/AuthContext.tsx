import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi, AuthUserInfo } from "../api/auth";

interface AuthContextType {
  user: AuthUserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (
    username: string,
    password: string,
    nickname?: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("diary_token");
      const savedUser = localStorage.getItem("diary_user");
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {
      localStorage.removeItem("diary_token");
      localStorage.removeItem("diary_user");
    } finally {
      setIsLoading(false);
    }

    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    if (res.status === 1 && res.data) {
      setUser(res.data);
      setToken(res.data.token);
      localStorage.setItem("diary_token", res.data.token);
      localStorage.setItem("diary_user", JSON.stringify(res.data));
      return { success: true };
    }
    return { success: false, message: res.content || "登录失败" };
  };

  const register = async (username: string, password: string, nickname?: string) => {
    const res = await authApi.register(username, password, nickname);
    if (res.status === 1 && res.data) {
      setUser(res.data);
      setToken(res.data.token);
      localStorage.setItem("diary_token", res.data.token);
      localStorage.setItem("diary_user", JSON.stringify(res.data));
      return { success: true };
    }
    return { success: false, message: res.content || "注册失败" };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("diary_token");
    localStorage.removeItem("diary_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
