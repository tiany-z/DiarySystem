import { returnError } from "#core";
export const api = {
    routePath: "/api/auth/register",
    authRequired: false,
    handler: async (_reqCtx, _ctx) => {
        return returnError("系统已关闭对外公开注册通道，请联系系统总管理员分配账户");
    },
};
export default api;
//# sourceMappingURL=index.js.map