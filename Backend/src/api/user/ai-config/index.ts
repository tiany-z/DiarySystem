import {
  decryptApiKey,
  delKV,
  encryptApiKey,
  executeQuery,
  returnError,
  returnSuccess,
  StandardResult,
  tryCatchErrorToString,
} from "../../../core/index.js";

function maskApiKey(key: string): string {
  if (!key) return "";
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "sk-****";
  const start = trimmed.slice(0, 3);
  const end = trimmed.slice(-4);
  return `${start}-****${end}`;
}

function normalizeBaseUrl(url: string): string {
  let clean = url.trim();
  while (clean.endsWith("/")) {
    clean = clean.slice(0, -1);
  }
  return clean;
}

export const api = {
  routePath: "/api/user/ai-config",
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

      const method = (reqCtx.req.method || "GET").toUpperCase();

      // 1. GET: 获取当前用户的 AI 配置 (脱敏展示)
      if (method === "GET") {
        const userRes = await executeQuery<any>(
          "SELECT ai_base_url, ai_model_name, ai_api_key FROM users WHERE id = ? LIMIT 1",
          [currentUserId]
        );

        if (userRes.status === 0) {
          return returnError(`查询 AI 配置失败: ${userRes.content}`);
        }

        const userRow = userRes.data?.[0] || {};
        const encryptedKey = userRow.ai_api_key || "";
        const plainKey = encryptedKey ? decryptApiKey(encryptedKey) : "";

        return returnSuccess({
          baseUrl: userRow.ai_base_url || "",
          modelName: userRow.ai_model_name || "",
          hasKey: Boolean(plainKey),
          maskedKey: maskApiKey(plainKey),
        });
      }

      // 2. POST / PUT: 保存或更新当前用户的 AI 配置
      if (method === "POST" || method === "PUT") {
        const body = reqCtx.body || {};
        const rawBaseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : "";
        const rawModelName = typeof body.modelName === "string" ? body.modelName.trim() : "";
        const rawApiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

        if (!rawBaseUrl) {
          return returnError("API 基础地址 (Base URL) 不能为空");
        }

        if (!rawBaseUrl.startsWith("http://") && !rawBaseUrl.startsWith("https://")) {
          return returnError("API 基础地址必须以 http:// 或 https:// 开头");
        }

        if (!rawModelName) {
          return returnError("模型名称 (Model Name) 不能为空");
        }

        const cleanBaseUrl = normalizeBaseUrl(rawBaseUrl);

        // 先查出当前存储的旧 Key
        const oldUserRes = await executeQuery<any>(
          "SELECT ai_api_key FROM users WHERE id = ? LIMIT 1",
          [currentUserId]
        );
        const oldEncryptedKey = oldUserRes.data?.[0]?.ai_api_key || "";

        let finalEncryptedKey = oldEncryptedKey;

        // 若用户输入了新的非空 Key，则加密后写入；若留空则保留原 Key
        if (rawApiKey) {
          finalEncryptedKey = encryptApiKey(rawApiKey);
        }

        const updateRes = await executeQuery(
          "UPDATE users SET ai_base_url = ?, ai_model_name = ?, ai_api_key = ? WHERE id = ?",
          [cleanBaseUrl, rawModelName, finalEncryptedKey, currentUserId]
        );

        if (updateRes.status === 0) {
          return returnError(`更新 AI 配置失败: ${updateRes.content}`);
        }

        // 驱逐缓存
        await delKV("users", currentUserId);

        const currentPlainKey = finalEncryptedKey ? decryptApiKey(finalEncryptedKey) : "";

        return returnSuccess(
          {
            baseUrl: cleanBaseUrl,
            modelName: rawModelName,
            hasKey: Boolean(currentPlainKey),
            maskedKey: maskApiKey(currentPlainKey),
          },
          "AI 模型配置已成功保存"
        );
      }

      return returnError(`不支持的 HTTP 请求方法: ${method}`);
    } catch (error) {
      return returnError(`处理 AI 配置接口异常: ${tryCatchErrorToString(error)}`);
    }
  },
};

export default api;
