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
    <div style={{ position: "relative", minHeight: "24px" }}>
      <MarkdownViewer content={content || (isStreaming ? "思考中..." : "")} />
      {isStreaming && <span className="ai-typing-cursor" title="生成中" />}
    </div>
  );
};
