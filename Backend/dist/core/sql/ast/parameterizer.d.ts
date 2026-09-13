import { StandardResult } from "../../flow/result.js";
export interface ParameterizeResult {
    parameterizedSql: string;
    params: any[];
}
/**
 * 将带有 -!!value!!- 模板占位符的原始 SQL 转换为 MySQL 标准 ? 预编译参数化 SQL
 */
export declare function parameterizeSql(rawSql: string, values?: any[]): StandardResult<ParameterizeResult>;
//# sourceMappingURL=parameterizer.d.ts.map