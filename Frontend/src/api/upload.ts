import { ApiResponse } from "./client";

export interface UploadImageResult {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export const uploadApi = {
  /**
   * 上传单张图片至后端微内核服务
   * @param file File 对象或包含 Base64 的字符串对象
   */
  async uploadImage(file: File | { file: string; filename?: string }): Promise<ApiResponse<UploadImageResult>> {
    const token = localStorage.getItem("diary_token");
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      let response: Response;
      if (file instanceof File) {
        const formData = new FormData();
        formData.append("file", file, file.name);
        response = await fetch("/api/upload/image", {
          method: "POST",
          headers,
          body: formData,
        });
      } else {
        headers["Content-Type"] = "application/json";
        response = await fetch("/api/upload/image", {
          method: "POST",
          headers,
          body: JSON.stringify(file),
        });
      }

      if (!response.ok && response.status === 401) {
        localStorage.removeItem("diary_token");
        localStorage.removeItem("diary_user");
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        return {
          status: 0,
          content: "登录已失效，请重新登录后再上传图片",
        };
      }

      const json: ApiResponse<UploadImageResult> = await response.json();
      return json;
    } catch (err: any) {
      return {
        status: 0,
        content: `图片上传通信异常: ${err.message || String(err)}`,
      };
    }
  },
};
