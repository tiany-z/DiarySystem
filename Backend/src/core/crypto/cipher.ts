import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const DEFAULT_SECRET = "diary-system-backend-secret-key-2026";

function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET || DEFAULT_SECRET;
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * 使用 AES-256-GCM 加密 API Key 等敏感文本
 * 密文格式为: hex(iv):hex(authTag):hex(encrypted)
 */
export function encryptApiKey(plainText: string): string {
  if (!plainText || typeof plainText !== "string") return "";
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch {
    return "";
  }
}

/**
 * 解密由 encryptApiKey 加密的密文字符串
 */
export function decryptApiKey(cipherText: string): string {
  if (!cipherText || typeof cipherText !== "string" || !cipherText.includes(":")) return "";
  try {
    const parts = cipherText.split(":");
    if (parts.length !== 3) return "";

    const [ivHex, authTagHex, encrypted] = parts;
    if (!ivHex || !authTagHex || !encrypted) return "";

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "";
  }
}
