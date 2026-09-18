import {
  decryptApiKey,
  executeQuery,
  normalizeCompletionsUrl,
  returnError,
  returnSuccess,
  StandardResult,
  tryCatchErrorToString,
} from "../../../../core/index.js";

export const api = {
  routePath: "/api/user/ai-config/test",
  authRequired: true,
  handler: async (
    reqCtx: { req: any; body?: any; user?: any },
    ctx: any
  ): Promise<StandardResult<any>> => {
    try {
      const currentUserId =
        reqCtx?.user?.userId ||
        ctx?.userPayload?.userId ||
        ctx?.user?.userId ||
        ctx?.userPayload?.id;

      if (!currentUserId) {
        return returnError("未鉴权请求或用户登录态失效");
      }

      const body = reqCtx.body || {};
      let targetBaseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : "";
      let targetModel = typeof body.modelName === "string" ? body.modelName.trim() : "";
      let targetApiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

      // 若未传入某些项，尝试从数据库当前用户的存量配置中补齐
      if (!targetBaseUrl || !targetModel || !targetApiKey) {
        const userRes = await executeQuery<any>(
          "SELECT ai_base_url, ai_model_name, ai_api_key FROM users WHERE id = ? LIMIT 1",
          [currentUserId]
        );
        const userRow = userRes.data?.[0];
        if (userRow) {
          if (!targetBaseUrl && userRow.ai_base_url) targetBaseUrl = userRow.ai_base_url;
          if (!targetModel && userRow.ai_model_name) targetModel = userRow.ai_model_name;
          if (!targetApiKey && userRow.ai_api_key) {
            targetApiKey = decryptApiKey(userRow.ai_api_key);
          }
        }
      }

      if (!targetBaseUrl) {
        return returnError("请先提供 API 基础地址 (Base URL)");
      }
      if (!targetBaseUrl.startsWith("http://") && !targetBaseUrl.startsWith("https://")) {
        return returnError("API 基础地址必须以 http:// 或 https:// 开头");
      }
      if (!targetModel) {
        return returnError("请先提供模型名称 (Model Name)");
      }
      if (!targetApiKey) {
        return returnError("请先提供 API 密钥 (API Key)");
      }

      const endpointUrl = normalizeCompletionsUrl(targetBaseUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时

      const startTime = Date.now();

      try {
        const resp = await fetch(endpointUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${targetApiKey}`,
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;

        if (resp.ok) {
          return returnSuccess({
            success: true,
            latencyMs,
            model: targetModel,
            message: `服务连通成功，响应延迟 ${latencyMs}ms`,
          });
        }

        const errorText = await resp.text().catch(() => "");
        let errorMsg = `HTTP ${resp.status}`;

        if (resp.status === 401) {
          errorMsg = "API 密钥无效或未授权 (401 Unauthorized)";
        } else if (resp.status === 404) {
          errorMsg = `模型 [${targetModel}] 或端点路径不存在 (404 Not Found)`;
        } else if (resp.status === 429) {
          errorMsg = "API 访问配额超限或触发频控 (429 Too Many Requests)";
        } else if (errorText) {
          try {
            const parsed = JSON.parse(errorText);
            errorMsg = parsed.error?.message || parsed.message || errorMsg;
          } catch {
            errorMsg = errorText.slice(0, 150);
          }
        }

        return returnError(`连通性测试失败: ${errorMsg}`);
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === "AbortError" || fetchErr.code === "ABORT_ERR") {
          return returnError("连通测试超时 (超过 8s)，请检查 Base URL 是否可达或本地代理/网络设置");
        }
        return returnError(`网络连接异常: ${fetchErr.message || String(fetchErr)}`);
      }
    } catch (error) {
      return returnError(`连通性测试探针异常: ${tryCatchErrorToString(error)}`);
    }
  },
};

export default api;
