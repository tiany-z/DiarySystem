import { describe, expect, it } from "vitest";
import {
  buildDelete,
  buildInsert,
  buildSelect,
  buildUpdate,
  declare,
  insert,
  parameterizeSql,
  parseColumns,
  parseLimit,
  parseOrderBy,
  parseWhere,
  remove,
  RowLockManager,
  MemoryCache,
  select,
  update,
  validateSQLFragment,
  WsResilienceQueue,
  GlobalStore,
  buildHeartbeatPayload,
  parseHeartbeatPayload,
  parseWsMessage,
  stringifyWsMessage,
  countTokensFallback,
  truncateByTokensFallback,
} from "../core/index.js";

function ok<T>(result: { status: number; data?: T; content?: string }): asserts result is { status: 1; data: T } {
  if (result.status !== 1) {
    throw new Error(`Expected success but got status=${result.status}: ${result.content}`);
  }
}

describe("DiarySystem/Backend - MySQL SQL AST & Builders", () => {
  describe("parseColumns (MySQL 单表硬限制与表名解析)", () => {
    it("应正确解析单个表的列，并自动剥离 PG 的 public Schema", () => {
      const table = declare.table("public", "users");
      const col1 = declare.column(table, "id");
      const col2 = declare.column(table, "name");
      const res = parseColumns(col1, col2);

      ok(res);
      expect(res.data.columnsSQL).toBe("users.id, users.name");
      expect(res.data.tablesSQL).toBe("users");
    });

    it("直接声明表名时应正确解析", () => {
      const table = declare.table("diaries");
      const col1 = declare.column(table, "id");
      const col2 = declare.column(table, "title");
      const res = parseColumns(col1, col2);

      ok(res);
      expect(res.data.columnsSQL).toBe("diaries.id, diaries.title");
      expect(res.data.tablesSQL).toBe("diaries");
    });

    it("声明表别名 declare.table('users', 'u') 时应生成表别名与列前缀", () => {
      const table = declare.table("users", "u");
      const col1 = declare.column(table, "id");
      const col2 = declare.column(table, "nickname");
      const res = parseColumns(col1, col2);

      ok(res);
      expect(res.data.columnsSQL).toBe("u.id, u.nickname");
      expect(res.data.tablesSQL).toBe("users u");
    });

    it("跨多个表查询时应抛出单表限制保护错误", () => {
      const tableA = declare.table("users");
      const tableB = declare.table("diaries");
      const col1 = declare.column(tableA, "id");
      const col2 = declare.column(tableB, "id");
      const res = parseColumns(col1, col2);

      expect(res.status).toBe(0);
      expect(res.content).toContain("单表");
    });
  });

  describe("parameterizeSql (MySQL ? 占位符转换与数组 IN 展开)", () => {
    it("应将 -!!value!!- 转换为 MySQL 的 ? 问号占位符并按序绑定参数", () => {
      const rawSql = "SELECT * FROM users WHERE age >= -!!value!!- AND name = -!!value!!-";
      const values = [18, "Alice"];
      const res = parameterizeSql(rawSql, values);

      ok(res);
      expect(res.data.parameterizedSql).toBe("SELECT * FROM users WHERE age >= ? AND name = ?");
      expect(res.data.params).toEqual([18, "Alice"]);
    });

    it("应将数组类型参数在 IN 子句中展开为多问号 (?, ?, ...)", () => {
      const rawSql = "SELECT * FROM diaries WHERE id IN -!!value!!- AND status = -!!value!!-";
      const values = [["id-1", "id-2", "id-3"], "published"];
      const res = parameterizeSql(rawSql, values);

      ok(res);
      expect(res.data.parameterizedSql).toBe("SELECT * FROM diaries WHERE id IN (?, ?, ?) AND status = ?");
      expect(res.data.params).toEqual(["id-1", "id-2", "id-3", "published"]);
    });

    it("空数组应转换为安全的单一占位符 (?) 与 null 参数", () => {
      const rawSql = "SELECT * FROM diaries WHERE id IN -!!value!!-";
      const values = [[]];
      const res = parameterizeSql(rawSql, values);

      ok(res);
      expect(res.data.parameterizedSql).toBe("SELECT * FROM diaries WHERE id IN (?)");
      expect(res.data.params).toEqual([null]);
    });

    it("带括号占位符 (-!!value!!-) 应被正确消除双重括号并生成标准 IN (?, ?)", () => {
      const rawSql = "SELECT * FROM diaries WHERE id IN (-!!value!!-)";
      const values = [["id-1", "id-2"]];
      const res = parameterizeSql(rawSql, values);

      ok(res);
      expect(res.data.parameterizedSql).toBe("SELECT * FROM diaries WHERE id IN (?, ?)");
      expect(res.data.params).toEqual(["id-1", "id-2"]);
    });
  });

  describe("parseWhere (MySQL 专有语法映射与空值谓词处理)", () => {
    it("IS NULL 与 IS NOT NULL 谓词应直接输出，不追加多余占位符且不需要输入值", () => {
      const table = declare.table("diaries");
      const colDeletedAt = declare.column(table, "deleted_at");
      const whereNull = declare.where.compare(colDeletedAt, "IS NULL");
      const res = parseWhere(whereNull);

      ok(res);
      expect(res.data.whereSQL).toBe("diaries.deleted_at IS NULL");
      expect(res.data.needInputValues).toHaveLength(0);

      const whereNotNull = declare.where.compare(colDeletedAt, "IS NOT NULL");
      const resNot = parseWhere(whereNotNull);
      ok(resNot);
      expect(resNot.data.whereSQL).toBe("diaries.deleted_at IS NOT NULL");
      expect(resNot.data.needInputValues).toHaveLength(0);
    });

    it("Postgres 的 SIMILAR TO 操作符应在 MySQL 中自动转译为 REGEXP", () => {
      const table = declare.table("diaries");
      const colTitle = declare.column(table, "title");
      const whereCond = declare.where.compare(colTitle, "SIMILAR TO");
      const res = parseWhere(whereCond);

      ok(res);
      expect(res.data.whereSQL).toBe("diaries.title REGEXP -!!value!!-");
    });
  });

  describe("validateSQLFragment (防注入拦截与 MySQL 专用函数防护)", () => {
    it("应接受合法的列名与常规字段", () => {
      const res = validateSQLFragment("user_id");
      expect(res.status).toBe(1);
    });

    it("应拦截 DROP/DELETE/INSERT 等高危关键字", () => {
      expect(validateSQLFragment("DROP TABLE users").status).toBe(0);
      expect(validateSQLFragment("DELETE FROM users").status).toBe(0);
      expect(validateSQLFragment("INSERT INTO users").status).toBe(0);
    });

    it("应拦截 -- 注释标记和多语句分号", () => {
      expect(validateSQLFragment("id; DROP TABLE users").status).toBe(0);
      expect(validateSQLFragment("name -- comment").status).toBe(0);
    });

    it("应拦截恒真注入 (OR 1=1) 与 MySQL 延时盲注函数 (SLEEP/BENCHMARK)", () => {
      expect(validateSQLFragment("OR 1=1").status).toBe(0);
      expect(validateSQLFragment("SLEEP(5)").status).toBe(0);
      expect(validateSQLFragment("BENCHMARK(1000000, MD5('test'))").status).toBe(0);
    });
  });

  describe("selectBuilder (二段式 SELECT 导出)", () => {
    it("应同时导出包含完整列的 sql 与仅含主键的 sqlOnlyId", () => {
      const table = declare.table("diaries");
      const colId = declare.column(table, "id");
      const colTitle = declare.column(table, "title");
      const colMood = declare.column(table, "mood");
      const whereCond = declare.where.compare(colMood, "=", declare.customValue("-!!value!!-"));

      const res = select({
        columns: [colId, colTitle],
        where: [whereCond],
        orderBy: [declare.orderBy.DESC(colId)],
        limit: declare.limit.indexSize(0, 10),
      });

      ok(res);
      expect(res.data.tableName).toBe("diaries");
      expect(res.data.sql).toContain("SELECT diaries.id, diaries.title");
      expect(res.data.sqlOnlyId).toContain("SELECT diaries.id");
      expect(res.data.sql).toContain("WHERE diaries.mood = -!!value!!-");
      expect(res.data.sql).toContain("LIMIT 10");
    });
  });

  describe("CUD 编译器与 Undo 撤销闭包 (MySQL 适配)", () => {
    it("INSERT 应生成无 RETURNING 的 MySQL 语句、自动补齐 UUID 主键以及使用 ? 占位符的 DELETE 撤销闭包", () => {
      const table = declare.table("diaries");
      const colTitle = declare.column(table, "title");
      const colContent = declare.column(table, "content");

      const res = insert({ columns: [colTitle, colContent] });
      ok(res);
      expect(res.data.autoInjectedId).toBe(true);
      expect(res.data.sql).toContain("INSERT INTO diaries (id, title, content)");
      expect(res.data.sql).toContain("VALUES (?, ?, ?)");
      expect(res.data.sql).not.toContain("RETURNING");

      const undo = res.data.createUndoFn("diary-uuid-123");
      expect(undo.undoSql).toBe("DELETE FROM diaries WHERE id = ?");
      expect(undo.undoParams).toEqual(["diary-uuid-123"]);

      // 显式声明自增主键 (auto_increment) 时，不应自动注入 id 列
      const autoRes = insert({ columns: [colTitle, colContent], idType: "auto_increment" });
      ok(autoRes);
      expect(autoRes.data.autoInjectedId).toBe(false);
      expect(autoRes.data.sql).toContain("INSERT INTO diaries (title, content)");
      expect(autoRes.data.sql).toContain("VALUES (?, ?)");
    });

    it("UPDATE 应只能指定 ID，导出无 FOR UPDATE 快照并使用 ? 生成旧值还原闭包", () => {
      const table = declare.table("diaries");
      const res = update({
        table,
        targetId: "diary-456",
        updateData: { title: "新日记", mood: "Happy" },
      });

      ok(res);
      expect(res.data.lockSql).not.toContain("FOR UPDATE");
      expect(res.data.lockSql).toBe("SELECT * FROM diaries WHERE id = ?");
      expect(res.data.updateSql).toBe("UPDATE diaries\nSET title = ?, mood = ?\nWHERE id = ?");
      expect(res.data.updateParams).toEqual(["新日记", "Happy", "diary-456"]);

      const undo = res.data.createUndoFn({ id: "diary-456", title: "旧日记", mood: "Sad" });
      expect(undo.undoSql).toBe("UPDATE diaries\nSET title = ?, mood = ?\nWHERE id = ?");
      expect(undo.undoParams).toEqual(["旧日记", "Sad", "diary-456"]);
    });

    it("DELETE 应只能指定 ID，导出无 FOR UPDATE 快照并使用 ? 生成原数据插回闭包", () => {
      const table = declare.table("diaries");
      const res = remove({ table, targetId: "diary-789" });

      ok(res);
      expect(res.data.lockSql).not.toContain("FOR UPDATE");
      expect(res.data.lockSql).toBe("SELECT * FROM diaries WHERE id = ?");
      expect(res.data.deleteSql).toBe("DELETE FROM diaries\nWHERE id = ?");
      expect(res.data.deleteParams).toEqual(["diary-789"]);

      const undo = res.data.createUndoFn({ id: "diary-789", title: "删除的日记", mood: "Sunny" });
      expect(undo.undoSql).toContain("INSERT INTO diaries (id, title, mood)");
      expect(undo.undoSql).toContain("VALUES (?, ?, ?)");
      expect(undo.undoParams).toEqual(["diary-789", "删除的日记", "Sunny"]);
    });
  });

  describe("RowLockManager & MemoryCache (单进程内存缓存与行锁模式)", () => {
    it("同一请求应支持重入加锁，不同请求应拦截冲突，释放后可重新加锁", async () => {
      RowLockManager.clearAllLocks();

      // 1. 请求 A 加锁成功
      const acqA1 = await RowLockManager.acquireRowLock("diaries", 101, "UPDATE", "req-A");
      expect(acqA1.status).toBe(1);

      // 2. 请求 A 重入加锁应成功
      const acqA2 = await RowLockManager.acquireRowLock("diaries", 101, "UPDATE", "req-A");
      expect(acqA2.status).toBe(1);

      // 3. 请求 B 抢占同一行锁应被阻断
      const acqB = await RowLockManager.acquireRowLock("diaries", 101, "UPDATE", "req-B");
      expect(acqB.status).toBe(0);
      expect(acqB.content).toContain("行锁已被请求 [req-A] 占用");

      // 4. 其它请求释放锁应失败
      const relFake = await RowLockManager.releaseRowLock("diaries", 101, "req-B", false);
      expect(relFake.status).toBe(0);

      // 5. 请求 A 释放锁成功
      const relA = await RowLockManager.releaseRowLock("diaries", 101, "req-A", true);
      expect(relA.status).toBe(1);

      // 6. 请求 B 现在可以成功加锁
      const acqB2 = await RowLockManager.acquireRowLock("diaries", 101, "UPDATE", "req-B");
      expect(acqB2.status).toBe(1);

      await RowLockManager.releaseRowLock("diaries", 101, "req-B", true);
    });

    it("MemoryCache 应支持单进程极速 setKV / getKV / mgetKV / delKV", async () => {
      await MemoryCache.clearAllCache();

      await MemoryCache.setKV("diaries", "d-1", { title: "内存日记1" });
      await MemoryCache.setKV("diaries", "d-2", { title: "内存日记2" });

      const item1 = await MemoryCache.getKV("diaries", "d-1");
      expect(item1.status).toBe(1);
      expect(item1.data).toEqual({ title: "内存日记1" });

      const mgetRes = await MemoryCache.mgetKV("diaries", ["d-1", "d-2", "d-999"]);
      expect(mgetRes.status).toBe(1);
      expect(mgetRes.data!["d-1"]).toEqual({ title: "内存日记1" });
      expect(mgetRes.data!["d-2"]).toEqual({ title: "内存日记2" });
      expect(mgetRes.data!["d-999"]).toBeUndefined();

      await MemoryCache.delKV("diaries", "d-1");
      const item1AfterDel = await MemoryCache.getKV("diaries", "d-1");
      expect(item1AfterDel.data).toBeNull();
    });
  });

  describe("WsResilienceQueue (WS 软断连缓冲队列)", () => {
    it("应支持软断连宽限期内的消息暂存与重连补发", async () => {
      const queue = new WsResilienceQueue(2);
      queue.startGracePeriod(() => {});

      const sendPromise = queue.enqueuePendingMessage<boolean>("msg-1", { text: "hello diary" });

      const sentMessages: any[] = [];
      await queue.flushQueue(async (data) => {
        sentMessages.push(data);
      });

      const result = await sendPromise;
      expect(result).toBe(true);
      expect(sentMessages).toEqual([{ text: "hello diary" }]);
    });
  });

  describe("GlobalStore (进程内全局存储)", () => {
    it("应正常支持 set, get, has, delete, clear 操作", () => {
      GlobalStore.set("foo", { bar: 123 });
      expect(GlobalStore.has("foo")).toBe(true);
      expect(GlobalStore.get("foo")).toEqual({ bar: 123 });

      GlobalStore.delete("foo");
      expect(GlobalStore.has("foo")).toBe(false);
      expect(GlobalStore.get("foo")).toBeUndefined();

      GlobalStore.set("k1", 1);
      GlobalStore.set("k2", 2);
      GlobalStore.clear();
      expect(GlobalStore.has("k1")).toBe(false);
      expect(GlobalStore.has("k2")).toBe(false);
    });
  });

  describe("Heartbeat & Protocol & Tokenizer 辅助组件", () => {
    it("Heartbeat 载荷生成与解析应格式正确", () => {
      const payload = buildHeartbeatPayload("node-1", "192.168.1.10", 8000, 5, 12, 102400);
      expect(payload.nodeId).toBe("node-1");
      expect(payload.port).toBe(8000);

      const parsed = parseHeartbeatPayload(JSON.stringify(payload));
      expect(parsed).not.toBeNull();
      expect(parsed?.nodeId).toBe("node-1");
    });

    it("WS 协议报文编解码应正常运行并校验 type 属性", () => {
      const packet = { type: "HEARTBEAT", payload: { ping: true } };
      const str = stringifyWsMessage(packet);
      const parsedRes = parseWsMessage(str);

      ok(parsedRes);
      expect(parsedRes.data.type).toBe("HEARTBEAT");
      expect(parsedRes.data.payload).toEqual({ ping: true });

      const invalidRes = parseWsMessage(JSON.stringify({ notype: 1 }));
      expect(invalidRes.status).toBe(0);
    });

    it("Tokenizer 回退计数与截断应正常估算中英文字符", () => {
      const text = "你好世界 Hello World";
      const count = countTokensFallback(text);
      expect(count).toBeGreaterThan(0);

      const truncated = truncateByTokensFallback(text, 2);
      expect(truncated.length).toBeLessThan(text.length);
    });
  });
});
