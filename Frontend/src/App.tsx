import React, { useEffect, useRef } from "react";
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
import { initWin10RevealManager } from "./utils/win10RevealManager";

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

const isLocationEditor = (pathname: string) =>
  pathname === "/workspace/new" || pathname.startsWith("/workspace/edit/");

const AppContent: React.FC = () => {
  const location = useLocation();
  const isEditorPage = isLocationEditor(location.pathname);
  const isAiPage = location.pathname.startsWith("/workspace/ai");

  // 记录进入编辑器之前最后访问的非编辑器页面路由，供 Keep-Alive 后台宿主使用
  const lastNonEditorLocationRef = useRef<any>(
    isEditorPage
      ? { ...location, pathname: "/workspace", search: "", hash: "" }
      : location
  );

  if (!isEditorPage) {
    lastNonEditorLocationRef.current = location;
  }

  const backgroundLocation = isEditorPage ? lastNonEditorLocationRef.current : location;
  const transitionKey = getRouteTransitionKey(backgroundLocation.pathname);

  const savedScrollYRef = useRef<number>(0);
  const wasEditorOpenRef = useRef<boolean>(isEditorPage);

  // 当处于非编辑器页面时，实时捕获并记录当前页面的视口滚动位置
  useEffect(() => {
    if (!isEditorPage) {
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
  }, [isEditorPage]);

  // 从编辑器退出返回原页面时，精确瞬间恢复先前保存的滚动条垂直几何高度，达到 0 闪烁 0 延迟
  useEffect(() => {
    if (wasEditorOpenRef.current && !isEditorPage) {
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
    wasEditorOpenRef.current = isEditorPage;
  }, [isEditorPage]);

  // 跨主页面（非编辑器进退）切换时全局自动重置滚动条到顶部
  useEffect(() => {
    if (!isEditorPage && !wasEditorOpenRef.current) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }

    // 当处于非全屏锁定页面时，强制恢复全局滚动流
    if (!isAiPage && !isEditorPage) {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.documentElement.style.overflowY = "auto";
      document.body.style.overflowY = "visible";
    }
  }, [transitionKey, isAiPage, isEditorPage]);

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
          height: isAiPage && !isEditorPage ? "100vh" : undefined,
          maxHeight: isAiPage && !isEditorPage ? "100vh" : undefined,
          overflow: isAiPage && !isEditorPage ? "hidden" : undefined,
        }}
      >
        <div
          key={transitionKey}
          className="win10-page-transition-host"
          style={{
            position: "relative",
            width: "100%",
            height: isAiPage && !isEditorPage ? "100%" : undefined,
            maxHeight: isAiPage && !isEditorPage ? "100%" : undefined,
            overflow: isAiPage && !isEditorPage ? "hidden" : undefined,
          }}
        >
          {/* 1. 底层原业务页面容器：始终保持挂载，当进入编辑器时使用 opacity: 0; pointer-events: none; visibility: hidden; 隐藏，
              绝不销毁组件，彻底保留真实 DOM 结构、搜索词输入与滚动条几何位置 */}
          <div
            className="app-background-view-keeper"
            style={{
              opacity: isEditorPage ? 0 : 1,
              pointerEvents: isEditorPage ? "none" : "auto",
              visibility: isEditorPage ? "hidden" : "visible",
              transition: "opacity 0.15s ease",
              width: "100%",
              minHeight: "100%",
              height: isAiPage && !isEditorPage ? "100%" : undefined,
            }}
          >
            <Routes location={backgroundLocation}>
              {/* 模块一：对外公开展示笔记界面（支持首页广场与指定笔记直达） */}
              <Route path="/" element={<PublicShowcase />} />
              <Route path="/note/:id" element={<PublicShowcase />} />

              {/* 模块二：用户登录门户 */}
              <Route path="/auth" element={<AuthPortal />} />

              {/* 模块三：个人笔记管理工作台 */}
              <Route
                path="/workspace"
                element={
                  <ProtectedRoute>
                    <NotesManager />
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

              {/* 编辑器浮层背景占位（绝不触发 404 兜底重定向到首页） */}
              <Route path="/workspace/new" element={<div />} />
              <Route path="/workspace/edit/:id" element={<div />} />

              {/* 兜底路由 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          {/* 2. 全局 Markdown 编辑器全屏浮层：无论是从笔记广场、我的笔记、用户管理还是 AI 对话进入新建或编辑笔记，
              均在 fixed 浮层中呈现，绝不破坏外层原页面的真实 DOM、搜索输入与滚动位置 */}
          {isEditorPage && (
            <ProtectedRoute>
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
                <Routes location={location}>
                  <Route path="/workspace/new" element={<MarkdownStudio />} />
                  <Route path="/workspace/edit/:id" element={<MarkdownStudio />} />
                </Routes>
              </div>
            </ProtectedRoute>
          )}
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

