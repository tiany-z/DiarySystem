import { executeQuery, genUUID, returnError, returnSuccess, tryCatchErrorToString, } from "../../../core/index.js";
export const api = {
    routePath: "/api/ai/conversations",
    authRequired: true,
    handler: async (reqCtx, ctx) => {
        try {
            const currentUserId = reqCtx?.user?.userId ||
                ctx?.userPayload?.userId ||
                ctx?.user?.userId ||
                ctx?.userPayload?.id;
            if (!currentUserId) {
                return returnError("未鉴权请求或用户登录态失效");
            }
            const method = (reqCtx.req.method || "GET").toUpperCase();
            // 1. GET: 获取会话列表 (置顶在前，最新更新在前)
            if (method === "GET") {
                const keyword = (reqCtx.query?.keyword || "").trim();
                let sql = `
          SELECT id, title, is_pinned, created_at, updated_at
          FROM ai_conversations
          WHERE user_id = ? AND deleted_at IS NULL
        `;
                const params = [currentUserId];
                if (keyword) {
                    sql += " AND title LIKE ?";
                    params.push(`%${keyword}%`);
                }
                sql += " ORDER BY is_pinned DESC, updated_at DESC LIMIT 100;";
                const queryRes = await executeQuery(sql, params);
                if (queryRes.status === 0 || !queryRes.data) {
                    return returnError(`查询会话列表失败: ${queryRes.content}`);
                }
                const list = queryRes.data.map((row) => ({
                    id: row.id,
                    title: row.title,
                    isPinned: row.is_pinned === 1,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                }));
                return returnSuccess(list);
            }
            // 2. POST: 新建空白会话
            if (method === "POST") {
                const body = reqCtx.body || {};
                const title = (body.title || "新对话").trim().slice(0, 255);
                const convId = genUUID();
                const insertSql = `
          INSERT INTO ai_conversations (id, user_id, title)
          VALUES (?, ?, ?);
        `;
                const insertRes = await executeQuery(insertSql, [convId, currentUserId, title]);
                if (insertRes.status === 0) {
                    return returnError(`创建会话失败: ${insertRes.content}`);
                }
                return returnSuccess({
                    id: convId,
                    title,
                    isPinned: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }
            // 3. PUT: 编辑会话 (重命名或切换置顶)
            if (method === "PUT") {
                const body = reqCtx.body || {};
                const convId = (body.id || "").trim();
                if (!convId) {
                    return returnError("缺少必要参数 id");
                }
                // 校验归属权
                const checkRes = await executeQuery("SELECT id FROM ai_conversations WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1;", [convId, currentUserId]);
                if (checkRes.status === 0 || !checkRes.data || checkRes.data.length === 0) {
                    return returnError("会话不存在或无权操作");
                }
                const setClauses = [];
                const updateParams = [];
                if (body.title !== undefined) {
                    const cleanTitle = String(body.title).trim().slice(0, 255);
                    setClauses.push("title = ?");
                    updateParams.push(cleanTitle || "未命名对话");
                }
                if (body.isPinned !== undefined) {
                    const pinVal = body.isPinned === true || body.isPinned === 1 ? 1 : 0;
                    setClauses.push("is_pinned = ?");
                    updateParams.push(pinVal);
                }
                if (setClauses.length === 0) {
                    return returnSuccess({ message: "未提供需要修改的属性" });
                }
                updateParams.push(convId, currentUserId);
                const updateSql = `UPDATE ai_conversations SET ${setClauses.join(", ")} WHERE id = ? AND user_id = ?;`;
                const updateRes = await executeQuery(updateSql, updateParams);
                if (updateRes.status === 0) {
                    return returnError(`更新会话失败: ${updateRes.content}`);
                }
                return returnSuccess({ id: convId, message: "会话更新成功" });
            }
            // 4. DELETE: 软删除会话
            if (method === "DELETE") {
                const body = reqCtx.body || {};
                const convId = (body.id || reqCtx.query?.id || "").trim();
                if (!convId) {
                    return returnError("缺少必要参数 id");
                }
                const deleteSql = `
          UPDATE ai_conversations
          SET deleted_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ? AND deleted_at IS NULL;
        `;
                const deleteRes = await executeQuery(deleteSql, [convId, currentUserId]);
                if (deleteRes.status === 0) {
                    return returnError(`删除会话失败: ${deleteRes.content}`);
                }
                return returnSuccess({ id: convId, message: "会话已成功删除" });
            }
            return returnError(`不支持的请求方式: ${method}`);
        }
        catch (err) {
            return returnError(`处理会话接口异常: ${tryCatchErrorToString(err)}`);
        }
    },
};
//# sourceMappingURL=index.js.map