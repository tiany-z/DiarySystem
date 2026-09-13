import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Tooltip } from "@fluentui/react-components";
import { Dismiss20Regular } from "@fluentui/react-icons";
import mermaid from "mermaid";
import { useAppTheme } from "../context/ThemeContext";
import { markdownToHtml } from "../utils/markdownUtils";

interface MarkdownViewerProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

// 辅助函数：转义 HTML 字符串避免 XSS
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className = "", style }) => {
  const { isDark, forceCodeDark, toggleForceCodeDark } = useAppTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  const [previewImgSrc, setPreviewImgSrc] = useState<string | null>(null);
  const [previewImgAlt, setPreviewImgAlt] = useState<string>("");
  const [previewSvgContent, setPreviewSvgContent] = useState<string | null>(null);

  const html = useMemo(() => {
    if (!content) return "<p style='opacity: 0.5;'>暂无正文内容...</p>";
    return markdownToHtml(content);
  }, [content]);

  // 当 HTML 结构或当前主题模式改变时，调度 Mermaid 矢量图表异步渲染
  useEffect(() => {
    let isCancelled = false;

    const renderDiagrams = async () => {
      const container = containerRef.current;
      if (!container) return;

      const diagramElements = container.querySelectorAll<HTMLDivElement>(".mermaid-diagram-container");
      if (!diagramElements || diagramElements.length === 0) return;

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
      } catch (e) {
        console.warn("Mermaid initialize warning:", e);
      }

      for (let i = 0; i < diagramElements.length; i++) {
        if (isCancelled) break;
        const el = diagramElements[i];

        // 若当前已经渲染过且主题未变，跳过渲染；若主题变动则重新生成
        const processedTheme = el.getAttribute("data-rendered-theme");
        if (el.getAttribute("data-processed") === "true" && processedTheme === (isDark ? "dark" : "light")) {
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

        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}-${i}-${Date.now()}`;

        try {
          // 调用 Mermaid 核心引擎生成 SVG 矢量图
          const { svg } = await mermaid.render(uniqueId, rawCode);
          if (isCancelled) break;

          el.setAttribute("data-processed", "true");
          el.setAttribute("data-rendered-theme", isDark ? "dark" : "light");

          // 注入包装器与控制栏 (包含三模式切换、图表源码复制与全屏大图预览功能)
          el.setAttribute("data-chart-view", "preview");
          el.innerHTML = `
            <div class="mermaid-diagram-card">
              <div class="mermaid-diagram-toolbar">
                <div class="mermaid-view-toggle">
                  <button type="button" class="mermaid-toolbar-btn chart-view-btn" data-view="code" data-index="${i}" title="查看源代码">代码</button>
                  <button type="button" class="mermaid-toolbar-btn chart-view-btn active" data-view="preview" data-index="${i}" title="查看渲染预览">预览</button>
                  <button type="button" class="mermaid-toolbar-btn chart-view-btn" data-view="split" data-index="${i}" title="代码与预览分屏">分屏</button>
                </div>
                <div class="mermaid-toolbar-actions">
                  <button type="button" class="mermaid-toolbar-btn btn-copy" data-index="${i}" title="复制图表代码">
                    <span class="btn-icon">📋</span>
                    <span class="btn-text">复制</span>
                  </button>
                  <button type="button" class="mermaid-toolbar-btn btn-zoom" data-index="${i}" title="全画幅放大查看">
                    <span class="btn-icon">🔍</span>
                    <span class="btn-text">全屏</span>
                  </button>
                </div>
              </div>
              <div class="mermaid-content-panels">
                <div class="mermaid-code-panel">
                  <pre><code>${escapeHtml(rawCode)}</code></pre>
                </div>
                <div class="mermaid-svg-wrapper">
                  ${svg}
                </div>
              </div>
            </div>
          `;
        } catch (err: any) {
          if (isCancelled) break;
          console.warn("Mermaid diagram rendering error:", err);
          el.setAttribute("data-processed", "true");
          el.setAttribute("data-rendered-theme", isDark ? "dark" : "light");

          // 优雅错误降级处理：防止页面崩溃，清晰呈现语法错误提示与源代码
          el.innerHTML = `
            <div class="mermaid-error-card">
              <div class="mermaid-error-header">
                <span class="mermaid-error-icon">⚠️</span>
                <span class="mermaid-error-title">Mermaid 图表代码解析失败</span>
              </div>
              <div class="mermaid-error-msg">${escapeHtml(err?.message || "语法错误，请检查图表代码结构")}</div>
              <details class="mermaid-error-details" open>
                <summary>查看原始图表代码</summary>
                <pre class="mermaid-error-code"><code>${escapeHtml(rawCode)}</code></pre>
              </details>
            </div>
          `;
        }
      }
    };

    renderDiagrams();

    return () => {
      isCancelled = true;
    };
  }, [html, isDark]);

  // 同步更新代码块深色切换按钮的状态与提示文案
  useEffect(() => {
    if (!containerRef.current) return;
    const themeBtns = containerRef.current.querySelectorAll<HTMLElement>(".btn-code-theme");
    themeBtns.forEach((btn) => {
      const iconSpan = btn.querySelector(".theme-icon");
      const textSpan = btn.querySelector(".theme-text");
      if (forceCodeDark) {
        if (iconSpan) iconSpan.textContent = "🌙";
        if (textSpan) textSpan.textContent = "深色";
        btn.setAttribute("title", "切换深色模式");
      } else {
        if (iconSpan) iconSpan.textContent = "💡";
        if (textSpan) textSpan.textContent = "浅色";
        btn.setAttribute("title", "切换深色模式");
      }
    });
  }, [html, forceCodeDark]);

  // 代理点击事件：图片、图表、代码块按钮交互
  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // 1. 拦截代码块复制按钮
    const codeCopyBtn = target.closest(".code-block-action-btn.btn-code-copy") as HTMLElement | null;
    if (codeCopyBtn) {
      e.stopPropagation();
      let codeText = "";
      const dataCode = codeCopyBtn.getAttribute("data-code");
      if (dataCode) {
        try {
          codeText = decodeURIComponent(dataCode);
        } catch {
          codeText = dataCode;
        }
      } else {
        const codeWrapper = codeCopyBtn.closest(".code-block-wrapper");
        const codeTag = codeWrapper?.querySelector("code");
        codeText = codeTag?.textContent || "";
      }
      navigator.clipboard.writeText(codeText);
      const textSpan = codeCopyBtn.querySelector(".copy-text");
      if (textSpan) textSpan.textContent = "已复制";
      setTimeout(() => {
        if (textSpan) textSpan.textContent = "复制";
      }, 2000);
      return;
    }

    // 2. 拦截代码块切换深色模式按钮
    const codeThemeBtn = target.closest(".code-block-action-btn.btn-code-theme") as HTMLElement | null;
    if (codeThemeBtn) {
      e.stopPropagation();
      toggleForceCodeDark();
      return;
    }

    // 3. 拦截图表视图模式切换按钮
    const chartViewBtn = target.closest(".chart-view-btn") as HTMLElement | null;
    if (chartViewBtn) {
      e.stopPropagation();
      const viewMode = chartViewBtn.getAttribute("data-view") || "preview";
      const container = chartViewBtn.closest(".mermaid-diagram-container") as HTMLElement | null;
      if (container) {
        container.setAttribute("data-chart-view", viewMode);
        // 更新激活态按钮
        const allBtns = container.querySelectorAll(".chart-view-btn");
        allBtns.forEach((btn) => btn.classList.remove("active"));
        chartViewBtn.classList.add("active");
      }
      return;
    }

    // 4. 拦截图表工具条复制按钮
    const copyBtn = target.closest(".mermaid-toolbar-btn.btn-copy") as HTMLElement | null;
    if (copyBtn) {
      e.stopPropagation();
      const container = copyBtn.closest(".mermaid-diagram-container") as HTMLElement | null;
      if (container) {
        const rawCodeEncoded = container.getAttribute("data-mermaid") || "";
        const rawCode = decodeURIComponent(rawCodeEncoded);
        navigator.clipboard.writeText(rawCode);
        const textSpan = copyBtn.querySelector(".btn-text");
        if (textSpan) textSpan.textContent = "已复制";
        setTimeout(() => {
          if (textSpan) textSpan.textContent = "复制";
        }, 2000);
      }
      return;
    }

    // 5. 拦截图表全屏放大按钮
    const zoomBtn = target.closest(".mermaid-toolbar-btn.btn-zoom") as HTMLElement | null;
    if (zoomBtn) {
      e.stopPropagation();
      const container = zoomBtn.closest(".mermaid-diagram-container") as HTMLElement | null;
      const svgWrapper = container?.querySelector(".mermaid-svg-wrapper");
      if (svgWrapper) {
        setPreviewSvgContent(svgWrapper.innerHTML);
      }
      return;
    }

    // 6. 点击图表 SVG 区域触发放大预览
    const svgEl = target.closest(".mermaid-svg-wrapper");
    if (svgEl) {
      // 仅在非分屏/代码模式的预览区域才触发放大
      const diagramContainer = svgEl.closest(".mermaid-diagram-container") as HTMLElement | null;
      const currentView = diagramContainer?.getAttribute("data-chart-view");
      if (currentView === "preview") {
        setPreviewSvgContent(svgEl.innerHTML);
      }
      return;
    }

    // 7. 点击正文插图触发灯箱
    if (target.tagName === "IMG") {
      const img = target as HTMLImageElement;
      setPreviewImgSrc(img.src);
      setPreviewImgAlt(img.alt || "随笔插图预览");
    }
  };

  const closeLightbox = () => {
    setPreviewImgSrc(null);
    setPreviewSvgContent(null);
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`markdown-body ${className}`}
        style={style}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* 全屏高清图表 / 插图灯箱 — 使用 Portal 渲染到 body，跳出 Dialog 层叠上下文 */}
      {(previewImgSrc || previewSvgContent) && createPortal(
        <div
          className="image-lightbox-backdrop"
          onClick={closeLightbox}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.82)",
            backdropFilter: "blur(20px) saturate(140%)",
            WebkitBackdropFilter: "blur(20px) saturate(140%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "24px",
            boxSizing: "border-box",
            animation: "fuiDialogEnter 0.3s cubic-bezier(0.1, 0.9, 0.2, 1)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "20px",
              right: "24px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              zIndex: 10001,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip content="关闭大图预览 (Esc)" relationship="label">
              <Button
                appearance="subtle"
                icon={<Dismiss20Regular style={{ color: "#ffffff", fontSize: "20px" }} />}
                onClick={closeLightbox}
                aria-label="关闭预览"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.18)",
                  borderRadius: "50%",
                  width: "38px",
                  height: "38px",
                  minWidth: "38px",
                }}
              />
            </Tooltip>
          </div>

          {/* 若为 SVG 图表展示 */}
          {previewSvgContent ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="lightbox-svg-wrapper"
              style={{
                maxWidth: "94vw",
                maxHeight: "88vh",
                overflow: "auto",
                backgroundColor: isDark ? "rgba(26, 26, 34, 0.98)" : "rgba(255, 255, 255, 0.98)",
                borderRadius: "16px",
                padding: "36px 28px",
                boxShadow: "0 28px 80px rgba(0, 0, 0, 0.65)",
                border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              dangerouslySetInnerHTML={{ __html: previewSvgContent }}
            />
          ) : (
            /* 若为普通位图图片展示 */
            <>
              <img
                src={previewImgSrc!}
                alt={previewImgAlt}
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: "92vw",
                  maxHeight: "88vh",
                  objectFit: "contain",
                  borderRadius: "12px",
                  boxShadow: "0 24px 72px rgba(0, 0, 0, 0.6)",
                  transition: "transform 0.2s ease",
                }}
              />
              {previewImgAlt && previewImgAlt !== "图片" && (
                <div
                  style={{
                    marginTop: "14px",
                    color: "rgba(255, 255, 255, 0.85)",
                    fontSize: "14px",
                    fontWeight: 500,
                    textAlign: "center",
                    maxWidth: "80vw",
                  }}
                >
                  {previewImgAlt}
                </div>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
};
