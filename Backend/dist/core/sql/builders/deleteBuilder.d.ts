import { StandardResult } from "../../flow/result.js";
import type { DeleteBuildResult, DeleteCompose } from "../type.js";
/**
 * 适配 MySQL 的 DELETE 语句生成器：
 * 1. 使用标准 ? 占位符；
 * 2. 导出无 FOR UPDATE 的行快照获取 SQL；
 * 3. 生成基于旧行快照插回数据的撤销闭包。
 */
export declare function remove({ table, targetId }: DeleteCompose): StandardResult<DeleteBuildResult>;
//# sourceMappingURL=deleteBuilder.d.ts.map