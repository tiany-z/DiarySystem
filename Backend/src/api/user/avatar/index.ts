import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  delKV,
  executeQuery,
  returnError,
  returnSuccess,
  StandardResult,
  tryCatchErrorToString,
} from "../../../core/index.js";
import { UploadedFile } from "../../../utils/multipartHelper.js";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

export const api = {
  routePath: "/api/user/avatar",
  authRequired: true,
  handler: async (
    reqCtx: { body: any; files?: UploadedFile[]; user?: any },
    ctx: any
  ): Promise<StandardResult<any>> => {
    try {
      const currentUserId =
        reqCtx?.user?.userId ||
        ctx?.userPayload?.userId ||
        ctx?.user?.userId ||
        ctx?.userPayload?.id;

      if (!currentUserId) {
        return returnError("未鉴权请求或用户登录态失效");
      }

      const uploadsDir = path.resolve(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      let avatarUrl: string | null = null;
      let rawAvatar = reqCtx.body?.avatar || reqCtx.body?.avatarUrl;

      // 1. 如果有上传的二进制文件
      if (reqCtx.files && reqCtx.files.length > 0) {
        const file = reqCtx.files[0];
        const mimeType = file.mimeType || "image/png";
        if (!ALLOWED_MIME_TYPES.has(mimeType)) {
          return returnError("不支持的头像格式，请上传 JPG, PNG, GIF 或 WebP 图片");
        }
        const ext = EXT_MAP[mimeType] || ".png";
        const filename = `avatar-${currentUserId}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
        const destPath = path.join(uploadsDir, filename);
        fs.writeFileSync(destPath, file.buffer);
        avatarUrl = `/api/uploads/${filename}`;
      } else if (typeof rawAvatar === "string" && rawAvatar.trim()) {
        const trimmed = rawAvatar.trim();
        // 2. 如果是 Base64 Data URI
        const match = trimmed.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          if (!ALLOWED_MIME_TYPES.has(mimeType)) {
            return returnError("不支持的图片格式，请使用 JPG, PNG, GIF 或 WebP");
          }
          const buffer = Buffer.from(match[2], "base64");
          if (buffer.length > 5 * 1024 * 1024) {
            return returnError("头像图片大小不能超过 5MB");
          }
          const ext = EXT_MAP[mimeType] || ".png";
          const filename = `avatar-${currentUserId}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
          const destPath = path.join(uploadsDir, filename);
          fs.writeFileSync(destPath, buffer);
          avatarUrl = `/api/uploads/${filename}`;
        } else {
          // 3. 已经是有效 URL 路径 (例如已通过 /api/upload/image 上传的路径)
          avatarUrl = trimmed;
        }
      } else if (rawAvatar === null || rawAvatar === "") {
        // 4. 重置清空头像
        avatarUrl = null;
      } else {
        return returnError("请提供头像图片或有效图片链接");
      }

      // 执行数据库更新
      const updateRes = await executeQuery(
        "UPDATE users SET avatar = ? WHERE id = ?",
        [avatarUrl, currentUserId]
      );
      if (updateRes.status === 0) {
        return returnError(`更新头像失败: ${updateRes.content}`);
      }

      // 驱逐缓存
      await delKV("users", currentUserId);

      // 查询最新用户资料
      const userRes = await executeQuery<any>(
        "SELECT id, username, nickname, email, avatar, created_at FROM users WHERE id = ? LIMIT 1",
        [currentUserId]
      );

      const updatedUser = userRes.data && userRes.data.length > 0 ? userRes.data[0] : null;

      return returnSuccess(
        {
          avatar: avatarUrl,
          user: updatedUser,
        },
        avatarUrl ? "头像更新成功" : "头像已重置"
      );
    } catch (error) {
      return returnError(`更新头像处理异常: ${tryCatchErrorToString(error)}`);
    }
  },
};

export default api;
