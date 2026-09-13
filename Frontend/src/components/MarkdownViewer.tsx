import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppTheme } from "../context/ThemeContext";
import { markdownToHtml } from "../utils/markdownUtils";
import { renderMermaidDiagrams } from "../utils/markdownDiagrams";
import { ImageLightboxModal } from "./ImageLightboxModal";

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

  return (
    <>
      <div
        ref={containerRef}
        className={`markdown-body ${className}`}
        style={style}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <ImageLightboxModal
        open={Boolean(previewImgSrc || previewSvgContent)}
        onClose={closeLightbox}
        imageSrc={previewImgSrc}
        imageAlt={previewImgAlt}
        svgHtml={previewSvgContent}
      />
    </>
  );
};
