import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SingleInstanceManager } from "../core/lock/singleInstanceManager.js";
describe("DiarySystem/Backend - Single Instance Manager Unit Tests", () => {
    const testLockPath = path.resolve(process.cwd(), ".test-instance.lock");
    beforeEach(() => {
        if (fs.existsSync(testLockPath)) {
            try {
                fs.unlinkSync(testLockPath);
            }
            catch { }
        }
    });
    afterEach(() => {
        SingleInstanceManager.releaseLocalLock();
        if (fs.existsSync(testLockPath)) {
            try {
                fs.unlinkSync(testLockPath);
            }
            catch { }
        }
    });
    it("isProcessAlive 探测：当前进程应存活，不存在的 PID 应返回 false", () => {
        expect(SingleInstanceManager.isProcessAlive(process.pid)).toBe(true);
        expect(SingleInstanceManager.isProcessAlive(99999999)).toBe(false);
        expect(SingleInstanceManager.isProcessAlive(0)).toBe(false);
        expect(SingleInstanceManager.isProcessAlive(-1)).toBe(false);
    });
    it("成功获取本地排他锁并生成正确的元数据文件", () => {
        const res = SingleInstanceManager.acquireLocalLock({
            lockPath: testLockPath,
            nodeId: "test-node-01",
            port: 8888,
        });
        expect(res.status).toBe(1);
        expect(res.data).toBeDefined();
        expect(res.data?.pid).toBe(process.pid);
        expect(res.data?.nodeId).toBe("test-node-01");
        expect(res.data?.port).toBe(8888);
        expect(res.data?.hostname).toBeTruthy();
        expect(res.data?.startedAt).toBeTruthy();
        expect(fs.existsSync(testLockPath)).toBe(true);
        const content = JSON.parse(fs.readFileSync(testLockPath, "utf-8"));
        expect(content.pid).toBe(process.pid);
        expect(content.nodeId).toBe("test-node-01");
    });
    it("同一进程重复获取锁时应支持安全可重入", () => {
        const res1 = SingleInstanceManager.acquireLocalLock({
            lockPath: testLockPath,
            nodeId: "test-node-01",
            port: 8888,
        });
        expect(res1.status).toBe(1);
        const res2 = SingleInstanceManager.acquireLocalLock({
            lockPath: testLockPath,
            nodeId: "test-node-01",
            port: 8888,
        });
        expect(res2.status).toBe(1);
    });
    it("当已被其他存活进程持有时，应拦截启动并返回清晰错误信息", () => {
        // 父进程 (process.ppid) 在测试执行期间必然是存活的
        const parentPid = process.ppid;
        expect(SingleInstanceManager.isProcessAlive(parentPid)).toBe(true);
        const foreignMeta = {
            pid: parentPid,
            nodeId: "other-instance-node",
            port: 8000,
            startedAt: new Date().toISOString(),
            hostname: "test-host",
        };
        fs.writeFileSync(testLockPath, JSON.stringify(foreignMeta, null, 2), "utf-8");
        const res = SingleInstanceManager.acquireLocalLock({
            lockPath: testLockPath,
            nodeId: "my-node",
            port: 8001,
        });
        expect(res.status).toBe(0);
        expect(res.content).toContain("本地已存在运行中的后端实例");
        expect(res.content).toContain(String(parentPid));
        expect(res.content).toContain("other-instance-node");
    });
    it("当存在非正常退出的陈旧锁 (PID 已死) 时，应自动自愈并接管独占锁", () => {
        const staleDeadPid = 99999999;
        expect(SingleInstanceManager.isProcessAlive(staleDeadPid)).toBe(false);
        const staleMeta = {
            pid: staleDeadPid,
            nodeId: "crashed-node",
            port: 8000,
            startedAt: "2026-01-01T00:00:00.000Z",
            hostname: "old-host",
        };
        fs.writeFileSync(testLockPath, JSON.stringify(staleMeta, null, 2), "utf-8");
        const res = SingleInstanceManager.acquireLocalLock({
            lockPath: testLockPath,
            nodeId: "healing-node",
            port: 8000,
        });
        expect(res.status).toBe(1);
        expect(res.data?.pid).toBe(process.pid);
        expect(res.data?.nodeId).toBe("healing-node");
        // 锁文件内容已被重写为当前进程
        const fileContent = JSON.parse(fs.readFileSync(testLockPath, "utf-8"));
        expect(fileContent.pid).toBe(process.pid);
        expect(fileContent.nodeId).toBe("healing-node");
    });
    it("当锁文件损坏为非 JSON 文本时，应自动自愈并接管", () => {
        fs.writeFileSync(testLockPath, "CORRUPTED_GARBAGE_DATA", "utf-8");
        const res = SingleInstanceManager.acquireLocalLock({
            lockPath: testLockPath,
            nodeId: "repair-node",
            port: 8000,
        });
        expect(res.status).toBe(1);
        expect(res.data?.pid).toBe(process.pid);
        expect(fs.existsSync(testLockPath)).toBe(true);
    });
    it("releaseLocalLock 应成功释放并移除锁文件", () => {
        SingleInstanceManager.acquireLocalLock({
            lockPath: testLockPath,
            nodeId: "release-node",
            port: 8000,
        });
        expect(fs.existsSync(testLockPath)).toBe(true);
        const relRes = SingleInstanceManager.releaseLocalLock();
        expect(relRes.status).toBe(1);
        expect(fs.existsSync(testLockPath)).toBe(false);
    });
});
//# sourceMappingURL=singleInstance.test.js.map