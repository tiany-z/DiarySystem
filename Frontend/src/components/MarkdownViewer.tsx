import React, { useMemo, useState } from "react";
import { Button, Tooltip } from "@fluentui/react-components";
import { Dismiss20Regular } from "@fluentui/react-icons";
import { markdownToHtml } from "../utils/markdownUtils";

interface MarkdownViewerProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className = "", style }) => {
  const [previewImgSrc, setPreviewImgSrc] = useState<string | null>(null);
  const [previewImgAlt, setPreviewImgAlt] = useState<string>("");

  const html = useMemo(() => {
    if (!content) return "<p style='opacity: 0.5;'>暂无正文内容...</p>";
    return markdownToHtml(content);
  }, [content]);

  // 点击正文中的图片触发全画幅高清预览
  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      const img = target as HTMLImageElement;
      setPreviewImgSrc(img.src);
      setPreviewImgAlt(img.alt || "随笔插图预览");
    }
  };

  return (
    <>
      <div
        className={`markdown-body ${className}`}
        style={style}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* 全屏高清图片灯箱 (Fluent 2 亚克力毛玻璃拟态) */}
      {previewImgSrc && (
        <div
          className="image-lightbox-backdrop"
          onClick={() => setPreviewImgSrc(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(16px) saturate(140%)",
            WebkitBackdropFilter: "blur(16px) saturate(140%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "24px",
            boxSizing: "border-box",
            animation: "fuiDialogEnter 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
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
            <Tooltip content="关闭预览 (Esc)" relationship="label">
              <Button
                appearance="subtle"
                icon={<Dismiss20Regular style={{ color: "#ffffff", fontSize: "20px" }} />}
                onClick={() => setPreviewImgSrc(null)}
                aria-label="关闭预览"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  minWidth: "36px",
                }}
              />
            </Tooltip>
          </div>

          <img
            src={previewImgSrc}
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
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: "14px",
                fontWeight: 500,
                textAlign: "center",
                maxWidth: "80vw",
              }}
            >
              {previewImgAlt}
            </div>
          )}
        </div>
      )}
    </>
  );
};
