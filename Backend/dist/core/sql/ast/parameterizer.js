import { returnError, returnSuccess, tryCatchErrorToString } from "../../flow/result.js";
/**
 * 将带有 -!!value!!- 模板占位符的原始 SQL 转换为 MySQL 标准 ? 预编译参数化 SQL
 */
export function parameterizeSql(rawSql, values = []) {
    try {
        let paramIndex = 1;
        const params = [];
        const parameterizedSql = rawSql.replace(/\(-!!value!!-\)|-!!value!!-/g, (match) => {
            const currentVal = values.length >= paramIndex ? values[paramIndex - 1] : undefined;
            paramIndex++;
            const isParenthesized = match.startsWith("(");
            if (Array.isArray(currentVal)) {
                if (currentVal.length === 0) {
                    params.push(null);
                    return "(?)";
                }
                params.push(...currentVal);
                return `(${currentVal.map(() => "?").join(", ")})`;
            }
            params.push(currentVal);
            return isParenthesized ? "(?)" : "?";
        });
        return returnSuccess({
            parameterizedSql,
            params,
        });
    }
    catch (error) {
        return returnError(tryCatchErrorToString(error));
    }
}
//# sourceMappingURL=parameterizer.js.map