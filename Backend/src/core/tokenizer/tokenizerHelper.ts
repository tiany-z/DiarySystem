export function countTokensFallback(text: string): number {
  if (!text) return 0;
  const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const nonChineseText = text.replace(/[\u4e00-\u9fa5]/g, " ");
  const wordCount = nonChineseText.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(chineseCharCount * 1.2 + wordCount * 1.3);
}

export function truncateByTokensFallback(text: string, maxTokens: number): string {
  if (!text || maxTokens <= 0) return "";
  const totalEstimated = countTokensFallback(text);
  if (totalEstimated <= maxTokens) return text;

  const ratio = maxTokens / totalEstimated;
  const chars = Array.from(text);
  const targetCharLength = Math.floor(chars.length * ratio);

  return chars.slice(0, targetCharLength).join("");
}
