/**
 * DiarySystem API 客户端底层请求器
 * 与后端 StandardResult 契约深度对齐
 */

export interface ApiResponse<T = any> {
  status: 1 | 0;
  data?: T;
  content?: string;
  errorDetail?: any;
}

class ApiClient {
  private baseUrl: string = "";

  private getToken(): string | null {
    return localStorage.getItem("diary_token");
  }

  public async request<T = any>(
    path: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      body?: any;
      query?: Record<string, any>;
      headers?: Record<string, string>;
    } = {}
  ): Promise<ApiResponse<T>> {
    const { method = "POST", body, query, headers = {} } = options;

    let url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    if (query && Object.keys(query).length > 0) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) {
          qs.append(k, String(v));
        }
      }
      url += (url.includes("?") ? "&" : "?") + qs.toString();
    }

    const token = this.getToken();
    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (token) {
      reqHeaders["Authorization"] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: reqHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok && res.status === 401) {
        // Token 失效或过期
        localStorage.removeItem("diary_token");
        localStorage.removeItem("diary_user");
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        return {
          status: 0,
          content: "登录凭证已过期，请重新登录",
        };
      }

      const json: ApiResponse<T> = await res.json();
      return json;
    } catch (err: any) {
      return {
        status: 0,
        content: `网络通信异常: ${err.message || String(err)}`,
      };
    }
  }

  public get<T = any>(path: string, query?: Record<string, any>) {
    return this.request<T>(path, { method: "GET", query });
  }

  public post<T = any>(path: string, body?: any) {
    return this.request<T>(path, { method: "POST", body });
  }
}

export const apiClient = new ApiClient();
