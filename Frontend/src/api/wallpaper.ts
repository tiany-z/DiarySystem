import { apiClient } from "./client";

export interface WallpaperItem {
  url: string;
  title: string;
  copyright: string;
  date?: string;
}

export interface WallpaperResponse {
  wallpapers: WallpaperItem[];
  cached: boolean;
  fallback?: boolean;
}

export interface SystemWallpaperSettings {
  enabled: boolean;
  blur: number;
  opacity: number;
  currentIndex: number;
  selectedWallpaperUrl: string;
  title?: string;
  copyright?: string;
}

export const wallpaperApi = {
  getBingWallpapers: () => {
    return apiClient.post<WallpaperResponse>("/api/wallpaper/bing", {});
  },
  getSystemWallpaperSettings: () => {
    return apiClient.get<SystemWallpaperSettings>("/api/wallpaper/settings");
  },
  saveSystemWallpaperSettings: (settings: Partial<SystemWallpaperSettings>) => {
    return apiClient.post<SystemWallpaperSettings>("/api/wallpaper/settings", settings);
  },
};
