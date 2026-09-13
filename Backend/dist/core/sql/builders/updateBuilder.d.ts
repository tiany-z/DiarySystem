import { StandardResult } from "../../flow/result.js";
import type { UpdateBuildResult, UpdateCompose } from "../type.js";
/**
 * 适配 MySQL 的 UPDATE 语句生成器：
 * 1. 使用标准 ? 占位符；
 * 2. 导出无 FOR UPDATE 的行快照获取 SQL；
 * 3. 生成还原旧行快照的撤销闭包。
 */
export declare function update({ table, targetId, updateData }: UpdateCompose): StandardResult<UpdateBuildResult>;
//# sourceMappingURL=updateBuilder.d.ts.map