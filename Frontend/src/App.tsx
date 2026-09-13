import React from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { FluentProvider, Toaster } from "@fluentui/react-components";
import { Header } from "./components/Header";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { WallpaperLayer } from "./components/WallpaperLayer";
import { WallpaperSettingsModal } from "./components/WallpaperSettingsModal";
import { AuthProvider } from "./context/AuthContext";
import { PageCacheProvider } from "./context/PageCacheContext";
import { useAppTheme } from "./context/ThemeContext";
import { WallpaperProvider } from "./context/WallpaperContext";
import { AuthPortal } from "./views/auth/AuthPortal";
import { PublicShowcase } from "./views/public/PublicShowcase";
import { MarkdownStudio } from "./views/workspace/MarkdownStudio";
import { NotesManager } from "./views/workspace/NotesManager";
import { UserManager } from "./views/workspace/UserManager";

const AppContent: React.FC = () => {
  const location = useLocation();

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
        }}
      >
        <div key={location.pathname} className="win10-page-transition-host">
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
            <WallpaperLayer />
            <WallpaperSettingsModal />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </WallpaperProvider>
        </PageCacheProvider>
      </AuthProvider>
    </FluentProvider>
  );
};

export default App;

