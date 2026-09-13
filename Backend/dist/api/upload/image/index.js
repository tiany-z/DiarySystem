import fs from "fs";
import path from "path";
import crypto from "crypto";
import { returnError, returnSuccess, tryCatchErrorToString } from "../../../core/index.js";
const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
]);
const EXT_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
};
export const api = {
    routePath: "/api/upload/image",
    authRequired: true,
    astConfig: null,
    run: null,
    handler: async (reqCtx, _ctx) => {
        try {
            const uploadsDir = path.resolve(process.cwd(), "uploads");
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            let fileBuffer = null;
            let originalName = "image.png";
            let mimeType = "image/png";
            // 1. 优先提取 Multipart 二进制流解析的文件
            if (reqCtx.files && reqCtx.files.length > 0) {
                const file = reqCtx.files[0];
                fileBuffer = file.buffer;
                originalName = file.originalName || "image.png";
                mimeType = file.mimeType || "image/png";
            }
            else if (reqCtx.body && reqCtx.body.file) {
                // 2. 兼容 Base64 / Data URI 格式上传
                const raw = String(reqCtx.body.file);
                const match = raw.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
                if (match) {
                    mimeType = match[1];
                    fileBuffer = Buffer.from(match[2], "base64");
                }
                else {
                    fileBuffer = Buffer.from(raw, "base64");
                }
                if (reqCtx.body.filename) {
                    originalName = String(reqCtx.body.filename);
                }
            }
            if (!fileBuffer || fileBuffer.length === 0) {
                return returnError("未接收到有效的图片文件内容");
            }
            if (!ALLOWED_MIME_TYPES.has(mimeType)) {
                return returnError(`不支持的图片格式: ${mimeType}。支持格式: JPG, PNG, GIF, WebP, SVG`);
            }
            if (fileBuffer.length > 10 * 1024 * 1024) {
                return returnError("图片文件大小不能超过 10MB");
            }
            // 生成防冲突的安全唯一文件名 (时间戳 + 8字节随机十六进制 + 格式后缀)
            const ext = EXT_MAP[mimeType] || path.extname(originalName) || ".png";
            const randomSuffix = crypto.randomBytes(8).toString("hex");
            const filename = `${Date.now()}-${randomSuffix}${ext}`;
            const destPath = path.join(uploadsDir, filename);
            fs.writeFileSync(destPath, fileBuffer);
            // 返回安全访问 URL，双通道透传 (/api/uploads/... 与 /uploads/...)
            const url = `/api/uploads/${filename}`;
            return returnSuccess({
                url,
                filename,
                originalName,
                size: fileBuffer.length,
                mimeType,
            }, "图片上传成功");
        }
        catch (error) {
            return returnError(`上传图片处理异常: ${tryCatchErrorToString(error)}`);
        }
    },
};
export default api;
//# sourceMappingURL=index.js.map