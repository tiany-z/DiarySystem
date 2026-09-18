import React, { useEffect, useRef, useState, useMemo } from "react";
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
  ArrowReset20Regular,
  ArrowUpload20Regular,
  Delete20Regular,
  Dismiss20Regular,
  Document24Regular,
  Edit20Regular,
  Grid20Regular,
  List20Regular,
  Globe20Regular,
  LockClosed20Regular,
  Search20Regular,
  Search24Regular,
  Sparkle20Regular,
  WeatherSunny20Regular,
} from "@fluentui/react-icons";
import { diaryApi, DiaryItem } from "../../api/diary";
import { MoodBadge, getAllMoods } from "../../components/MoodBadge";
import { formatDate, NoteCard, extractFirstImage } from "../../components/NoteCard";
import { WeatherBadge } from "../../components/WeatherBadge";
import { MarkdownImportModal } from "../../components/MarkdownImportModal";
import { Win10AnimatedGrid } from "../../components/Win10AnimatedGrid";
import { useAuth } from "../../context/AuthContext";
import { usePageCache } from "../../context/PageCacheContext";
import { useAppTheme } from "../../context/ThemeContext";
import { useAppDialogMotion } from "../../utils/dialogMotion";

export const NotesManager: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const { surfaceMotion, backdropMotion, isMobile } = useAppDialogMotion();
  const navigate = useNavigate();

  const { hasPageLoaded, markPageLoaded, getCachedData, setCachedData } = usePageCache();
  const PAGE_KEY = "workspace_notes";
  const alreadyLoaded = hasPageLoaded(PAGE_KEY);
  const cachedNotes = getCachedData<DiaryItem[]>(PAGE_KEY);

  const [notes, setNotes] = useState<DiaryItem[]>(cachedNotes || []);
  const [isPageLoading, setIsPageLoading] = useState<boolean>(!alreadyLoaded || cachedNotes === null);
  const [shouldAnimate, setShouldAnimate] = useState<boolean>(!alreadyLoaded);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("all");
  const [customMoodVersion, setCustomMoodVersion] = useState(0);

  // 监听用户自定义心情库变动，保持分类标签实时同步
  useEffect(() => {
    const handleUpdate = () => setCustomMoodVersion((v) => v + 1);
    window.addEventListener("mood:custom_updated", handleUpdate);
    return () => window.removeEventListener("mood:custom_updated", handleUpdate);
  }, []);

  // 动态融合系统预设、用户本地自定义以及该用户所有日记中实际出现的分类
  const moodTabs = useMemo(() => {
    return getAllMoods(notes);
  }, [notes, customMoodVersion]);
  const [viewMode, setViewModeState] = useState<"grid" | "list">(() => {
    try {
      const saved = localStorage.getItem("diary_notes_view_mode");
      return saved === "list" ? "list" : "grid";
    } catch {
      return "grid";
    }
  });

  const setViewMode = (mode: "grid" | "list") => {
    setViewModeState(mode);
    try {
      localStorage.setItem("diary_notes_view_mode", mode);
    } catch {}
  };

  // 删除对话框状态
  const [deleteTarget, setDeleteTarget] = useState<DiaryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const lastDeleteTargetRef = useRef<DiaryItem | null>(deleteTarget);
  if (deleteTarget) {
    lastDeleteTargetRef.current = deleteTarget;
  }
  const activeDeleteTarget = deleteTarget || lastDeleteTargetRef.current;

  // Markdown 批量导入对话框状态
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);

  const fetchNotes = async (isSilent: boolean = false) => {
    if (!isSilent) {
      setIsPageLoading(true);
      setErrorMsg(null);
    }
    try {
      const res = await diaryApi.list();
      if (res.status === 1 && res.data) {
        setNotes(res.data);
        setCachedData(PAGE_KEY, res.data);
      } else if (!isSilent) {
        setErrorMsg(res.content || "加载日记列表失败");
      }
    } catch (err: any) {
      if (!isSilent) {
        setErrorMsg(`网络请求错误: ${err.message || String(err)}`);
      }
    } finally {
      if (!isSilent) {
        setIsPageLoading(false);
        markPageLoaded(PAGE_KEY);
      }
    }
  };

  useEffect(() => {
    if (alreadyLoaded && cachedNotes !== null) {
      // 页面加载过之后：不显示全屏转圈，不重复动画，后台静默调用一次数据更新直接展示最新数据
      setShouldAnimate(false);
      fetchNotes(true);
    } else {
      // 首次进入：居中转圈，完成后动画显示
      fetchNotes(false);
    }
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await diaryApi.delete(deleteTarget.id);
      if (res.status === 1) {
        setNotes((prev) => {
          const updated = prev.filter((n) => n.id !== deleteTarget.id);
          setCachedData(PAGE_KEY, updated);
          return updated;
        });
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
        setNotes((prev) => {
          const updated = prev.map((item) =>
            item.id === diary.id ? { ...item, is_public: nextPublic ? 1 : 0 } : item
          );
          setCachedData(PAGE_KEY, updated);
          return updated;
        });
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

  if (isPageLoading) {
    return (
      <div className="fluent-page-center-loader">
        <Spinner size="large" label="正在获取笔记..." />
      </div>
    );
  }

  // 依据当前呈现的卡片数量动态决定底部空白滚动空间（卡片较少时彻底消除长空白，卡片多时提供自然的底部收口）
  const cardCount = filteredNotes.length;
  const dynamicBottomPadding =
    cardCount === 0 ? "20px" : cardCount <= 3 ? "24px" : cardCount <= 6 ? "36px" : "48px";

  return (
    <div
      className="workspace-page-container notes-manager-page-container page-content-container"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const files = Array.from(e.dataTransfer.files).filter((f) =>
            /\.(md|markdown|txt)$/i.test(f.name)
          );
          if (files.length > 0) {
            e.preventDefault();
            setDroppedFiles(files);
            setImportModalOpen(true);
          }
        }
      }}
      style={{
        width: "100%",
        maxWidth: "1280px",
        margin: "0 auto",
        paddingTop: "32px",
        paddingLeft: "24px",
        paddingRight: "24px",
        paddingBottom: dynamicBottomPadding,
        ['--page-bottom-padding' as any]: dynamicBottomPadding,
        boxSizing: "border-box",
        minWidth: 0,
        flex: "0 1 auto",
        minHeight: "auto",
      }}
    >
      {/* Header Info Banner */}
      <div
        className="win10-tile-rise win10-delay-1 page-header-bar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <Title2 style={{ fontWeight: 800, margin: 0 }}>我的笔记</Title2>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Button
            appearance="secondary"
            icon={<ArrowUpload20Regular />}
            onClick={() => {
              setDroppedFiles([]);
              setImportModalOpen(true);
            }}
            style={{
              borderRadius: "8px",
              fontWeight: 600,
            }}
          >
            导入
          </Button>

          <Button
            appearance="primary"
            icon={<Add20Filled />}
            onClick={() => navigate("/workspace/new")}
            style={{
              backgroundColor: "#5B7B8D",
              borderRadius: "8px",
              fontWeight: 600,
            }}
          >
            新建
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div
        className="workspace-metric-grid win10-stagger-grid"
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
            boxShadow: isDark ? "0 4px 14px rgba(0, 0, 0, 0.2)" : "0 2px 12px rgba(91, 123, 141, 0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(91, 123, 141, 0.15)",
                color: "#5B7B8D",
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
            boxShadow: isDark ? "0 4px 14px rgba(0, 0, 0, 0.2)" : "0 2px 12px rgba(91, 123, 141, 0.06)",
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
            boxShadow: isDark ? "0 4px 14px rgba(0, 0, 0, 0.2)" : "0 2px 12px rgba(91, 123, 141, 0.06)",
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
        className="win10-tile-rise win10-delay-3"
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
            {moodTabs.map((m) => (
              <Tab key={m.id} value={m.id}>
                {m.label} {m.emoji || "✨"}
              </Tab>
            ))}
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
                style={viewMode === "grid" ? { backgroundColor: "#5B7B8D" } : undefined}
              />
            </Tooltip>
            <Tooltip content="列表视图" relationship="label">
              <Button
                appearance={viewMode === "list" ? "primary" : "subtle"}
                icon={<List20Regular />}
                onClick={() => setViewMode("list")}
                size="small"
                aria-label="列表视图"
                style={viewMode === "list" ? { backgroundColor: "#5B7B8D" } : undefined}
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

      {/* 笔记展示区域 (统一采用与公共广场完全一致的阶梯平滑浮现与磁贴流转动效) */}
      <div className="win10-tile-rise win10-delay-4" style={{ width: "100%", boxSizing: "border-box" }}>
        {filteredNotes.length === 0 ? (
          /* Empty State */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "72px 24px",
              borderRadius: "16px",
              border: isDark ? "1px dashed rgba(255, 255, 255, 0.15)" : "1px dashed rgba(0, 0, 0, 0.15)",
              background: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(91, 123, 141, 0.12)",
                color: isDark ? "rgba(255, 255, 255, 0.7)" : "#5B7B8D",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              {notes.length === 0 ? (
                <Document24Regular style={{ fontSize: "28px" }} />
              ) : (
                <Search24Regular style={{ fontSize: "28px" }} />
              )}
            </div>

            <Title3
              style={{
                fontWeight: 600,
                textAlign: "center",
                margin: "0 0 8px 0",
                display: "block",
                width: "100%",
              }}
            >
              {notes.length === 0 ? "暂无笔记" : "未找到匹配项"}
            </Title3>

            <Body1
              style={{
                opacity: 0.65,
                textAlign: "center",
                margin: "0 auto 20px auto",
                display: "block",
                fontSize: "13px",
                maxWidth: "440px",
                lineHeight: "1.6",
                width: "100%",
              }}
            >
              {notes.length === 0
                ? "开始写第一篇笔记吧，记录生活中的点滴与思考。"
                : searchQuery.trim()
                ? `未找到与 “${searchQuery.trim()}” 相关的笔记，请尝试更换关键词。`
                : selectedMood !== "all"
                ? "当前分类下暂无笔记，可以尝试切换心情分类或清除筛选。"
                : "未找到符合当前筛选条件的笔记，请尝试调整筛选范围。"}
            </Body1>

            {notes.length === 0 ? (
              <Button
                appearance="primary"
                icon={<Add20Filled />}
                onClick={() => navigate("/workspace/new")}
                style={{
                  backgroundColor: "#5B7B8D",
                  borderRadius: "8px",
                  fontWeight: 600,
                }}
              >
                新建笔记
              </Button>
            ) : (
              (searchQuery.trim() !== "" || selectedMood !== "all") && (
                <Button
                  appearance="secondary"
                  icon={<ArrowReset20Regular />}
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedMood("all");
                  }}
                  style={{
                    borderRadius: "8px",
                    fontWeight: 600,
                  }}
                >
                  清除筛选条件
                </Button>
              )
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <Win10AnimatedGrid
            items={filteredNotes}
            getKey={(note) => String(note.id)}
            className="responsive-card-grid"
            gridStyle={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
              gap: "24px",
              width: "100%",
              boxSizing: "border-box",
            }}
            renderItem={(note) => (
              <NoteCard
                diary={note}
                showActions={true}
                showVisibilityBadge={true}
                onClick={() => navigate(`/workspace/edit/${note.id}`)}
                onEdit={() => navigate(`/workspace/edit/${note.id}`)}
                onDelete={() => setDeleteTarget(note)}
                onTogglePublic={() => handleTogglePublic(note)}
              />
            )}
          />
        ) : (
        /* List View */
        <div className="win10-stagger-grid" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
                boxShadow: isDark ? "0 4px 14px rgba(0, 0, 0, 0.2)" : "0 2px 10px rgba(91, 123, 141, 0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                {extractFirstImage(note.content) && (
                  <img
                    src={extractFirstImage(note.content)!}
                    alt="封面"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
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
                    content={note.is_public !== 0 && note.is_public !== false ? "公开" : "私密"}
                    relationship="label"
                  >
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={
                        note.is_public !== 0 && note.is_public !== false ? (
                          <Globe20Regular style={{ color: "#5B7B8D" }} />
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
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(_, data) => !data.open && setDeleteTarget(null)}
        surfaceMotion={surfaceMotion}
      >
        <DialogSurface
          backdropMotion={backdropMotion}
          backdrop={{
            style: {
              backdropFilter: "none",
              WebkitBackdropFilter: "none",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
            },
          }}
          style={{
            position: isMobile ? "fixed" : undefined,
            inset: isMobile ? 0 : undefined,
            top: isMobile ? 0 : undefined,
            left: isMobile ? 0 : undefined,
            right: isMobile ? 0 : undefined,
            bottom: isMobile ? 0 : undefined,
            margin: isMobile ? 0 : undefined,
            zIndex: isMobile ? 2000 : undefined,
            maxWidth: isMobile ? "100vw" : "420px",
            minWidth: isMobile ? "100vw" : undefined,
            width: isMobile ? "100vw" : "90vw",
            maxHeight: isMobile ? "100dvh" : "88vh",
            height: isMobile ? "100dvh" : undefined,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: isMobile ? 0 : "16px",
            padding: isMobile ? "max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom)) 16px" : "24px",
            backgroundColor: isDark ? "#1c1c23" : "#ffffff",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            border: isMobile ? "none" : (isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)"),
            boxShadow: isMobile
              ? "none"
              : (isDark
                ? "0 28px 72px rgba(0, 0, 0, 0.65), 0 6px 24px rgba(0, 0, 0, 0.4)"
                : "0 24px 64px rgba(0, 0, 0, 0.22), 0 4px 18px rgba(0, 0, 0, 0.08)"),
          }}
        >
          <DialogBody style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden", width: "100%" }}>
            {/* Header - 固定顶部 */}
            <header className="dialog-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "16px", flexShrink: 0 }}>
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
            </header>

            <DialogContent style={{ display: "flex", flexDirection: "column", gap: "14px", padding: 0, flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
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
                  {activeDeleteTarget?.title || "无标题日记"}
                </div>
                {activeDeleteTarget && (
                  <Caption1 style={{ opacity: 0.65 }}>
                    {formatDate(activeDeleteTarget.created_at)}
                  </Caption1>
                )}
              </div>
              <Caption1 style={{ color: isDark ? "#f87171" : "#dc2626", fontSize: "12.5px" }}>
                删除后无法恢复。
              </Caption1>
            </DialogContent>

            {/* Footer Actions - 固定底部 */}
            <footer className="dialog-footer-row" style={{ flexShrink: 0, width: "100%" }}>
              <DialogActions style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px", padding: 0, flexShrink: 0 }}>
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
                  {isDeleting ? "正在删除..." : "确定"}
                </Button>
              </DialogActions>
            </footer>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* 批量导入 Markdown 日记弹窗 */}
      <MarkdownImportModal
        open={importModalOpen}
        initialFiles={droppedFiles}
        onClose={() => {
          setImportModalOpen(false);
          setDroppedFiles([]);
        }}
        onImportSuccess={(count) => {
          if (count > 0) {
            fetchNotes();
          }
        }}
      />
    </div>
  );
};
