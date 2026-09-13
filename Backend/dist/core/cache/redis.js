import { Redis } from "ioredis";
import { returnError, returnSuccess, tryCatchErrorToString } from "../flow/result.js";
let redisClient = null;
export function initRedisClient(options) {
    try {
        if (redisClient) {
            return returnSuccess(redisClient);
        }
        const host = process.env.REDIS_HOST || "localhost";
        const port = parseInt(process.env.REDIS_PORT || "6379", 10);
        const password = process.env.REDIS_PASSWORD || undefined;
        redisClient = new Redis({
            host,
            port,
            password,
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            retryStrategy: (times) => (times > 2 ? null : Math.min(times * 200, 1000)),
            ...options,
        });
        redisClient.on("error", (err) => {
            // 若处于连接建立阶段，由调用方捕获处理
        });
        return returnSuccess(redisClient);
    }
    catch (error) {
        return returnError(`Init Redis Client failed: ${tryCatchErrorToString(error)}`);
    }
}
export function getRedisClient() {
    return redisClient;
}
export function normalizeTableName(tableName) {
    if (!tableName)
        return "";
    let clean = tableName.replace(/[`"']/g, "");
    if (clean.includes("."))
        clean = clean.split(".").pop();
    return clean.trim().toLowerCase();
}
export async function getKV(tableName, id) {
    try {
        if (!redisClient) {
            return returnError("Redis客户端未初始化");
        }
        const key = `${normalizeTableName(tableName)}:${id}`;
        const raw = await redisClient.get(key);
        if (!raw) {
            return returnSuccess(null);
        }
        const parsed = JSON.parse(raw);
        return returnSuccess(parsed);
    }
    catch (error) {
        return returnError(`Get Redis KV failed: ${tryCatchErrorToString(error)}`);
    }
}
export async function mgetKV(tableName, ids) {
    try {
        if (!redisClient) {
            return returnError("Redis客户端未初始化");
        }
        if (ids.length === 0) {
            return returnSuccess({});
        }
        const keys = ids.map((id) => `${normalizeTableName(tableName)}:${id}`);
        const results = await redisClient.mget(...keys);
        const resultMap = {};
        ids.forEach((id, index) => {
            const raw = results[index];
            if (raw) {
                try {
                    resultMap[id] = JSON.parse(raw);
                }
                catch { }
            }
        });
        return returnSuccess(resultMap);
    }
    catch (error) {
        return returnError(`MGet Redis KV failed: ${tryCatchErrorToString(error)}`);
    }
}
export async function setKV(tableName, id, value, ttlSeconds = 86400) {
    try {
        if (!redisClient) {
            return returnError("Redis客户端未初始化");
        }
        const key = `${normalizeTableName(tableName)}:${id}`;
        const serialized = JSON.stringify(value);
        await redisClient.set(key, serialized, "EX", ttlSeconds);
        return returnSuccess(true);
    }
    catch (error) {
        return returnError(`Set Redis KV failed: ${tryCatchErrorToString(error)}`);
    }
}
export async function delKV(tableName, id) {
    try {
        if (!redisClient) {
            return returnError("Redis客户端未初始化");
        }
        const key = `${normalizeTableName(tableName)}:${id}`;
        await redisClient.del(key);
        return returnSuccess(true);
    }
    catch (error) {
        return returnError(`Del Redis KV failed: ${tryCatchErrorToString(error)}`);
    }
}
let subClient = null;
export function getRedisSubClient() {
    if (subClient) {
        return subClient;
    }
    if (!redisClient) {
        return null;
    }
    subClient = redisClient.duplicate();
    subClient.on("error", (err) => {
        console.error("[RedisSubClient Error]", err);
    });
    return subClient;
}
export async function setLockKV(key, payloadJson, ttlMs) {
    try {
        if (!redisClient) {
            return returnError("Redis客户端未初始化");
        }
        const res = await redisClient.set(key, payloadJson, "PX", ttlMs, "NX");
        return returnSuccess(res === "OK");
    }
    catch (error) {
        return returnError(`Set Lock KV failed: ${tryCatchErrorToString(error)}`);
    }
}
export async function releaseLockLua(key, ownerRequestId) {
    try {
        if (!redisClient) {
            return returnError("Redis客户端未初始化");
        }
        const luaScript = `
      local val = redis.call('get', KEYS[1])
      if val then
          local ok, data = pcall(cjson.decode, val)
          if ok and data and data.ownerRequestId == ARGV[1] then
              local lockType = data.lockType or 'UPDATE'
              redis.call('del', KEYS[1])
              return lockType
          end
      end
      return nil
    `;
        const res = (await redisClient.eval(luaScript, 1, key, ownerRequestId));
        return returnSuccess(res);
    }
    catch (error) {
        return returnError(`Release Lock Lua failed: ${tryCatchErrorToString(error)}`);
    }
}
export async function publishUnlockEvent(channel, message) {
    try {
        if (!redisClient) {
            return returnError("Redis客户端未初始化");
        }
        const res = await redisClient.publish(channel, message);
        return returnSuccess(res);
    }
    catch (error) {
        return returnError(`Publish Unlock Event failed: ${tryCatchErrorToString(error)}`);
    }
}
export async function closeRedisClient() {
    try {
        if (subClient) {
            await subClient.quit().catch(() => { });
            subClient = null;
        }
        if (redisClient) {
            await redisClient.quit();
            redisClient = null;
        }
        return returnSuccess(true);
    }
    catch (error) {
        return returnError(`Close Redis Client failed: ${tryCatchErrorToString(error)}`);
    }
}
//# sourceMappingURL=redis.js.map