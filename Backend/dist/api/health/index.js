import { returnSuccess } from "#core";
export const api = {
    routePath: "/api/health",
    authRequired: false,
    handler: async () => {
        return returnSuccess({
            status: "UP",
            timestamp: new Date().toISOString(),
            service: "DiarySystem Backend (MySQL)",
        });
    },
};
export default api;
//# sourceMappingURL=index.js.map