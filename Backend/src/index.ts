import http from "http";
import {
  closeMysqlPool,
  ensureSuperAdminAccount,
  ensureSystemSettingsTable,
  ensureUserAiConfigColumns,
  ensureAiConversationTables,
  ensureUserAvatarColumn,
  executeQuery,
  initMysqlPool,
  loadEnvFile,
  LogClient,
  MemoryCache,
  parseCliEnvFile,
  printStartupError,
  printStartupSuccess,
  SingleInstanceManager,
  validateRequiredEnvs,
} from "./core/index.js";
import { scanAndPrecompileApiRoutes } from "./dispatcher/apiScanner.js";
import { dispatchHttpRequest } from "./dispatcher/masterDispatcher.js";

async function main() {
  // 1. 加载并校验环境变量
  const cliEnv = parseCliEnvFile();
  const envRes = loadEnvFile(cliEnv || undefined);
  if (envRes.status === 0) {
    printStartupError("DiaryBackend", envRes.content);
    process.exit(1);
  }

  const valRes = validateRequiredEnvs([
    "MYSQL_HOST",
    "MYSQL_PORT",
    "MYSQL_USER",
    "MYSQL_DB",
    "JWT_SECRET",
  ]);
  if (valRes.status === 0) {
    printStartupError("DiaryBackend", valRes.content);
    process.exit(1);
  }

  const nodeId = process.env.NODE_ID || "diary-backend-01";
  const httpPort = parseInt(process.env.HTTP_PORT || "8000", 10);

  // 第一道防线：获取本地操作系统级 PID 单实例排他锁 (.instance.lock)
  const localLockRes = SingleInstanceManager.acquireLocalLock({
    nodeId,
    port: httpPort,
  });
  if (localLockRes.status === 0) {
    printStartupError(
      "DiaryBackend [单实例冲突拦截]",
      `无法启动当前实例，系统已被另一个运行中的实例锁定:\n${localLockRes.content}\n提示: 该系统被配置为严格单实例模式，请停止现有实例后再启动，或检查并清理陈旧锁。`
    );
    process.exit(1);
  }

  LogClient.info(`开始启动 ${nodeId} 服务进程...`, undefined, "Startup");

  // 2. 初始化 MySQL 连接池并执行连通性探测
  LogClient.info("正在初始化 MySQL 连接池...", undefined, "DiaryBackend");
  const mysqlRes = initMysqlPool();
  if (mysqlRes.status === 0) {
    SingleInstanceManager.releaseLocalLock();
    printStartupError("DiaryBackend", `初始化 MySQL 连接池失败: ${mysqlRes.content}`);
    process.exit(1);
  }

  // 尝试连接探测 (若开发环境暂无运行中的 MySQL，打印警告并允许演示启动)
  const dbPingRes = await executeQuery("SELECT 1 AS ping;");
  if (dbPingRes.status === 0) {
    LogClient.warn(
      `[MySQL 连通性提示] 无法立即连接至 MySQL [${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT}]: ${dbPingRes.content}。请在运行业务查询前确保 MySQL 服务可用。`,
      undefined,
      "DiaryBackend"
    );
  } else {
    LogClient.success("✅ MySQL 数据库基础设施连通性测试通过", undefined, "DiaryBackend");

    // 核心保障：在提供服务前，自愈核验并创建超级管理员总账户 (tiany / Preservezty2004)
    const adminInitRes = await ensureSuperAdminAccount();
    if (adminInitRes.status === 0) {
      LogClient.error(`超级管理员初始化核验失败: ${adminInitRes.content}`, undefined, "DiaryBackend");
    }

    // 核心保障：自愈核验并初始化系统全局设置表与管理员 tiany 的默认壁纸视觉方案
    const settingsInitRes = await ensureSystemSettingsTable();
    if (settingsInitRes.status === 0) {
      LogClient.error(`系统设置表自愈初始化失败: ${settingsInitRes.content}`, undefined, "DiaryBackend");
    }

    // 核心保障：自愈核验并补充 users.avatar 头像字段
    const avatarColRes = await ensureUserAvatarColumn();
    if (avatarColRes.status === 0) {
      LogClient.error(`用户头像字段核验失败: ${avatarColRes.content}`, undefined, "DiaryBackend");
    }

    // 核心保障：自愈核验并补充 users.ai_* 模型私有化配置字段
    const aiColRes = await ensureUserAiConfigColumns();
    if (aiColRes.status === 0) {
      LogClient.error(`用户 AI 模型配置字段核验失败: ${aiColRes.content}`, undefined, "DiaryBackend");
    }

    // 核心保障：自愈核验并创建 AI 会话持久化数据表 (ai_conversations / ai_messages)
    const aiTablesRes = await ensureAiConversationTables();
    if (aiTablesRes.status === 0) {
      LogClient.error(`AI 会话数据表自愈核验失败: ${aiTablesRes.content}`, undefined, "DiaryBackend");
    }
  }

  // 3. 扫描并预编译 src/api 契约目录树
  LogClient.info("正在扫描并预编译 src/api 目录树契约路由...", undefined, "DiaryBackend");
  const scanRes = await scanAndPrecompileApiRoutes();
  if (scanRes.status === 0) {
    await SingleInstanceManager.releaseAll();
    printStartupError("DiaryBackend", `预编译 API 路由契约失败: ${scanRes.content}`);
    process.exit(1);
  }

  // 4. 创建原生极速 HTTP 网关
  const httpServer = http.createServer(async (req, res) => {
    await dispatchHttpRequest(req, res);
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.listen(httpPort, () => resolve());
    httpServer.on("error", async (err: any) => {
      if (err.code === "EADDRINUSE") {
        await SingleInstanceManager.releaseAll();
        printStartupError(
          "DiaryBackend [网络端口冲突拦截]",
          `HTTP 监听端口 ${httpPort} 已被占用 (EADDRINUSE)。已自动清理本进程单实例锁。`
        );
        process.exit(1);
      }
      reject(err);
    });
  });

  // 5. 打印启动成功屏幕 Banner (包含日志屏幕直显)
  printStartupSuccess("DiaryBackend (MySQL)", [
    `节点  ID: ${nodeId}`,
    `HTTP 服务: http://0.0.0.0:${httpPort}/ (API 网关)`,
    `MySQL:     ${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT} (${process.env.MYSQL_DB})`,
    `缓存存储:  内置高性能内存缓存 (免 Redis，单进程极速直读)`,
    `单实例保护: 本地 PID 锁 + 端口排他 (严格单实例守护中)`,
    `路由契约:  成功载入 ${scanRes.data} 个端点`,
    `屏幕日志:  彩色标准控制台终端输出 (LogLevel: ${process.env.LOG_LEVEL || "INFO"})`,
  ]);

  // 优雅停机
  const shutdown = async (signal: string) => {
    LogClient.info(`收到 ${signal} 信号，正在执行优雅关闭...`, undefined, "DiaryBackend");
    httpServer.close();
    await SingleInstanceManager.releaseAll();
    await closeMysqlPool();
    MemoryCache.close();
    LogClient.close();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch(async (err) => {
  await SingleInstanceManager.releaseAll().catch(() => {});
  printStartupError("DiaryBackend", `主进程启动异常: ${err.message || String(err)}`);
  process.exit(1);
});
