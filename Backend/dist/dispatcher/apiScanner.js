import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { compileAstRunFunction, LogClient, returnError, returnSuccess, tryCatchErrorToString, } from "../core/index.js";
const registry = new Map();
export async function scanAndPrecompileApiRoutes(apiDir) {
    try {
        const targetDir = apiDir || path.resolve(process.cwd(), "src", "api");
        if (!fs.existsSync(targetDir)) {
            return returnSuccess(0);
        }
        const files = getIndexFiles(targetDir);
        let count = 0;
        for (const filePath of files) {
            const fileUrl = pathToFileURL(filePath).href;
            const mod = await import(fileUrl);
            const endpoint = mod.api || mod.default;
            if (endpoint && typeof endpoint.handler === "function") {
                // 计算路由路径 (如 /api/auth/login)
                const relative = path.relative(targetDir, path.dirname(filePath)).replace(/\\/g, "/");
                const routePath = relative ? `/api/${relative}` : "/api";
                endpoint.routePath = routePath;
                // 预编译 SQL AST 并赋给 endpoint.run
                if (endpoint.astConfig) {
                    endpoint.run = compileAstRunFunction(endpoint.astConfig);
                }
                registry.set(routePath, endpoint);
                count++;
            }
        }
        LogClient.info(`成功扫描并装载 ${count} 个 API 路由契约端点`, undefined, "ApiScanner");
        return returnSuccess(count);
    }
    catch (error) {
        return returnError(`扫描并预编译 API 路由失败: ${tryCatchErrorToString(error)}`);
    }
}
export function getApiRoute(routePath) {
    return registry.get(routePath) || null;
}
export function getAllRoutes() {
    return registry;
}
function getIndexFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getIndexFiles(fullPath));
        }
        else if (file === "index.ts" || file === "index.js") {
            results.push(fullPath);
        }
    }
    return results;
}
//# sourceMappingURL=apiScanner.js.map