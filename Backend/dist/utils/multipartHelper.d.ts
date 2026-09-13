import http from "http";
import { StandardResult } from "../core/index.js";
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
export declare function parseMultipartBody(req: http.IncomingMessage, maxFileSize?: number): Promise<StandardResult<ParsedMultipartData>>;
//# sourceMappingURL=multipartHelper.d.ts.map