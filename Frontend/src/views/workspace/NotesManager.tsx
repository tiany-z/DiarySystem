import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Body1,
  Body1Strong,
  Button,
  Caption1,
  Card,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Divider,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Subtitle1,
  Tab,
  TabList,
  Title2,
  Title3,
  Tooltip,
} from "@fluentui/react-components";
import {
  Add20Filled,
  Delete20Regular,
  Dismiss20Regular,
  Document24Regular,
  Edit20Regular,
  Grid20Regular,
  List20Regular,
  Globe20Regular,
  LockClosed20Regular,
  Search20Regular,
  Sparkle20Regular,
  WeatherSunny20Regular,
} from "@fluentui/react-icons";
import { diaryApi, DiaryItem } from "../../api/diary";
import { MoodBadge } from "../../components/MoodBadge";
import { formatDate, NoteCard, extractFirstImage } from "../../components/NoteCard";
import { WeatherBadge } from "../../components/WeatherBadge";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";

export const NotesManager: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const navigate = useNavigate();

  const [notes, setNotes] = useState<DiaryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // 删除对话框状态
  const [deleteTarget, setDeleteTarget] = useState<DiaryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchNotes = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await diaryApi.list();
      if (res.status === 1 && res.data) {
        setNotes(res.data);
      } else {
        setErrorMsg(res.content || "加载日记列表失败");
      }
    } catch (err: any) {
      setErrorMsg(`网络请求错误: ${err.message || String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await diaryApi.delete(deleteTarget.id);
      if (res.status === 1) {
        setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        alert(res.content || "删除日记失败");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // 切换日记公开/私密状态
  const handleTogglePublic = async (diary: DiaryItem) => {
    const currentPublic = diary.is_public !== 0 && diary.is_public !== false;
    const nextPublic = !currentPublic;
    try {
      const res = await diaryApi.update({
        id: diary.id,
        is_public: nextPublic ? 1 : 0,
      });
      if (res.status === 1) {
        setNotes((prev) =>
          prev.map((item) =>
            item.id === diary.id ? { ...item, is_public: nextPublic ? 1 : 0 } : item
          )
        );
      } else {
        alert(res.content || "更新日记可见性失败");
      }
    } catch (err: any) {
      alert(`更新日记可见性失败: ${err.message || String(err)}`);
    }
  };

  // 过滤笔记 (安全空指针防护)
  const filteredNotes = notes.filter((n) => {
    const q = searchQuery.toLowerCase().trim();
    const titleMatch = (n.title || "").toLowerCase().includes(q);
    const contentMatch = (n.content || "").toLowerCase().includes(q);
    const matchSearch = !q || titleMatch || contentMatch;
    const matchMood =
      selectedMood === "all" || (n.mood || "").toLowerCase() === selectedMood.toLowerCase();
    return matchSearch && matchMood;
  });

  // 统计数据 (安全空指针防护)
  const sunnyCount = notes.filter((n) => (n.weather || "").toLowerCase() === "sunny").length;
  const happyCount = notes.filter((n) => {
    const m = (n.mood || "").toLowerCase();
    return m === "happy" || m === "excited";
  }).length;

  return (
    <div
      className="workspace-page-container"
      style={{
        width: "100%",
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "32px 24px 80px 24px",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      {/* Header Info Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <Title2 style={{ fontWeight: 800 }}>我的笔记</Title2>

        <Button
          appearance="primary"
          icon={<Add20Filled />}
          onClick={() => navigate("/workspace/new")}
          style={{
            background: "linear-gradient(135deg, #0078d4, #005a9e)",
            borderRadius: "8px",
            fontWeight: 600,
          }}
        >
          新建
        </Button>
      </div>

      {/* Metric Cards */}
      <div
        className="workspace-metric-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <Card
          style={{
            padding: "18px 20px",
            borderRadius: "14px",
            backgroundColor: isDark ? "#202026" : "#ffffff",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: isDark ? "0 4px 14px rgba(0, 0, 0, 0.2)" : "0 2px 12px rgba(0, 120, 212, 0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(0, 120, 212, 0.12)",
                color: "#0078d4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Document24Regular />
            </div>
            <div>
              <Caption1 style={{ opacity: 0.65 }}>总数</Caption1>
              <Title3 style={{ fontWeight: 700, display: "block" }}>{notes.length}</Title3>
            </div>
          </div>
        </Card>

        <Card
          style={{
            padding: "18px 20px",
            borderRadius: "14px",
            backgroundColor: isDark ? "#202026" : "#ffffff",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: isDark ? "0 4px 14px rgba(0, 0, 0, 0.2)" : "0 2px 12px rgba(0, 120, 212, 0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(243, 156, 18, 0.12)",
                color: "#f39c12",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <WeatherSunny20Regular />
            </div>
            <div>
              <Caption1 style={{ opacity: 0.65 }}>晴朗</Caption1>
              <Title3 style={{ fontWeight: 700, display: "block" }}>{sunnyCount}</Title3>
            </div>
          </div>
        </Card>

        <Card
          style={{
            padding: "18px 20px",
            borderRadius: "14px",
            backgroundColor: isDark ? "#202026" : "#ffffff",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: isDark ? "0 4px 14px rgba(0, 0, 0, 0.2)" : "0 2px 12px rgba(0, 120, 212, 0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(46, 204, 113, 0.12)",
                color: "#2ecc71",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkle20Regular />
            </div>
            <div>
              <Caption1 style={{ opacity: 0.65 }}>积极</Caption1>
              <Title3 style={{ fontWeight: 700, display: "block" }}>{happyCount}</Title3>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar & Filters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        {/* Mood Tabs */}
        <div className="responsive-tablist-wrapper">
          <TabList
            size="large"
            selectedValue={selectedMood}
            onTabSelect={(_, data) => setSelectedMood(String(data.value))}
          >
            <Tab value="all">全部</Tab>
            <Tab value="Happy">欢喜 ✨</Tab>
            <Tab value="Peaceful">宁静 🌿</Tab>
            <Tab value="Excited">充沛 🔥</Tab>
            <Tab value="Thinking">沉思 💡</Tab>
            <Tab value="Tired">倦怠 🌙</Tab>
          </TabList>
        </div>

        {/* Search & View Mode */}
        <div className="responsive-search-box" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Input
            contentBefore={<Search20Regular />}
            placeholder="搜索..."
            value={searchQuery}
            onChange={(_, data) => setSearchQuery(data.value)}
            style={{ flex: 1 }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            <Tooltip content="网格视图" relationship="label">
              <Button
                appearance={viewMode === "grid" ? "primary" : "subtle"}
                icon={<Grid20Regular />}
                onClick={() => setViewMode("grid")}
                size="small"
                aria-label="网格视图"
              />
            </Tooltip>
            <Tooltip content="列表视图" relationship="label">
              <Button
                appearance={viewMode === "list" ? "primary" : "subtle"}
                icon={<List20Regular />}
                onClick={() => setViewMode("list")}
                size="small"
                aria-label="列表视图"
              />
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <MessageBar intent="error" style={{ marginBottom: "20px" }}>
          <MessageBarBody>{errorMsg}</MessageBarBody>
        </MessageBar>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
          <Spinner label="加载中..." size="medium" />
        </div>
      ) : filteredNotes.length === 0 ? (
        /* Empty State */
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            borderRadius: "16px",
            border: "1px dashed rgba(128, 128, 128, 0.25)",
            background: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
          }}
        >
          <Document24Regular style={{ fontSize: "44px", opacity: 0.4, marginBottom: "12px" }} />
          <Title3 style={{ fontWeight: 600, display: "block" }}>
            {notes.length === 0 ? "暂无笔记" : "未找到匹配项"}
          </Title3>
          <Body1 style={{ opacity: 0.65, marginTop: "6px", marginBottom: "20px", display: "block", fontSize: "13px" }}>
            {notes.length === 0
              ? "开启第一篇 Markdown 灵感随笔吧。"
              : "尝试清空搜索关键字。"}
          </Body1>
          {notes.length === 0 && (
            <Button
              appearance="primary"
              icon={<Add20Filled />}
              onClick={() => navigate("/workspace/new")}
              style={{ borderRadius: "8px" }}
            >
              新建笔记
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div
          className="responsive-card-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
            gap: "20px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              diary={note}
              showActions={true}
              onClick={() => navigate(`/workspace/edit/${note.id}`)}
              onEdit={() => navigate(`/workspace/edit/${note.id}`)}
              onDelete={() => setDeleteTarget(note)}
              onTogglePublic={() => handleTogglePublic(note)}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredNotes.map((note) => (
            <Card
              key={note.id}
              className="hover-lift"
              onClick={() => navigate(`/workspace/edit/${note.id}`)}
              style={{
                cursor: "pointer",
                padding: "18px 24px",
                borderRadius: "14px",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: isDark ? "#202026" : "#ffffff",
                border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
                boxShadow: isDark ? "0 4px 14px rgba(0, 0, 0, 0.2)" : "0 2px 10px rgba(0, 120, 212, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                {extractFirstImage(note.content) && (
                  <img
                    src={extractFirstImage(note.content)!}
                    alt="封面"
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "8px",
                      objectFit: "cover",
                      flexShrink: 0,
                      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  <Body1Strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {note.title || "无标题日记"}
                  </Body1Strong>
                  <Caption1 style={{ opacity: 0.6 }}>{formatDate(note.created_at)}</Caption1>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px" }} onClick={(e) => e.stopPropagation()}>
                <WeatherBadge weather={note.weather} />
                <MoodBadge mood={note.mood} />

                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Tooltip
                    content={note.is_public !== 0 && note.is_public !== false ? "公开可见 (点击设为私密)" : "私密笔记 (点击公开到广场)"}
                    relationship="label"
                  >
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={
                        note.is_public !== 0 && note.is_public !== false ? (
                          <Globe20Regular style={{ color: "#0078d4" }} />
                        ) : (
                          <LockClosed20Regular style={{ color: "#8a8886" }} />
                        )
                      }
                      onClick={() => handleTogglePublic(note)}
                      aria-label="切换公开状态"
                    />
                  </Tooltip>
                  <Tooltip content="编辑" relationship="label">
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<Edit20Regular />}
                      onClick={() => navigate(`/workspace/edit/${note.id}`)}
                    />
                  </Tooltip>
                  <Tooltip content="删除" relationship="label">
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<Delete20Regular style={{ color: "#e74c3c" }} />}
                      onClick={() => setDeleteTarget(note)}
                    />
                  </Tooltip>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(_, data) => !data.open && setDeleteTarget(null)}
      >
        <DialogSurface
          backdrop={{
            style: {
              backdropFilter: "blur(12px) saturate(135%)",
              WebkitBackdropFilter: "blur(12px) saturate(135%)",
              backgroundColor: isDark ? "rgba(0, 0, 0, 0.55)" : "rgba(15, 23, 42, 0.4)",
            },
          }}
          style={{
            maxWidth: "420px",
            width: "90vw",
            borderRadius: "16px",
            padding: "24px",
            backgroundColor: isDark ? "rgba(28, 28, 35, 0.95)" : "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: isDark
              ? "0 28px 72px rgba(0, 0, 0, 0.65), 0 6px 24px rgba(0, 0, 0, 0.4)"
              : "0 24px 64px rgba(0, 0, 0, 0.22), 0 4px 18px rgba(0, 0, 0, 0.08)",
          }}
        >
          <DialogBody style={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <div className="dialog-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "16px" }}>
              <div className="dialog-header-title" style={{ flex: 1, minWidth: 0 }}>
                <DialogTitle style={{ padding: 0, margin: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Delete20Regular style={{ color: "#d13438" }} />
                    <Title3 style={{ fontWeight: 600, fontSize: "18px" }}>
                      删除笔记
                    </Title3>
                  </div>
                </DialogTitle>
              </div>
              <Tooltip content="关闭" relationship="label">
                <Button
                  className="dialog-close-btn"
                  appearance="subtle"
                  icon={<Dismiss20Regular />}
                  onClick={() => setDeleteTarget(null)}
                  aria-label="关闭"
                  style={{ marginLeft: "auto", flexShrink: 0 }}
                />
              </Tooltip>
            </div>

            <DialogContent style={{ display: "flex", flexDirection: "column", gap: "14px", padding: 0 }}>
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "8px",
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "14px",
                    color: isDark ? "#f4f4f5" : "#0f172a",
                    marginBottom: "4px",
                    wordBreak: "break-word",
                  }}
                >
                  {deleteTarget?.title || "无标题日记"}
                </div>
                {deleteTarget && (
                  <Caption1 style={{ opacity: 0.65 }}>
                    {formatDate(deleteTarget.created_at)}
                  </Caption1>
                )}
              </div>
              <Caption1 style={{ color: isDark ? "#f87171" : "#dc2626", fontSize: "12.5px" }}>
                此操作将永久移除该篇日记，且不可撤销。
              </Caption1>
            </DialogContent>

            {/* Footer Actions - 原生 Fluent 2 按钮，无多余线条 */}
            <DialogActions style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px", padding: 0 }}>
              <Button appearance="secondary" onClick={() => setDeleteTarget(null)}>
                取消
              </Button>
              <Button
                appearance="primary"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                style={{
                  backgroundColor: "#d13438",
                  color: "#ffffff",
                }}
              >
                {isDeleting ? "正在删除..." : "确认删除"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
