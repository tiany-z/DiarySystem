import React, { useState, useMemo } from "react";
import {
  Add20Regular,
  Search20Regular,
  Pin20Filled,
  Pin20Regular,
  Edit20Regular,
  Delete20Regular,
  Checkmark20Regular,
  Dismiss20Regular,
  Chat20Regular,
} from "@fluentui/react-icons";
import { AiConversation } from "../../api/ai";
import { useAppTheme } from "../../context/ThemeContext";

interface ConversationSidebarProps {
  conversations: AiConversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onDeleteConversation: (id: string) => void;
  onCloseMobile?: () => void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onTogglePin,
  onDeleteConversation,
  onCloseMobile,
}) => {
  const { isDark } = useAppTheme();
  const [keyword, setKeyword] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 1. 本地搜索过滤
  const filteredList = useMemo(() => {
    if (!keyword.trim()) return conversations;
    const lower = keyword.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(lower));
  }, [conversations, keyword]);

  // 2. 时间智能分组算法
  const grouped = useMemo(() => {
    const pinned: AiConversation[] = [];
    const today: AiConversation[] = [];
    const yesterday: AiConversation[] = [];
    const last7Days: AiConversation[] = [];
    const older: AiConversation[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (const c of filteredList) {
      if (c.isPinned) {
        pinned.push(c);
        continue;
      }

      const updateTime = new Date(c.updatedAt || c.createdAt).getTime();
      const diffDays = Math.floor((todayStart - updateTime) / oneDayMs);

      if (updateTime >= todayStart) {
        today.push(c);
      } else if (diffDays === 0 || diffDays === 1) {
        yesterday.push(c);
      } else if (diffDays <= 7) {
        last7Days.push(c);
      } else {
        older.push(c);
      }
    }

    return [
      { key: "pinned", label: "置顶", items: pinned },
      { key: "today", label: "今天", items: today },
      { key: "yesterday", label: "昨天", items: yesterday },
      { key: "last7Days", label: "7 天内", items: last7Days },
      { key: "older", label: "更早", items: older },
    ].filter((g) => g.items.length > 0);
  }, [filteredList]);

  const handleStartRename = (c: AiConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleConfirmRename = (id: string, e?: React.FormEvent) => {
    e?.preventDefault();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleConfirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteConversation(id);
    setDeletingId(null);
  };

  return (
    <div
      className="ai-sidebar-acrylic"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        userSelect: "none",
      }}
    >
      {/* 顶部操作区 */}
      <div className="win10-tile-rise win10-delay-1" style={{ padding: "16px 14px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => {
              onNewChat();
              onCloseMobile?.();
            }}
            style={{
              flex: 1,
              height: "38px",
              borderRadius: "10px",
              backgroundColor: "#5B7B8D",
              color: "#ffffff",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(91, 123, 141, 0.25)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#4d6b7c")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#5B7B8D")}
          >
            <Add20Regular style={{ fontSize: "18px" }} />
            新建对话
          </button>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              title="关闭"
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.1)",
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
                color: isDark ? "#cbd5e0" : "#718096",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Dismiss20Regular style={{ fontSize: "18px" }} />
            </button>
          )}
        </div>

        {/* 搜索框 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: "10px",
            padding: "0 10px",
            height: "32px",
            borderRadius: "8px",
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.06)",
          }}
        >
          <Search20Regular style={{ fontSize: "14px", color: isDark ? "#718096" : "#a0aec0", marginRight: "6px" }} />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索对话"
            style={{
              border: "none",
              outline: "none",
              backgroundColor: "transparent",
              fontSize: "12px",
              width: "100%",
              color: isDark ? "#f7fafc" : "#2d3748",
            }}
          />
          {keyword && (
            <Dismiss20Regular
              onClick={() => setKeyword("")}
              style={{ fontSize: "14px", color: isDark ? "#718096" : "#a0aec0", cursor: "pointer" }}
            />
          )}
        </div>
      </div>

      {/* 会话时间分组滚动列表 */}
      <div
        className="win10-stagger-grid"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 8px 16px",
        }}
      >
        {grouped.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 10px",
              color: isDark ? "#718096" : "#a0aec0",
              fontSize: "13px",
            }}
          >
            {keyword ? "无匹配对话" : "暂无对话"}
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.key} style={{ marginBottom: "14px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: isDark ? "#718096" : "#8a9ba8",
                  padding: "4px 10px",
                  letterSpacing: "0.5px",
                }}
              >
                {group.label}
              </div>

              {group.items.map((c) => {
                const isSelected = c.id === activeId;
                const isEditing = c.id === editingId;
                const isDeleting = c.id === deletingId;

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (!isEditing && !isDeleting) {
                        onSelectConversation(c.id);
                        onCloseMobile?.();
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      margin: "2px 0",
                      borderRadius: "8px",
                      backgroundColor: isSelected
                        ? (isDark ? "rgba(91, 123, 141, 0.28)" : "rgba(91, 123, 141, 0.16)")
                        : "transparent",
                      borderLeft: isSelected
                        ? "3px solid #5B7B8D"
                        : "3px solid transparent",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {/* 正常展示或重命名输入态 */}
                    {isEditing ? (
                      <form
                        onSubmit={(e) => handleConfirmRename(c.id, e)}
                        style={{ display: "flex", alignItems: "center", width: "100%", gap: "4px" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          autoFocus
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          style={{
                            flex: 1,
                            fontSize: "12px",
                            padding: "3px 6px",
                            borderRadius: "4px",
                            border: "1px solid #5B7B8D",
                            outline: "none",
                            backgroundColor: isDark ? "#1a202c" : "#ffffff",
                            color: isDark ? "#f7fafc" : "#2d3748",
                          }}
                        />
                        <button
                          type="submit"
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            color: "#38a169",
                            padding: "2px",
                          }}
                        >
                          <Checkmark20Regular style={{ fontSize: "15px" }} />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            color: "#e53e3e",
                            padding: "2px",
                          }}
                        >
                          <Dismiss20Regular style={{ fontSize: "15px" }} />
                        </button>
                      </form>
                    ) : isDeleting ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          fontSize: "12px",
                          color: "#e53e3e",
                        }}
                      >
                        <span>确认删除？</span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={(e) => handleConfirmDelete(c.id, e)}
                            style={{
                              border: "none",
                              backgroundColor: "#e53e3e",
                              color: "#fff",
                              borderRadius: "4px",
                              padding: "2px 6px",
                              fontSize: "11px",
                              cursor: "pointer",
                            }}
                          >
                            确定
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(null);
                            }}
                            style={{
                              border: isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid #ccc",
                              backgroundColor: isDark ? "#2d3748" : "#fff",
                              color: isDark ? "#e2e8f0" : "#4a5568",
                              borderRadius: "4px",
                              padding: "2px 6px",
                              fontSize: "11px",
                              cursor: "pointer",
                            }}
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <Chat20Regular
                            style={{
                              fontSize: "15px",
                              color: isSelected ? "#5B7B8D" : (isDark ? "#718096" : "#8a9ba8"),
                              flexShrink: 0,
                            }}
                          />
                          <span
                            title={c.title}
                            onDoubleClick={(e) => handleStartRename(c, e)}
                            style={{
                              fontSize: "13px",
                              color: isSelected ? (isDark ? "#ffffff" : "#2d3748") : (isDark ? "#cbd5e0" : "#4a5568"),
                              fontWeight: isSelected ? 600 : 400,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {c.title}
                          </span>
                        </div>

                        {/* 右侧浮动操作组 */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            marginLeft: "6px",
                            flexShrink: 0,
                          }}
                        >
                          {/* 置顶按钮 */}
                          <button
                            title={c.isPinned ? "取消置顶" : "置顶"}
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePin(c.id, !c.isPinned);
                            }}
                            style={{
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              color: c.isPinned ? "#d69e2e" : "#a0aec0",
                              padding: "2px",
                              display: c.isPinned || isSelected ? "flex" : "none",
                            }}
                          >
                            {c.isPinned ? (
                              <Pin20Filled style={{ fontSize: "14px" }} />
                            ) : (
                              <Pin20Regular style={{ fontSize: "14px" }} />
                            )}
                          </button>

                          {/* 重命名按钮 */}
                          <button
                            title="重命名"
                            onClick={(e) => handleStartRename(c, e)}
                            style={{
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              color: "#a0aec0",
                              padding: "2px",
                              display: isSelected ? "flex" : "none",
                            }}
                          >
                            <Edit20Regular style={{ fontSize: "14px" }} />
                          </button>

                          {/* 删除按钮 */}
                          <button
                            title="删除"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(c.id);
                            }}
                            style={{
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              color: "#a0aec0",
                              padding: "2px",
                              display: isSelected ? "flex" : "none",
                            }}
                          >
                            <Delete20Regular style={{ fontSize: "14px" }} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
