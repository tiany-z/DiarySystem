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

const getRouteTransitionKey = (pathname: string) => {
  if (pathname.startsWith("/workspace/ai")) return "/workspace/ai";
  if (pathname.startsWith("/note/")) return "/note";
  if (pathname.startsWith("/workspace/edit/")) return "/workspace/edit";
  return pathname;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const transitionKey = getRouteTransitionKey(location.pathname);
  const isAiPage = location.pathname.startsWith("/workspace/ai");

  // 跨主页面切换时全局自动瞬间滚动重置到顶部（同一工作区内，如 AI 会话切换不触发页面跳动）
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [transitionKey]);

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

            {/* 模块三：个人笔记管理工作台 (受保护路由) */}
            <Route
              path="/workspace"
              element={
                <ProtectedRoute>
                  <NotesManager />
                </ProtectedRoute>
              }
            />

            {/* 模块四：总管理员用户管理中枢 (受保护路由) */}
            <Route
              path="/workspace/users"
              element={
                <ProtectedRoute>
                  <UserManager />
                </ProtectedRoute>
              }
            />

            {/* 模块五：专业 Markdown 编辑器 (新建笔记) */}
            <Route
              path="/workspace/new"
              element={
                <ProtectedRoute>
                  <MarkdownStudio />
                </ProtectedRoute>
              }
            />

            {/* 模块五：专业 Markdown 编辑器 (编辑指定笔记) */}
            <Route
              path="/workspace/edit/:id"
              element={
                <ProtectedRoute>
                  <MarkdownStudio />
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
              <UnifiedSettingsModal />
              <BrowserRouter>
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

