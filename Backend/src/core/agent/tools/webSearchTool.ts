import {
  AgentToolDefinition,
  AgentToolExecutor,
  AgentToolResult,
} from "./types.js";

export interface WebSearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export const webSearchTool: AgentToolDefinition = {
  type: "function",
  function: {
    name: "web_search",
    description:
      "进行实时互联网网页搜索。用于检索最新外部资讯、时事、技术资料、天气与百科知识。当用户提问涉及外部世界或最新信息时调用此工具。",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "精炼的搜索查询词。避免自然语言长句，提取核心关键词短语（如 '杭州 明天 天气' 或 'Node.js LTS 最新版本'）",
        },
        maxResults: {
          type: "integer",
          description: "期望获取的网页结果数量，默认 5 条，范围 1~8",
        },
      },
      required: ["query"],
    },
  },
};

/**
 * 极简、安全的 HTML 提取器，不依赖臃肿的 cheerio 或 jsdom
 */
function parseDuckDuckGoHtml(html: string, limit: number): WebSearchResultItem[] {
  const results: WebSearchResultItem[] = [];
  const resultRegex =
    /<a class="result__url" href="([^"]+)">[\s\S]*?<h2 class="result__title">[\s\S]*?<a class="result__a"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

  // 正则清洗标签和常见实体
  const stripTags = (s: string) =>
    s
      .replace(/<[^>]+>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .trim();

  let match: RegExpExecArray | null;
  while ((match = resultRegex.exec(html)) !== null && results.length < limit) {
    const rawUrl = match[1];
    const title = stripTags(match[2]);
    const snippet = stripTags(match[3]);

    // 解码 DuckDuckGo 真实跳转 URL
    let realUrl = rawUrl;
    if (rawUrl.includes("uddg=")) {
      try {
        const u = new URL(
          rawUrl.startsWith("http") ? rawUrl : `https://duckduckgo.com${rawUrl}`
        ).searchParams.get("uddg");
        if (u) {
          realUrl = decodeURIComponent(u);
        }
      } catch {
        // fallback to rawUrl
      }
    }

    if (title && (snippet || realUrl)) {
      results.push({ title, url: realUrl, snippet });
    }
  }

  return results;
}

export const webSearchExecutor: AgentToolExecutor = async (
  args,
  _context
): Promise<AgentToolResult> => {
  const query = (args?.query || "").trim();
  const maxResults = Math.min(Math.max(Number(args?.maxResults) || 5, 1), 8);

  if (!query) {
    return {
      success: false,
      error: "搜索关键词不能为空",
      summary: "搜索失败：缺少关键词",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6秒超时

  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const resp = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const html = await resp.text();
      const items = parseDuckDuckGoHtml(html, maxResults);
      if (items.length > 0) {
        return {
          success: true,
          data: {
            query,
            total: items.length,
            results: items,
          },
          summary: `已联网检索到 ${items.length} 条关于 "${query}" 的最新网页`,
        };
      }
    }
  } catch (_err) {
    clearTimeout(timeoutId);
  }

  // 平滑降级，不阻断 Agent 整体对话流
  return {
    success: true,
    data: {
      query,
      total: 0,
      results: [],
      notice:
        "当前外部网络环境受限或搜索引擎未返回有效结果。请结合已有知识作答，并向用户说明无法获取实时最新网页。",
    },
    summary: `网络搜索 "${query}" 暂无结果，将结合已有知识作答`,
  };
};
