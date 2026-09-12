import {
  declare,
  returnError,
  returnSuccess,
  signJwtToken,
  StandardResult,
  verifyPassword,
} from "#core";

const usersTable = declare.table("users");
const usernameCol = declare.column(usersTable, "username");

export const api = {
  routePath: "/api/auth/login",
  authRequired: false,
  astConfig: {
    type: "SELECT",
    compose: {
      columns: [
        declare.column(usersTable, "id"),
        usernameCol,
        declare.column(usersTable, "password_hash"),
        declare.column(usersTable, "nickname"),
      ],
      where: [declare.where.compare(usernameCol, "=", declare.customValue("-!!value!!-"))],
    },
  },
  run: null as any,
  handler: async (reqCtx: { body: any }, ctx: any): Promise<StandardResult<any>> => {
    try {
      const { username, password } = reqCtx.body;
      if (!username || !password) {
        return returnError("用户名和密码不能为空");
      }

      if (!api.run) {
        return returnError("AST Run function not compiled");
      }

      // 1. 二段式 SELECT 查询用户
      const runRes = await api.run({ whereParams: [username] }, ctx);
      if (runRes.status === 0) return returnError(runRes.content);

      const users = runRes.data;
      if (!users || users.length === 0) {
        return returnError("用户名或密码错误");
      }

      const user = users[0];

      // 2. 校验密码哈希
      const verifyRes = await verifyPassword(password, user.password_hash);
      if (verifyRes.status === 0 || !verifyRes.data) {
        return returnError("用户名或密码错误");
      }

      // 3. 签发 Token
      const jwtRes = signJwtToken({ userId: user.id, username: user.username });

      return returnSuccess({
        userId: user.id,
        username: user.username,
        nickname: user.nickname,
        token: jwtRes.data,
      });
    } catch (error) {
      return returnError(`登录失败: ${String(error)}`);
    }
  },
};

export default api;
