import { executeQuery } from "../db/mysql.js";
import { hashPassword, verifyPassword } from "../crypto/password.js";
import { genUUID } from "../crypto/uuid.js";
import { delKV } from "../cache/memoryCache.js";
import { LogClient } from "../log/logger.js";
import { returnError, returnSuccess, StandardResult } from "../flow/result.js";

export const SUPER_ADMIN_USERNAME = "tiany";
export const SUPER_ADMIN_DEFAULT_PASS = "Preservezty2004";
export const SUPER_ADMIN_DEFAULT_NICK = "系统总管理员";

/**
 * 在系统启动对外服务前，严格核验并确保超级管理员账户 (tiany / Preservezty2004) 处于就绪可用状态
 */
export async function ensureSuperAdminAccount(): Promise<StandardResult<{ id: string; action: "created" | "updated" | "verified" }>> {
  try {
    const checkSql = "SELECT id, username, password_hash, nickname FROM users WHERE username = ? LIMIT 1";
    const checkRes = await executeQuery<any>(checkSql, [SUPER_ADMIN_USERNAME]);
    if (checkRes.status === 0) {
      return returnError(`检查超级管理员账户失败: ${checkRes.content}`);
    }

    const existing = checkRes.data?.[0];

    if (!existing) {
      // 账户不存在：立刻创建
      const newId = genUUID();
      const hashRes = await hashPassword(SUPER_ADMIN_DEFAULT_PASS);
      if (hashRes.status === 0) return returnError(hashRes.content);

      const insertSql = "INSERT INTO users (id, username, password_hash, nickname) VALUES (?, ?, ?, ?)";
      const insertRes = await executeQuery(insertSql, [
        newId,
        SUPER_ADMIN_USERNAME,
        hashRes.data,
        SUPER_ADMIN_DEFAULT_NICK,
      ]);

      if (insertRes.status === 0) {
        return returnError(`创建超级管理员账户失败: ${insertRes.content}`);
      }

      LogClient.success(
        `👑 超级管理员账户 [${SUPER_ADMIN_USERNAME}] 缺失，已成功执行启动自动初始化创建 (ID: ${newId})`,
        undefined,
        "AdminInit"
      );
      return returnSuccess({ id: newId, action: "created" });
    }

    // 账户已存在：核验密码哈希是否匹配 Preservezty2004
    const verifyRes = await verifyPassword(SUPER_ADMIN_DEFAULT_PASS, existing.password_hash);
    if (verifyRes.status === 1 && verifyRes.data) {
      LogClient.info(
        `👑 超级管理员账户 [${SUPER_ADMIN_USERNAME}] 状态健康，密码凭据校验通过`,
        undefined,
        "AdminInit"
      );
      return returnSuccess({ id: existing.id, action: "verified" });
    }

    // 密码哈希不匹配：立即无损校准为目标密码 Preservezty2004
    const newHashRes = await hashPassword(SUPER_ADMIN_DEFAULT_PASS);
    if (newHashRes.status === 0) return returnError(newHashRes.content);

    const updateSql = "UPDATE users SET password_hash = ? WHERE id = ?";
    const updateRes = await executeQuery(updateSql, [newHashRes.data, existing.id]);
    if (updateRes.status === 0) {
      return returnError(`校准超级管理员密码失败: ${updateRes.content}`);
    }

    // 驱逐旧内存缓存
    await delKV("users", existing.id);

    LogClient.warn(
      `👑 检测到超级管理员账户 [${SUPER_ADMIN_USERNAME}] 密码与指定凭据不一致，已自动无损重置校准为指定密码并刷新缓存`,
      undefined,
      "AdminInit"
    );
    return returnSuccess({ id: existing.id, action: "updated" });
  } catch (error) {
    return returnError(`初始化超级管理员账户异常: ${String(error)}`);
  }
}
