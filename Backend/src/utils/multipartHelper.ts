import http from "http";
import busboy from "busboy";
import { returnError, returnSuccess, StandardResult, tryCatchErrorToString } from "../core/index.js";

export interface UploadedFile {
  filename: string;
  originalName: string;
  encoding: string;
  mimeType: string;
  buffer: Buffer;
  size: number;
}

export interface ParsedMultipartData {
  fields: Record<string, any>;
  files: UploadedFile[];
}

/**
 * 解析 multipart/form-data 格式上传的文件与字段
 */
export async function parseMultipartBody(
  req: http.IncomingMessage,
  maxFileSize: number = 10 * 1024 * 1024 // 10MB
): Promise<StandardResult<ParsedMultipartData>> {
  return new Promise((resolve) => {
    try {
      const headers = req.headers;
      const bb = busboy({
        headers,
        limits: {
          fileSize: maxFileSize,
          files: 5,
        },
      });

      const fields: Record<string, any> = {};
      const files: UploadedFile[] = [];
      let limitExceeded = false;

      bb.on("field", (name, val) => {
        fields[name] = val;
      });

      bb.on("file", (_name, fileStream, info) => {
        const { filename, encoding, mimeType } = info;
        const chunks: Buffer[] = [];

        fileStream.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });

        fileStream.on("limit", () => {
          limitExceeded = true;
        });

        fileStream.on("end", () => {
          if (!limitExceeded && filename) {
            const buffer = Buffer.concat(chunks);
            files.push({
              filename,
              originalName: filename,
              encoding,
              mimeType,
              buffer,
              size: buffer.length,
            });
          }
        });
      });

      bb.on("finish", () => {
        if (limitExceeded) {
          return resolve(returnError("文件大小超出限制 (最大支持 10MB)"));
        }
        resolve(returnSuccess({ fields, files }));
      });

      bb.on("error", (err) => {
        resolve(returnError(`解析 Multipart 上传数据失败: ${tryCatchErrorToString(err)}`));
      });

      req.pipe(bb);
    } catch (err) {
      resolve(returnError(`初始化文件上传解析失败: ${tryCatchErrorToString(err)}`));
    }
  });
}
