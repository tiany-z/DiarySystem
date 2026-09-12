import { apiClient, ApiResponse } from "./client";

export interface AuthUserInfo {
  userId: string;
  username: string;
  nickname?: string;
  token: string;
}

export const authApi = {
  login: async (username: string, password: string): Promise<ApiResponse<AuthUserInfo>> => {
    return apiClient.post<AuthUserInfo>("/api/auth/login", { username, password });
  },

  register: async (
    username: string,
    password: string,
    nickname?: string
  ): Promise<ApiResponse<AuthUserInfo>> => {
    return apiClient.post<AuthUserInfo>("/api/auth/register", {
      username,
      password,
      nickname,
    });
  },
};
