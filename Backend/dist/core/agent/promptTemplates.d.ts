/**
 * AI Agent 系统提示词体系与元规则设计
 */
export interface SystemPromptUserContext {
    nickname?: string;
    username: string;
}
/**
 * 构建注入动态现实时间与元规则的 System Prompt
 */
export declare function buildSystemPrompt(user: SystemPromptUserContext): string;
//# sourceMappingURL=promptTemplates.d.ts.map