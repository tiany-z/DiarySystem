import { StandardResult } from "../flow/result.js";
/**
 * 将 AST 配置预编译为具备二段式查询、高性能内存缓存、行锁并发控制与 Saga 补偿机制的执行函数
 */
export declare function compileAstRunFunction(astConfig: any): (params: any, ctx?: any) => Promise<StandardResult<any>>;
//# sourceMappingURL=astRunner.d.ts.map