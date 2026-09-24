import React from "react";
import { MarkdownViewer } from "../MarkdownViewer";

interface TypewriterMarkdownProps {
  content: string;
  isStreaming?: boolean;
}

export const TypewriterMarkdown: React.FC<TypewriterMarkdownProps> = ({
  content,
  isStreaming = false,
}) => {
  return (
    <div
      className={`gemini-streaming-text-wrap ${isStreaming ? "is-streaming" : ""}`}
      style={{
        position: "relative",
        minHeight: "24px",
        lineHeight: "1.75",
        fontSize: "14.5px",
        letterSpacing: "0.01em",
      }}
    >
      <MarkdownViewer
        content={content || (isStreaming ? "" : "")}
        className={isStreaming ? "gemini-streaming-body" : ""}
      />
      {isStreaming && (
        <span
          className="gemini-typing-pulse"
          title="生成中..."
          aria-label="生成中"
        />
      )}
    </div>
  );
};

