import { executeQuery } from "../db/mysql.js";
import { LogClient } from "../log/logger.js";
import { returnError, returnSuccess, tryCatchErrorToString, } from "../flow/result.js";
/**
 * 启动时自愈建表：AI 会话树表 (ai_conversations) 与消息历史明细表 (ai_messages)
 */
export async function ensureAiConversationTables() {
    try {
        // 1. 自愈建表 ai_conversations
        const createConvSql = `
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL DEFAULT '新对话',
        is_pinned TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否置顶',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL COMMENT '软删除标记',
        INDEX idx_user_list (user_id, deleted_at, is_pinned DESC, updated_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
        const resConv = await executeQuery(createConvSql);
        if (resConv.status === 0) {
            return returnError(`创建 ai_conversations 表失败: ${resConv.content}`);
        }
        // 2. 自愈建表 ai_messages
        const createMsgSql = `
      CREATE TABLE IF NOT EXISTS ai_messages (
        id VARCHAR(64) PRIMARY KEY,
        conversation_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        role ENUM('user', 'assistant', 'system', 'tool') NOT NULL,
        content LONGTEXT NOT NULL COMMENT '正文内容',
        thought LONGTEXT NULL COMMENT '思维链过程 (<think>) 内容',
        tool_calls JSON NULL COMMENT '模型调用的工具及参数记录',
        tool_call_id VARCHAR(128) NULL COMMENT '工具回调映射 ID',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_conv_timeline (conversation_id, created_at ASC),
        INDEX idx_user_audit (user_id, created_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
        const resMsg = await executeQuery(createMsgSql);
        if (resMsg.status === 0) {
            return returnError(`创建 ai_messages 表失败: ${resMsg.content}`);
        }
        LogClient.success("💬 AI 会话与消息持久化表 [ai_conversations, ai_messages] 状态就绪", undefined, "AiInit");
        return returnSuccess(true);
    }
    catch (err) {
        return returnError(`自愈建表异常: ${tryCatchErrorToString(err)}`);
    }
}
//# sourceMappingURL=ensureAiTables.js.map