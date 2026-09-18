import { executeQuery } from "../db/mysql.js";
import { LogClient } from "../log/logger.js";
import { returnError, returnSuccess, StandardResult, tryCatchErrorToString } from "../flow/result.js";

/**
 * 启动时自愈核验并补充 users 表的 AI 模型私有化配置字段:
 * - ai_base_url: VARCHAR(512)
 * - ai_model_name: VARCHAR(128)
 * - ai_api_key: TEXT (AES 加密存储)
 */
export async function ensureUserAiConfigColumns(): Promise<StandardResult<boolean>> {
  try {
    const checkSql = "SHOW COLUMNS FROM users;";
    const checkRes = await executeQuery<any>(checkSql);
    if (checkRes.status === 0 || !checkRes.data) {
      return returnError(`读取 users 表元数据失败: ${checkRes.content}`);
    }

    const existingColumns = new Set(checkRes.data.map((col: any) => col.Field));
    const missingStatements: string[] = [];

    if (!existingColumns.has("ai_base_url")) {
      missingStatements.push("ADD COLUMN ai_base_url VARCHAR(512) DEFAULT NULL");
    }
    if (!existingColumns.has("ai_model_name")) {
      missingStatements.push("ADD COLUMN ai_model_name VARCHAR(128) DEFAULT NULL");
    }
    if (!existingColumns.has("ai_api_key")) {
      missingStatements.push("ADD COLUMN ai_api_key TEXT DEFAULT NULL");
    }

    if (missingStatements.length > 0) {
      const alterSql = `ALTER TABLE users ${missingStatements.join(", ")};`;
      const alterRes = await executeQuery(alterSql);
      if (alterRes.status === 0) {
        return returnError(`自愈升级 users 表 AI 配置字段失败: ${alterRes.content}`);
      }
      LogClient.success(
        `🤖 users 表已自愈补充 AI 模型配置字段: [${missingStatements.join(", ")}]`,
        undefined,
        "AdminInit"
      );
    } else {
      LogClient.info("🤖 users 表 AI 配置字段校验完整，状态就绪", undefined, "AdminInit");
    }

    return returnSuccess(true);
  } catch (err: any) {
    return returnError(`自愈迁移 users.ai_* 字段异常: ${tryCatchErrorToString(err)}`);
  }
}
