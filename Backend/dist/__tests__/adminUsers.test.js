import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { ensureSuperAdminAccount, SUPER_ADMIN_USERNAME, SUPER_ADMIN_DEFAULT_PASS, executeQuery, loadEnvFile, initMysqlPool, closeMysqlPool, } from "../core/index.js";
import { scanAndPrecompileApiRoutes, getApiRoute } from "../dispatcher/apiScanner.js";
describe("DiarySystem/Backend - Super Admin & User Management Lifecycle Tests", () => {
    beforeAll(async () => {
        loadEnvFile();
        initMysqlPool();
    });
    afterAll(async () => {
        await closeMysqlPool();
    });
    it("ensureSuperAdminAccount 应成功核验并确保 tiany/Preservezty2004 处于可用状态", async () => {
        const res = await ensureSuperAdminAccount();
        expect(res.status).toBe(1);
        expect(res.data?.id).toBeDefined();
        expect(["created", "updated", "verified"]).toContain(res.data?.action);
    });
    it("公开注册通道 /api/auth/register 应已被拦截关闭", async () => {
        await scanAndPrecompileApiRoutes();
        const regRoute = getApiRoute("/api/auth/register");
        expect(regRoute).not.toBeNull();
        const res = await regRoute.handler({ body: { username: "hack", password: "123" } }, {});
        expect(res.status).toBe(0);
        expect(res.content).toContain("关闭");
    });
    it("使用 tiany / Preservezty2004 登录应 100% 成功并签发 Token", async () => {
        await scanAndPrecompileApiRoutes();
        const loginRoute = getApiRoute("/api/auth/login");
        expect(loginRoute).not.toBeNull();
        const res = await loginRoute.handler({ body: { username: SUPER_ADMIN_USERNAME, password: SUPER_ADMIN_DEFAULT_PASS } }, {});
        expect(res.status).toBe(1);
        expect(res.data?.username).toBe(SUPER_ADMIN_USERNAME);
        expect(res.data?.token).toBeDefined();
    });
    it("非 tiany 用户访问 /api/admin/users/* 应被 403 权限拦截", async () => {
        await scanAndPrecompileApiRoutes();
        const listRoute = getApiRoute("/api/admin/users/list");
        const fakeCtx = { user: { username: "other_user", userId: "u-999" } };
        const res = await listRoute.handler({}, fakeCtx);
        expect(res.status).toBe(0);
        expect(res.content).toContain("无权限");
    });
    it("tiany 用户管理全流程：查看列表 -> 创建子账户 -> 修改密码 -> 验证登录 -> 级联删除连带笔记", async () => {
        await scanAndPrecompileApiRoutes();
        const listRoute = getApiRoute("/api/admin/users/list");
        const createRoute = getApiRoute("/api/admin/users/create");
        const updatePassRoute = getApiRoute("/api/admin/users/update-password");
        const deleteRoute = getApiRoute("/api/admin/users/delete");
        const loginRoute = getApiRoute("/api/auth/login");
        const tianyCtx = { user: { username: SUPER_ADMIN_USERNAME, userId: "admin-id" } };
        // 1. 获取列表
        const listRes = await listRoute.handler({}, tianyCtx);
        expect(listRes.status).toBe(1);
        expect(Array.isArray(listRes.data)).toBe(true);
        // 2. 创建测试子账户
        const subUsername = `test_sub_${Date.now()}`;
        const initialPass = "SubPass123!";
        const createRes = await createRoute.handler({ body: { username: subUsername, password: initialPass, nickname: "子账户测试" } }, tianyCtx);
        expect(createRes.status).toBe(1);
        const subUserId = createRes.data?.id;
        expect(subUserId).toBeDefined();
        // 3. 模拟为该子账户创建 2 篇笔记
        await executeQuery("INSERT INTO diaries (id, user_id, title, content) VALUES (?, ?, ?, ?), (?, ?, ?, ?)", [
            `d-sub-1-${Date.now()}`, subUserId, "子账户日记1", "内容1",
            `d-sub-2-${Date.now()}`, subUserId, "子账户日记2", "内容2",
        ]);
        // 4. 修改密码
        const newPass = "NewSubPass456!";
        const updateRes = await updatePassRoute.handler({ body: { userId: subUserId, newPassword: newPass } }, tianyCtx);
        expect(updateRes.status).toBe(1);
        // 5. 验证新密码能登录
        const loginRes = await loginRoute.handler({ body: { username: subUsername, password: newPass } }, {});
        expect(loginRes.status).toBe(1);
        // 6. 级联删除用户并验证笔记连带清空
        const deleteRes = await deleteRoute.handler({ body: { userId: subUserId } }, tianyCtx);
        expect(deleteRes.status).toBe(1);
        expect(deleteRes.data?.deletedNotesCount).toBe(2);
        // 验证日记表中已无该 user_id 记录
        const checkDiaries = await executeQuery("SELECT COUNT(*) AS count FROM diaries WHERE user_id = ?", [subUserId]);
        expect(checkDiaries.data?.[0]?.count).toBe(0);
        // 验证用户无法再登录
        const loginAfterDel = await loginRoute.handler({ body: { username: subUsername, password: newPass } }, {});
        expect(loginAfterDel.status).toBe(0);
    });
});
//# sourceMappingURL=adminUsers.test.js.map