/**
 * markdownDiagrams.ts
 * 统一的 Mermaid 矢量图表异步渲染引擎与 3 模态（图表/代码/双显）控制器
 * - 支持在 MarkdownViewer、MarkdownStudio WYSIWYG 编辑器及弹窗中无缝运行
 * - 提供每张图表独立的“图表 / 代码 / 双显”三模态即时切换
 * - 优雅的语法错误降级提示与源码展示
 */
import mermaid from "mermaid";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let mermaidInitializedTheme: "dark" | "light" | null = null;

export function initMermaid(isDark: boolean) {
  const currentTheme = isDark ? "dark" : "light";
  if (mermaidInitializedTheme === currentTheme) return;

  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? "dark" : "default",
      securityLevel: "loose",
      fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      themeVariables: isDark
        ? {
            darkMode: true,
            background: "#18181f",
            primaryColor: "#5B7B8D",
            primaryTextColor: "#f3f4f6",
            primaryBorderColor: "#6E90A3",
            lineColor: "#8EAEC0",
            secondaryColor: "#25252e",
            tertiaryColor: "#1c1c24",
          }
        : {
            darkMode: false,
            background: "#ffffff",
            primaryColor: "#5B7B8D",
            primaryTextColor: "#1f2937",
            primaryBorderColor: "#4F6D7E",
            lineColor: "#5B7B8D",
            secondaryColor: "#f3f4f6",
            tertiaryColor: "#fafafa",
          },
    });
    mermaidInitializedTheme = currentTheme;
  } catch (e) {
    console.warn("Mermaid initialize warning:", e);
  }
}

/**
 * 遍历渲染指定容器内的所有 .mermaid-diagram-container 元素
 */
export async function renderMermaidDiagrams(
  container: HTMLElement | null,
  isDark: boolean,
  onZoom?: (svgHtml: string) => void
): Promise<void> {
  if (!container) return;

  const diagramElements = container.querySelectorAll<HTMLDivElement>(".mermaid-diagram-container");
  if (!diagramElements || diagramElements.length === 0) return;

  initMermaid(isDark);

  for (let i = 0; i < diagramElements.length; i++) {
    const el = diagramElements[i];

    const currentThemeAttr = isDark ? "dark" : "light";
    const processedTheme = el.getAttribute("data-rendered-theme");
    const isProcessed = el.getAttribute("data-processed") === "true";

    // 若已经成功渲染且主题未变，跳过重新生成
    if (isProcessed && processedTheme === currentThemeAttr && el.querySelector(".mermaid-svg-wrapper")) {
      continue;
    }

    const rawCodeEncoded = el.getAttribute("data-mermaid") || "";
    if (!rawCodeEncoded) continue;

    let rawCode = "";
    try {
      rawCode = decodeURIComponent(rawCodeEncoded).trim();
    } catch {
      rawCode = rawCodeEncoded.trim();
    }

    // 默认或已选模态: "diagram" (仅图表), "code" (仅代码), "both" (双显)
    const currentMode = el.getAttribute("data-mode") || "diagram";
    const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}-${i}-${Date.now()}`;

    try {
      const { svg } = await mermaid.render(uniqueId, rawCode);

      el.setAttribute("data-processed", "true");
      el.setAttribute("data-rendered-theme", currentThemeAttr);
      el.setAttribute("data-mode", currentMode);

      el.innerHTML = `
        <div class="mermaid-diagram-card" data-diagram-index="${i}">
          <div class="mermaid-diagram-toolbar">
            <div class="mermaid-mode-toggle" role="group" aria-label="图表视图模式">
              <button type="button" class="mermaid-mode-btn btn-mode-diagram ${currentMode === "diagram" ? "active" : ""}" data-target-mode="diagram" title="仅显示图表">
                <span class="mode-icon">🖼️</span>
                <span class="mode-text">图表</span>
              </button>
              <button type="button" class="mermaid-mode-btn btn-mode-code ${currentMode === "code" ? "active" : ""}" data-target-mode="code" title="仅显示源码">
                <span class="mode-icon">💻</span>
                <span class="mode-text">代码</span>
              </button>
              <button type="button" class="mermaid-mode-btn btn-mode-both ${currentMode === "both" ? "active" : ""}" data-target-mode="both" title="图表与源码双显">
                <span class="mode-icon">🔀</span>
                <span class="mode-text">双显</span>
              </button>
            </div>
            <div class="mermaid-action-tools">
              <button type="button" class="mermaid-toolbar-btn btn-copy" title="复制代码">
                <span class="btn-icon">📋</span>
                <span class="btn-text">复制</span>
              </button>
              <button type="button" class="mermaid-toolbar-btn btn-zoom" title="全屏放大">
                <span class="btn-icon">🔍</span>
                <span class="btn-text">全屏</span>
              </button>
            </div>
          </div>
          
          {/* 图表展示主体：支持横向双显（左侧代码，右侧图表） */}
          <div class="mermaid-content-layout mode-${currentMode}">
            <div class="mermaid-code-wrapper" style="display: ${currentMode === "diagram" ? "none" : "block"};">
              <pre><code class="language-mermaid">${escapeHtml(rawCode)}</code></pre>
            </div>
            <div class="mermaid-svg-wrapper" style="display: ${currentMode === "code" ? "none" : "flex"};">
              ${svg}
            </div>
          </div>
        </div>
      `;

      // 绑定交互按钮事件
      const card = el.querySelector(".mermaid-diagram-card") as HTMLElement | null;
      if (!card) continue;

      // 模态切换
      const modeBtns = card.querySelectorAll<HTMLButtonElement>(".mermaid-mode-btn");
      const contentLayout = card.querySelector(".mermaid-content-layout") as HTMLElement | null;
      const codeWrapper = card.querySelector(".mermaid-code-wrapper") as HTMLElement | null;
      const svgWrapper = card.querySelector(".mermaid-svg-wrapper") as HTMLElement | null;

      modeBtns.forEach((btn) => {
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const targetMode = btn.getAttribute("data-target-mode") || "diagram";
          el.setAttribute("data-mode", targetMode);

          modeBtns.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");

          if (contentLayout) {
            contentLayout.className = `mermaid-content-layout mode-${targetMode}`;
          }
          if (codeWrapper) {
            codeWrapper.style.display = targetMode === "diagram" ? "none" : "block";
          }
          if (svgWrapper) {
            svgWrapper.style.display = targetMode === "code" ? "none" : "flex";
          }
        };
      });

      // 复制源码
      const copyBtn = card.querySelector(".btn-copy") as HTMLButtonElement | null;
      if (copyBtn) {
        copyBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          navigator.clipboard.writeText(rawCode);
          const textSpan = copyBtn.querySelector(".btn-text");
          if (textSpan) textSpan.textContent = "已复制";
          setTimeout(() => {
            if (textSpan) textSpan.textContent = "复制";
          }, 2000);
        };
      }

      // 全屏放大
      const zoomBtn = card.querySelector(".btn-zoom") as HTMLButtonElement | null;
      if (zoomBtn && onZoom) {
        zoomBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentSvg = svgWrapper?.innerHTML;
          if (currentSvg) onZoom(currentSvg);
        };
      }
    } catch (err: any) {
      console.warn("Mermaid diagram rendering error:", err);
      el.setAttribute("data-processed", "true");
      el.setAttribute("data-rendered-theme", currentThemeAttr);

      el.innerHTML = `
        <div class="mermaid-error-card">
          <div class="mermaid-error-header">
            <span class="mermaid-error-icon">⚠️</span>
            <span class="mermaid-error-title">Mermaid 图表解析失败</span>
          </div>
          <div class="mermaid-error-msg">${escapeHtml(err?.message || "语法结构错误，请检查图表代码")}</div>
          <details class="mermaid-error-details" open>
            <summary>查看原始图表代码</summary>
            <pre class="mermaid-error-code"><code>${escapeHtml(rawCode)}</code></pre>
          </details>
        </div>
      `;
    }
  }
}
