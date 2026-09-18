import React, { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { FluentProvider, Toaster } from "@fluentui/react-components";
import { Header } from "./components/Header";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { WallpaperLayer } from "./components/WallpaperLayer";
import { UnifiedSettingsModal } from "./components/UnifiedSettingsModal";
import { AuthProvider } from "./context/AuthContext";
import { PageCacheProvider } from "./context/PageCacheContext";
import { SettingsProvider } from "./context/SettingsContext";
import { useAppTheme } from "./context/ThemeContext";
import { WallpaperProvider } from "./context/WallpaperContext";
import { AuthPortal } from "./views/auth/AuthPortal";
import { PublicShowcase } from "./views/public/PublicShowcase";
import { MarkdownStudio } from "./views/workspace/MarkdownStudio";
import { NotesManager } from "./views/workspace/NotesManager";
import { UserManager } from "./views/workspace/UserManager";
import { AIChatView } from "./views/workspace/AIChatView";
import { WorkspaceView } from "./views/workspace/WorkspaceView";
import { CustomScrollbar } from "./components/CustomScrollbar";

const getRouteTransitionKey = (pathname: string) => {
  if (pathname.startsWith("/workspace/ai")) return "/workspace/ai";
  if (pathname.startsWith("/note/")) return "/note";
  if (
    pathname === "/workspace" ||
    pathname === "/workspace/new" ||
    pathname.startsWith("/workspace/edit/")
  ) {
    return "/workspace-flow";
  }
  return pathname;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const transitionKey = getRouteTransitionKey(location.pathname);
  const isAiPage = location.pathname.startsWith("/workspace/ai");
  const isEditorPage =
    location.pathname === "/workspace/new" ||
    location.pathname.startsWith("/workspace/edit/");
  const isWorkspaceNotesFlow = location.pathname === "/workspace" || isEditorPage;

  // 跨主页面切换时全局自动瞬间滚动重置到顶部，并在常规页面强制恢复全局滚动流
  useEffect(() => {
    // 关键优化：在我的笔记列表 (/workspace) 与编辑器之间切换时，绝不重置滚动条，完美保留用户先前的阅读和列表滚动位置
    if (!isWorkspaceNotesFlow) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }

    // 当处于非全屏锁定页面（如 笔记广场 / 我的笔记 / 用户管理 / 登录页 等普通文档流页面）时，
    // 强制彻底清除任何残留的 overflow: hidden 锁定，确保全站丝滑滚动
    if (!isAiPage && !isEditorPage) {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.documentElement.style.overflowY = "auto";
      document.body.style.overflowY = "visible";
    }
  }, [transitionKey, isAiPage, isEditorPage, isWorkspaceNotesFlow]);

  return (
    <>
      <Header />
      <main
        className="app-main-content"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          boxSizing: "border-box",
          minHeight: 0,
          paddingTop: "var(--header-height, 64px)",
          height: isAiPage ? "100vh" : undefined,
          maxHeight: isAiPage ? "100vh" : undefined,
          overflow: isAiPage ? "hidden" : undefined,
        }}
      >
        <div
          key={transitionKey}
          className="win10-page-transition-host"
          style={{
            height: isAiPage ? "100%" : undefined,
            maxHeight: isAiPage ? "100%" : undefined,
            overflow: isAiPage ? "hidden" : undefined,
          }}
        >
          <Routes location={location}>
            {/* 模块一：对外公开展示笔记界面（支持首页广场与指定笔记直达） */}
            <Route path="/" element={<PublicShowcase />} />
            <Route path="/note/:id" element={<PublicShowcase />} />

            {/* 模块二：用户登录门户 */}
            <Route path="/auth" element={<AuthPortal />} />

            {/* 模块三/五：个人笔记管理工作台与 Markdown 编辑器 (一体化 Keep-Alive 调度) */}
            <Route
              path="/workspace"
              element={
                <ProtectedRoute>
                  <WorkspaceView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspace/new"
              element={
                <ProtectedRoute>
                  <WorkspaceView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspace/edit/:id"
              element={
                <ProtectedRoute>
                  <WorkspaceView />
                </ProtectedRoute>
              }
            />

            {/* 模块四：用户管理控制台 (受保护路由) */}
            <Route
              path="/workspace/users"
              element={
                <ProtectedRoute>
                  <UserManager />
                </ProtectedRoute>
              }
            />

            {/* 模块六：全功能自主思考 AI Agent 对话工作台 (受保护路由) */}
            <Route
              path="/workspace/ai"
              element={
                <ProtectedRoute>
                  <AIChatView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspace/ai/:conversationId"
              element={
                <ProtectedRoute>
                  <AIChatView />
                </ProtectedRoute>
              }
            />

            {/* 兜底路由 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
      <CustomScrollbar />
      <Toaster />
    </>
  );
};

export const App: React.FC = () => {
  const { theme } = useAppTheme();

  return (
    <FluentProvider
      theme={theme}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        boxSizing: "border-box",
        background: "transparent",
      }}
    >
      <AuthProvider>
        <PageCacheProvider>
          <WallpaperProvider>
            <SettingsProvider>
              <WallpaperLayer />
              <BrowserRouter>
                <UnifiedSettingsModal />
                <AppContent />
              </BrowserRouter>
            </SettingsProvider>
          </WallpaperProvider>
        </PageCacheProvider>
      </AuthProvider>
    </FluentProvider>
  );
};

export default App;

