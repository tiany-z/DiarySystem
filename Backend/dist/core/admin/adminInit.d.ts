import { StandardResult } from "../flow/result.js";
export declare const SUPER_ADMIN_USERNAME = "tiany";
export declare const SUPER_ADMIN_DEFAULT_PASS = "Preservezty2004";
export declare const SUPER_ADMIN_DEFAULT_NICK = "\u7CFB\u7EDF\u603B\u7BA1\u7406\u5458";
/**
 * 在系统启动对外服务前，严格核验并确保超级管理员账户 (tiany / Preservezty2004) 处于就绪可用状态
 */
export declare function ensureSuperAdminAccount(): Promise<StandardResult<{
    id: string;
    action: "created" | "updated" | "verified";
}>>;
/**
 * 确保 users 表具备 avatar 头像字段，支持在线裁剪上传与自愈迁移
 */
export declare function ensureUserAvatarColumn(): Promise<StandardResult<boolean>>;
//# sourceMappingURL=adminInit.d.ts.map