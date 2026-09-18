import React, { useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { NotesManager } from "./NotesManager";
import { MarkdownStudio } from "./MarkdownStudio";

/**
 * 个人笔记与编辑器一体化调度容器 (Keep-Alive)
 * 
 * 核心设计：
 * 1. 我的笔记主列表 (NotesManager) 在整个工作台生命周期中始终保持挂载，
 *    当进入编辑器 (/workspace/new 或 /workspace/edit/:id) 时，使用 opacity: 0; pointer-events: none; visibility: hidden; 隐藏，
 *    绝不使用 display: none 或销毁组件，彻底保持真实 DOM 结构与滚动位置！
 * 2. 编辑器 (MarkdownStudio) 以 fixed 浮层形式呈现在视口上，绝不干扰外层文档流与滚动条。
 * 3. 离开编辑器返回列表时，无缝瞬间恢复之前保存的滚动位置，达到 0 延迟、0 闪烁、0 重新加载的极致体验。
 */
export const WorkspaceView: React.FC = () => {
  const location = useLocation();
  const isEditorOpen =
    location.pathname === "/workspace/new" ||
    location.pathname.startsWith("/workspace/edit/");

  const savedScrollYRef = useRef<number>(0);
  const wasEditorOpenRef = useRef<boolean>(isEditorOpen);

  // 当处于列表界面时，实时跟踪并记录滚动位置
  useEffect(() => {
    if (!isEditorOpen) {
      const handleScroll = () => {
        const currentScroll =
          window.scrollY ||
          document.documentElement.scrollTop ||
          document.body.scrollTop ||
          0;
        savedScrollYRef.current = currentScroll;
      };
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [isEditorOpen]);

  // 从编辑器返回列表时，恢复之前保存的精确滚动位置
  useEffect(() => {
    if (wasEditorOpenRef.current && !isEditorOpen) {
      const targetScroll = savedScrollYRef.current;
      if (targetScroll > 0) {
        window.scrollTo({
          top: targetScroll,
          left: 0,
          behavior: "instant" as ScrollBehavior,
        });
        document.documentElement.scrollTop = targetScroll;
        document.body.scrollTop = targetScroll;

        requestAnimationFrame(() => {
          window.scrollTo({
            top: targetScroll,
            left: 0,
            behavior: "instant" as ScrollBehavior,
          });
          document.documentElement.scrollTop = targetScroll;
          document.body.scrollTop = targetScroll;
        });
      }
    }
    wasEditorOpenRef.current = isEditorOpen;
  }, [isEditorOpen]);

  return (
    <div
      className="workspace-flow-wrapper"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100%",
      }}
    >
      {/* 1. 我的文档列表界面：始终常驻，仅在切入编辑器时使用 opacity: 0 与 pointer-events: none / visibility: hidden 隐藏，
          绝对不使用 display: none，彻底保留真实 DOM 结构与滚动条几何位置 */}
      <div
        className="workspace-notes-keeper"
        style={{
          opacity: isEditorOpen ? 0 : 1,
          pointerEvents: isEditorOpen ? "none" : "auto",
          visibility: isEditorOpen ? "hidden" : "visible",
          transition: "opacity 0.15s ease",
          width: "100%",
        }}
      >
        <NotesManager />
      </div>

      {/* 2. Markdown 编辑器宿主：在 fixed 全屏容器中呈现，覆盖在视口上，绝不破坏外层列表的任何滚动位置 */}
      {isEditorOpen && (
        <div
          className="workspace-editor-overlay-host"
          style={{
            position: "fixed",
            top: "var(--header-height, 64px)",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            height: "calc(100vh - var(--header-height, 64px))",
            overflow: "hidden",
          }}
        >
          <MarkdownStudio />
        </div>
      )}
    </div>
  );
};

export default WorkspaceView;
