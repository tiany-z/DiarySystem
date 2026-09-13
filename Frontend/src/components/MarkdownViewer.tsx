import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Tooltip } from "@fluentui/react-components";
import { Dismiss20Regular } from "@fluentui/react-icons";
import { useAppTheme } from "../context/ThemeContext";
import { markdownToHtml } from "../utils/markdownUtils";
import { renderMermaidDiagrams } from "../utils/markdownDiagrams";

interface MarkdownViewerProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
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

  // 当 HTML 结构或当前主题模式改变时，调度 Mermaid 矢量图表异步渲染引擎
  useEffect(() => {
    let isCancelled = false;

    const runDiagramRender = async () => {
      if (!containerRef.current || isCancelled) return;
      await renderMermaidDiagrams(containerRef.current, isDark, (svgHtml) => {
        setPreviewSvgContent(svgHtml);
      });
    };

    runDiagramRender();

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
        btn.setAttribute("title", "切换浅色模式");
      } else {
        if (iconSpan) iconSpan.textContent = "💡";
        if (textSpan) textSpan.textContent = "浅色";
        btn.setAttribute("title", "切换深色模式");
      }
    });
  }, [html, forceCodeDark]);

  // 全屏灯箱开启时监听 Esc 键快速关闭
  useEffect(() => {
    if (!previewImgSrc && !previewSvgContent) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewImgSrc(null);
        setPreviewSvgContent(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewImgSrc, previewSvgContent]);

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

    // 3. 点击图表本身也可以直接触发全屏放大预览
    const svgEl = target.closest(".mermaid-svg-wrapper");
    if (svgEl && !target.closest(".mermaid-diagram-toolbar")) {
      setPreviewSvgContent(svgEl.innerHTML);
      return;
    }

    // 4. 点击正文插图触发全屏灯箱
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

  // 全网页全屏高清灯箱：突破任意父级 Dialog 容器的 containing-block 阻断，直接 Portal 至 document.body
  const renderLightbox = () => {
    if (!previewImgSrc && !previewSvgContent) return null;
    if (typeof document === "undefined") return null;

    return createPortal(
      <div
        className="image-lightbox-portal"
        onClick={closeLightbox}
        style={{
          position: "fixed",
          inset: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100dvh",
          backgroundColor: "rgba(0, 0, 0, 0.86)",
          backdropFilter: "blur(20px) saturate(140%)",
          WebkitBackdropFilter: "blur(20px) saturate(140%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "24px",
          boxSizing: "border-box",
          animation: "fuiDialogEnter 0.25s cubic-bezier(0.1, 0.9, 0.2, 1)",
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
            zIndex: 1000000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip content="关闭全屏预览" relationship="label">
            <Button
              appearance="subtle"
              icon={<Dismiss20Regular style={{ color: "#ffffff", fontSize: "20px" }} />}
              onClick={closeLightbox}
              aria-label="关闭预览"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                minWidth: "40px",
              }}
            />
          </Tooltip>
        </div>

        {/* 若为 SVG 图表全屏展示 */}
        {previewSvgContent ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="lightbox-svg-wrapper"
            style={{
              maxWidth: "95vw",
              maxHeight: "90vh",
              overflow: "auto",
              backgroundColor: isDark ? "rgba(26, 26, 34, 0.98)" : "rgba(255, 255, 255, 0.98)",
              borderRadius: "16px",
              padding: "40px 32px",
              boxShadow: "0 28px 80px rgba(0, 0, 0, 0.75)",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            dangerouslySetInnerHTML={{ __html: previewSvgContent }}
          />
        ) : (
          /* 若为普通位图图片全屏展示 */
          <>
            <img
              src={previewImgSrc!}
              alt={previewImgAlt}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "94vw",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "12px",
                boxShadow: "0 28px 80px rgba(0, 0, 0, 0.75)",
                transition: "transform 0.2s ease",
              }}
            />
            {previewImgAlt && previewImgAlt !== "图片" && (
              <div
                style={{
                  marginTop: "14px",
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "14px",
                  fontWeight: 500,
                  textAlign: "center",
                  maxWidth: "80vw",
                  textShadow: "0 2px 4px rgba(0, 0, 0, 0.8)",
                }}
              >
                {previewImgAlt}
              </div>
            )}
          </>
        )}
      </div>,
      document.body
    );
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
      {renderLightbox()}
    </>
  );
};
