import { returnSuccess, StandardResult } from "#core";

export const api = {
  routePath: "/api/health",
  authRequired: false,
  handler: async (): Promise<StandardResult<any>> => {
    return returnSuccess({
      status: "UP",
      timestamp: new Date().toISOString(),
      service: "DiarySystem Backend (MySQL)",
    });
  },
};

export default api;
