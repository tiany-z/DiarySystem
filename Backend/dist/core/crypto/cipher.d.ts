/**
 * 使用 AES-256-GCM 加密 API Key 等敏感文本
 * 密文格式为: hex(iv):hex(authTag):hex(encrypted)
 */
export declare function encryptApiKey(plainText: string): string;
/**
 * 解密由 encryptApiKey 加密的密文字符串
 */
export declare function decryptApiKey(cipherText: string): string;
//# sourceMappingURL=cipher.d.ts.map