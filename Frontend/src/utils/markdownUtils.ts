import DOMPurify from "dompurify";
import hljs from "highlight.js";
import { marked } from "marked";
import TurndownService from "turndown";
// @ts-ignore
import { gfm } from "turndown-plugin-gfm";

// 配置 marked Markdown -> HTML 编译器
marked.setOptions({
  gfm: true,
  breaks: true,
});

const renderer = new marked.Renderer();
renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  if (lang && lang.trim().toLowerCase() === "mermaid") {
    const encoded = encodeURIComponent(text.trim());
    return `<div class="mermaid-diagram-container" data-mermaid="${encoded}"><div class="mermaid-loading-state"><span class="mermaid-loading-spinner"></span>正在绘制图表...</div></div>`;
  }
  const validLanguage = lang && hljs.getLanguage(lang) ? lang : "plaintext";
  const highlighted = hljs.highlight(text, { language: validLanguage }).value;
  const displayLang = (lang || "code").toUpperCase();
  const encodedText = encodeURIComponent(text);

  return `<div class="code-block-wrapper"><div class="code-block-header"><span class="code-block-lang">${displayLang}</span><div class="code-block-actions"><button type="button" class="code-block-action-btn btn-code-theme" title="切换深色模式"><span class="theme-icon">🌙</span><span class="theme-text">深色</span></button><button type="button" class="code-block-action-btn btn-code-copy" data-code="${encodedText}" title="复制代码"><span class="copy-icon">📋</span><span class="copy-text">复制</span></button></div></div><pre><code class="hljs language-${validLanguage}">${highlighted}</code></pre></div>`;
};

marked.use({ renderer });

// 初始化 Turndown HTML -> Markdown 逆向编译器
const turndownService = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
});

// 启用 GFM 插件 (支持 Table、Task Lists、Strikethrough)
try {
  turndownService.use(gfm);
} catch {
  // fallback if plugin fails
}

// 自定义代码块逆向规则 (恢复 code-block-wrapper 为标准 ```lang ... ```)
turndownService.addRule("codeBlockWrapper", {
  filter: (node) => {
    return (
      node.nodeName === "DIV" &&
      node.classList.contains("code-block-wrapper")
    );
  },
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    const codeEl = el.querySelector("code");
    const langSpan = el.querySelector(".code-block-lang");
    const rawText = codeEl ? codeEl.textContent || "" : "";
    let lang = "";
    if (codeEl) {
      const cls = codeEl.className || "";
      const match = cls.match(/language-(\w+)/);
      if (match) lang = match[1];
    }
    if ((!lang || lang === "plaintext") && langSpan) {
      const txt = (langSpan.textContent || "").toLowerCase().trim();
      if (txt && txt !== "CODE" && txt !== "PLAINTEXT") lang = txt;
    }
    return `\n\n\`\`\`${lang === "plaintext" ? "" : lang}\n${rawText.trim()}\n\`\`\`\n\n`;
  },
});

// 自定义 Mermaid 图表逆向规则 (支持所见即所得转源码无损保持)
turndownService.addRule("mermaidBlock", {
  filter: (node) => {
    return (
      node.nodeName === "DIV" &&
      node.classList.contains("mermaid-diagram-container") &&
      node.hasAttribute("data-mermaid")
    );
  },
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    const encoded = el.getAttribute("data-mermaid") || "";
    try {
      const code = decodeURIComponent(encoded);
      return `\n\n\`\`\`mermaid\n${code.trim()}\n\`\`\`\n\n`;
    } catch {
      return "";
    }
  },
});

// 自定义 Callout 提示框规则
turndownService.addRule("calloutBlock", {
  filter: (node) => {
    return node.nodeName === "DIV" && node.classList.contains("document-callout");
  },
  replacement: (content) => {
    const lines = content.trim().split("\n");
    return "\n\n> 💡 " + lines.join("\n> ") + "\n\n";
  },
});

// 自定义图片尺寸与排版保留规则
turndownService.addRule("resizableImage", {
  filter: "img",
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    const src = el.getAttribute("src") || "";
    if (!src) return "";
    const alt = el.getAttribute("alt") || "";

    // 多通道容错提取宽度 (支持 style 字符串、width 属性、data-width 属性以及 inline style 对象)
    const styleAttr = el.getAttribute("style") || "";
    const styleWidthMatch = styleAttr.match(/(?:^|;\s*)width\s*:\s*([^;]+)/i);
    const styleWidth = styleWidthMatch ? styleWidthMatch[1].trim() : "";
    const rawWidth =
      el.getAttribute("data-width") ||
      el.getAttribute("width") ||
      el.style?.width ||
      styleWidth ||
      "";
    const width = rawWidth.trim();

    // 提取对齐方式
    const align =
      el.getAttribute("data-align") ||
      (el.style?.margin === "0px auto" || el.style?.margin === "12px auto" || el.style?.margin === "0 auto"
        ? "center"
        : el.style?.marginLeft === "auto"
        ? "right"
        : el.style?.marginRight === "auto"
        ? "left"
        : "");

    // 如果图片设置了自定义宽度或对齐方式，则以可调节尺寸的 HTML <img> 语法持久化保存
    if (width || align) {
      const styleParts: string[] = [];
      let widthAttr = "";
      if (width) {
        const formattedWidth = /^\d+$/.test(width) ? `${width}px` : width;
        styleParts.push(`width: ${formattedWidth}`);
        widthAttr = ` width="${width}"`;
      }
      styleParts.push("max-width: 100%");
      if (align === "center") {
        styleParts.push("display: block", "margin: 12px auto");
      } else if (align === "right") {
        styleParts.push("display: block", "margin-left: auto");
      } else if (align === "left") {
        styleParts.push("display: block", "margin-right: auto");
      }
      styleParts.push("border-radius: 8px");

      const altAttr = alt ? ` alt="${alt}"` : "";
      const alignAttr = align ? ` data-align="${align}"` : "";
      const dataWidthAttr = width ? ` data-width="${width}"` : "";
      return `<img src="${src}"${altAttr}${widthAttr}${dataWidthAttr}${alignAttr} style="${styleParts.join("; ")};" />`;
    }

    // 无自定义尺寸时保留经典 Markdown 语法
    return `![${alt}](${src})`;
  },
});

/**
 * 将 Markdown 字符串转换为安全的 HTML
 */
export function markdownToHtml(md: string): string {
  if (!md || !md.trim()) return "";
  const purifyConfig = {
    ADD_TAGS: ["input", "button"],
    ADD_ATTR: [
      "type",
      "checked",
      "disabled",
      "style",
      "width",
      "height",
      "data-width",
      "data-align",
      "data-mermaid",
      "data-processed",
      "data-chart-id",
      "data-code",
      "loading",
      "alt",
      "src",
      "title",
    ],
  };
  const sanitize = (raw: string) => {
    if (typeof DOMPurify?.sanitize === "function") {
      return DOMPurify.sanitize(raw, purifyConfig);
    }
    if (typeof (DOMPurify as any)?.default?.sanitize === "function") {
      return (DOMPurify as any).default.sanitize(raw, purifyConfig);
    }
    return raw;
  };
  try {
    const rawHtml = marked.parse(md) as string;
    return sanitize(rawHtml);
  } catch {
    return sanitize(md);
  }
}

/**
 * 将 HTML 转换为标准的 GitHub Flavored Markdown
 */
export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return "";
  try {
    return turndownService.turndown(html);
  } catch (err) {
    console.error("Turndown conversion error:", err);
    return html;
  }
}
