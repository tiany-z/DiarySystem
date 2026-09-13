import fs from "fs";
import path from "path";
import { returnError, returnSuccess } from "../flow/result.js";
export function parseCliEnvFile(args = process.argv) {
    for (const arg of args) {
        if (arg.startsWith("--env_file=")) {
            return arg.substring("--env_file=".length) || null;
        }
        else if (arg.startsWith("--env_path=")) {
            return arg.substring("--env_path=".length) || null;
        }
        else if (arg.startsWith("--env=")) {
            return arg.substring("--env=".length) || null;
        }
        else if (arg.startsWith("--config_file=")) {
            return arg.substring("--config_file=".length) || null;
        }
        else if (arg.startsWith("--config_env=")) {
            return arg.substring("--config_env=".length) || null;
        }
    }
    return null;
}
export function loadEnvFile(envPath) {
    try {
        const targetPath = envPath || parseCliEnvFile() || ".env";
        const absolutePath = path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath);
        if (!fs.existsSync(absolutePath)) {
            // 若指定的不是 .env 默认文件则报错，若默认 .env 不存在允许使用进程环境变量
            if (envPath || parseCliEnvFile()) {
                return returnError(`Env 配置文件不存在: ${absolutePath}`);
            }
            return returnSuccess({});
        }
        const content = fs.readFileSync(absolutePath, "utf-8");
        const envObj = {};
        for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#"))
                continue;
            const eqIndex = trimmed.indexOf("=");
            if (eqIndex > 0) {
                const key = trimmed.substring(0, eqIndex).trim();
                let value = trimmed.substring(eqIndex + 1).trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                envObj[key] = value;
                process.env[key] = value;
            }
        }
        return returnSuccess(envObj);
    }
    catch (error) {
        return returnError(`Failed to load env file: ${String(error)}`);
    }
}
export function validateRequiredEnvs(requiredKeys) {
    const missing = [];
    for (const key of requiredKeys) {
        if (!process.env[key]) {
            missing.push(key);
        }
    }
    if (missing.length > 0) {
        return returnError(`Missing required environment variables: ${missing.join(", ")}`);
    }
    return returnSuccess(true);
}
export function printStartupError(serviceName, reason) {
    console.error("\x1b[31m%s\x1b[0m", "=".repeat(60));
    console.error("\x1b[31m%s\x1b[0m", `❌ ${serviceName} 启动失败`);
    console.error("\x1b[31m%s\x1b[0m", "=".repeat(60));
    console.error(`原因: ${reason}`);
    console.error("\x1b[31m%s\x1b[0m", "=".repeat(60));
    console.error(`请检查启动参数、.env 配置文件或 DB/Redis 服务状态后重新启动 ${serviceName}\n`);
}
export function printStartupSuccess(serviceName, infoLines) {
    console.log("\x1b[32m%s\x1b[0m", "=".repeat(60));
    console.log("\x1b[1m\x1b[32m%s\x1b[0m", `🚀 ${serviceName} 启动成功！`);
    console.log("\x1b[32m%s\x1b[0m", "=".repeat(60));
    for (const line of infoLines) {
        console.log(line);
    }
    console.log("\x1b[32m%s\x1b[0m", "=".repeat(60) + "\n");
}
//# sourceMappingURL=envLoader.js.map