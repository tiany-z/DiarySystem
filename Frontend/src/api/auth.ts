import { apiClient, ApiResponse } from "./client";

export interface AuthUserInfo {
  userId: string;
  username: string;
  nickname?: string;
  avatar?: string | null;
  token: string;
}

export interface AdminUserInfo {
  id: string;
  username: string;
  nickname?: string;
  avatar?: string | null;
  created_at: string;
  note_count: number;
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

export const adminApi = {
  getUsersList: async (): Promise<ApiResponse<AdminUserInfo[]>> => {
    return apiClient.post<AdminUserInfo[]>("/api/admin/users/list", {});
  },

  createUser: async (data: {
    username: string;
    password: string;
    nickname?: string;
  }): Promise<ApiResponse<AdminUserInfo>> => {
    return apiClient.post<AdminUserInfo>("/api/admin/users/create", data);
  },

  updatePassword: async (data: {
    userId: string;
    newPassword: string;
  }): Promise<ApiResponse<{ id: string; username: string; updated: boolean }>> => {
    return apiClient.post<{ id: string; username: string; updated: boolean }>(
      "/api/admin/users/update-password",
      data
    );
  },

  deleteUser: async (data: {
    userId: string;
  }): Promise<ApiResponse<{ id: string; username: string; deletedNotesCount: number }>> => {
    return apiClient.post<{ id: string; username: string; deletedNotesCount: number }>(
      "/api/admin/users/delete",
      data
    );
  },
};

export const userApi = {
  updateAvatar: async (avatar: string | null): Promise<ApiResponse<{ avatar: string | null; user?: any }>> => {
    return apiClient.post<{ avatar: string | null; user?: any }>("/api/user/avatar", { avatar });
  },

  getProfile: async (): Promise<ApiResponse<any>> => {
    return apiClient.get<any>("/api/user/profile");
  },
};

