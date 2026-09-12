import {
  compileAstRunFunction,
  declare,
  genUUID,
  hashPassword,
  returnError,
  returnSuccess,
  signJwtToken,
  StandardResult,
} from "#core";

const usersTable = declare.table("users");
const usernameCol = declare.column(usersTable, "username");

// 预编译 SELECT 检查用户名是否已存在
const checkUserExistRun = compileAstRunFunction({
  type: "SELECT",
  compose: {
    columns: [declare.column(usersTable, "id")],
    where: [declare.where.compare(usernameCol, "=", declare.customValue("-!!value!!-"))],
  },
});

export const api = {
  routePath: "/api/auth/register",
  authRequired: false,
  astConfig: {
    type: "INSERT",
    compose: {
      table: usersTable,
      columns: [
        usernameCol,
        declare.column(usersTable, "password_hash"),
        declare.column(usersTable, "nickname"),
      ],
    },
  },
  run: null as any,
  handler: async (reqCtx: { body: any }, ctx: any): Promise<StandardResult<any>> => {
    try {
      const { username, password, nickname } = reqCtx.body;
      if (!username || !password) {
        return returnError("用户名和密码不能为空");
      }

      // 1. AST 预编译二段式 SELECT 检查用户名重复
      const existRes = await checkUserExistRun({ whereParams: [username] }, ctx);
      if (existRes.status === 1 && existRes.data && existRes.data.length > 0) {
        return returnError("用户名已被注册");
      }

      // 2. 加盐哈希密码
      const hashRes = await hashPassword(password);
      if (hashRes.status === 0) return returnError(hashRes.content);

      if (!api.run) {
        return returnError("AST Run function not compiled");
      }

      // 3. 执行 AST 预编译的 INSERT (MySQL 内核自动补齐并生成 UUID 主键)
      const runRes = await api.run([username, hashRes.data, nickname || username], ctx);
      if (runRes.status === 0) {
        if (runRes.content?.includes("Duplicate entry") || runRes.content?.includes("users_username_key")) {
          return returnError("用户名已被注册，请使用其他用户名");
        }
        return returnError(runRes.content);
      }

      const userId = runRes.data.id;

      // 4. 签发 JWT
      const jwtRes = signJwtToken({ userId, username });

      return returnSuccess({
        userId,
        username,
        nickname: nickname || username,
        token: jwtRes.data,
      });
    } catch (error) {
      return returnError(`注册失败: ${String(error)}`);
    }
  },
};

export default api;
