import { StandardResult } from "../../flow/result.js";
import type { InsertBuildResult, InsertCompose } from "../type.js";
/**
 * 适配 MySQL 的 INSERT 语句生成器：
 * 1. 使用标准 ? 占位符；
 * 2. 移除 PostgreSQL 专用的 RETURNING id 子句；
 * 3. 生成基于 id = ? 的撤销删除闭包。
 */
export declare function insert({ columns, table, idType }: InsertCompose): StandardResult<InsertBuildResult>;
//# sourceMappingURL=insertBuilder.d.ts.map