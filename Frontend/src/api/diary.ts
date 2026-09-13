import { apiClient, ApiResponse } from "./client";

export interface DiaryItem {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  weather: string;
  mood: string;
  is_public?: boolean | number;
  created_at: string;
  createdAt?: string;
  username?: string;
  nickname?: string;
  avatar?: string | null;
}

export const diaryApi = {
  // 获取公开日记列表 (无需登录)
  publicList: async (): Promise<ApiResponse<DiaryItem[]>> => {
    return apiClient.post<DiaryItem[]>("/api/diary/public", {});
  },

  // 获取个人日记列表 (需登录)
  list: async (): Promise<ApiResponse<DiaryItem[]>> => {
    return apiClient.post<DiaryItem[]>("/api/diary/list", {});
  },

  // 查看日记详情
  detail: async (id: string): Promise<ApiResponse<DiaryItem>> => {
    return apiClient.post<DiaryItem>("/api/diary/detail", { id });
  },

  // 创建新日记
  create: async (payload: {
    title: string;
    content: string;
    weather?: string;
    mood?: string;
    is_public?: boolean | number;
  }): Promise<ApiResponse<{ id: string; title: string; content: string; created_at?: string }>> => {
    return apiClient.post("/api/diary/create", payload);
  },

  // 更新日记
  update: async (payload: {
    id: string;
    title?: string;
    content?: string;
    weather?: string;
    mood?: string;
    is_public?: boolean | number;
  }): Promise<ApiResponse<{ id: string; updated: boolean }>> => {
    return apiClient.post("/api/diary/update", payload);
  },

  // 删除日记
  delete: async (id: string): Promise<ApiResponse<{ id: string; deleted: boolean }>> => {
    return apiClient.post("/api/diary/delete", { id });
  },
};
