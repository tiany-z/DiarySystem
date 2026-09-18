import { StandardResult } from "../flow/result.js";
/**
 * 启动时自愈核验并补充 users 表的 AI 模型私有化配置字段:
 * - ai_base_url: VARCHAR(512)
 * - ai_model_name: VARCHAR(128)
 * - ai_api_key: TEXT (AES 加密存储)
 */
export declare function ensureUserAiConfigColumns(): Promise<StandardResult<boolean>>;
//# sourceMappingURL=ensureAiTables.d.ts.map