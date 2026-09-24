import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Subtitle2,
  Tooltip,
} from "@fluentui/react-components";
import {
  Checkmark20Regular,
  Code20Regular,
  Desktop20Regular,
  Folder20Regular,
  Globe20Regular,
  Navigation20Regular,
  NoteAdd20Regular,
  PeopleCommunity20Regular,
  Person20Regular,
  Settings20Regular,
  SignOut20Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
  Bot20Regular,
  Sparkle20Regular,
} from "@fluentui/react-icons";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import { useWindowControls } from "../context/WindowControlsContext";
import { BrandLogo } from "./BrandLogo";

export const Header: React.FC = () => {
  const { isDark, themeMode, setThemeMode, forceCodeDark, toggleForceCodeDark } = useAppTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const { openSettings } = useSettings();
  const { hasExternalControls, controlsWidth } = useWindowControls();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = React.useState(false);

  const handleLogout = () => {
    setIsLogoutDialogOpen(false);
    if (typeof window !== "undefined" && window.__checkUnsavedBeforeNavigate) {
      const allowed = window.__checkUnsavedBeforeNavigate("/");
      if (!allowed) return;
    }
    logout();
    navigate("/");
  };

  // 响应式折叠断点：普通模式下 1080px 折叠；若收到外部窗口控制按钮信号（向左平移 138px），则提前至 1280px 折叠为纯图标，避免与中间导航按钮碰撞
  const collapseBreakpoint = hasExternalControls ? 1280 : 1080;

  // 监听网页宽度：仅在宽度 <= collapseBreakpoint (导航文字折叠为纯图标) 时显示 hover Tooltip；网页足够宽显示了文字时不展示 Tooltip
  const [isNarrowNav, setIsNarrowNav] = React.useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth <= collapseBreakpoint : false
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsNarrowNav(window.innerWidth <= collapseBreakpoint);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [collapseBreakpoint]);

  const wrapNavTooltip = (label: string, element: React.ReactElement) => {
    if (isNarrowNav) {
      return (
        <Tooltip content={label} relationship="label">
          {element}
        </Tooltip>
      );
    }
    return element;
  };

  const handleNav = (targetPath: string) => {
    if (typeof window !== "undefined" && window.__checkUnsavedBeforeNavigate) {
      const allowed = window.__checkUnsavedBeforeNavigate(targetPath);
      if (!allowed) return;
    }
    navigate(targetPath);
  };

  // 渲染主题下拉菜单（包含：自动、深色、浅色）
  const renderThemeMenu = (size: "medium" | "small" = "medium") => {
    const triggerIcon =
      themeMode === "auto" ? (
        <Desktop20Regular />
      ) : isDark ? (
        <WeatherMoon20Regular />
      ) : (
        <WeatherSunny20Regular />
      );

    const modeLabel =
      themeMode === "auto"
        ? "自动"
        : themeMode === "dark"
          ? "深色"
          : "浅色";

    return (
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Tooltip content={`主题: ${modeLabel}`} relationship="label">
            <Button
              appearance="subtle"
              size={size}
              icon={triggerIcon}
              aria-label={`主题设置: ${modeLabel}`}
            />
          </Tooltip>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem
              icon={<Desktop20Regular style={{ color: themeMode === "auto" ? "#5B7B8D" : undefined }} />}
              onClick={() => setThemeMode("auto")}
              style={{
                fontWeight: themeMode === "auto" ? 600 : 400,
                color: themeMode === "auto" ? "#5B7B8D" : undefined,
              }}
              secondaryContent={
                themeMode === "auto" ? <Checkmark20Regular style={{ color: "#5B7B8D" }} /> : undefined
              }
            >
              自动
            </MenuItem>
            <MenuItem
              icon={<WeatherMoon20Regular style={{ color: themeMode === "dark" ? "#5B7B8D" : undefined }} />}
              onClick={() => setThemeMode("dark")}
              style={{
                fontWeight: themeMode === "dark" ? 600 : 400,
                color: themeMode === "dark" ? "#5B7B8D" : undefined,
              }}
              secondaryContent={
                themeMode === "dark" ? <Checkmark20Regular style={{ color: "#5B7B8D" }} /> : undefined
              }
            >
              深色
            </MenuItem>
            <MenuItem
              icon={<WeatherSunny20Regular style={{ color: themeMode === "light" ? "#5B7B8D" : undefined }} />}
              onClick={() => setThemeMode("light")}
              style={{
                fontWeight: themeMode === "light" ? 600 : 400,
                color: themeMode === "light" ? "#5B7B8D" : undefined,
              }}
              secondaryContent={
                themeMode === "light" ? <Checkmark20Regular style={{ color: "#5B7B8D" }} /> : undefined
              }
            >
              浅色
            </MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
    );
  };

  return (
    <header
      className="glass-panel header-container"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        height: "var(--header-height, 64px)",
        width: "100%",
        boxSizing: "border-box",
        borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
        backgroundColor: isDark ? "rgba(32, 32, 32, 0.85)" : "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
      }}
    >
      {/* Brand Logo (Desktop: 点击直接返回首页) */}
      <div
        onClick={() => handleNav("/")}
        className="header-brand-wrap desktop-only"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <BrandLogo size={34} className="header-brand-logo-icon" />
        <div className="header-brand-title-wrap" style={{ display: "flex", flexDirection: "column" }}>
          <Subtitle2 className="header-brand-title" style={{ fontWeight: 700, letterSpacing: "-0.3px", lineHeight: 1.25 }}>拾光手记</Subtitle2>
          <span className="header-brand-subtitle" style={{ fontSize: "10px", opacity: 0.6, fontWeight: 500, letterSpacing: "0.2px", lineHeight: 1.2 }}>note.flynt.hk</span>
        </div>
      </div>

      {/* Brand Logo (Mobile: 点击展开 Fluent 2 导航菜单切换页面) */}
      <div className="mobile-only" style={{ alignItems: "center" }}>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <div
              className="header-brand-wrap"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                userSelect: "none",
              }}
              aria-label="页面切换菜单"
            >
              <BrandLogo size={30} className="header-brand-logo-icon" />
              <div className="header-brand-title-wrap" style={{ display: "flex", flexDirection: "column" }}>
                <Subtitle2 className="header-brand-title" style={{ fontWeight: 700, letterSpacing: "-0.3px", lineHeight: 1.25, fontSize: "14px" }}>拾光手记</Subtitle2>
                <span className="header-brand-subtitle" style={{ fontSize: "9px", opacity: 0.6, fontWeight: 500, letterSpacing: "0.2px", lineHeight: 1.1 }}>note.flynt.hk</span>
              </div>
            </div>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem
                icon={<Globe20Regular />}
                onClick={() => handleNav("/")}
              >
                笔记广场
              </MenuItem>
              {isAuthenticated ? (
                <>
                  <MenuItem
                    icon={<Folder20Regular />}
                    onClick={() => handleNav("/workspace")}
                  >
                    我的笔记
                  </MenuItem>
                  <MenuItem
                    icon={<Bot20Regular />}
                    onClick={() => handleNav("/workspace/ai")}
                  >
                    AI助手
                  </MenuItem>
                  {user?.username === "tiany" && (
                    <MenuItem
                      icon={<PeopleCommunity20Regular />}
                      onClick={() => handleNav("/workspace/users")}
                    >
                      用户管理
                    </MenuItem>
                  )}
                </>
              ) : (
                <MenuItem
                  icon={<Person20Regular />}
                  onClick={() => handleNav("/auth")}
                >
                  登录
                </MenuItem>
              )}
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>

      {/* Nav Links (Desktop) - 绝不受右侧更多按钮影响，始终全网页严格水平居中 */}
      {isAuthenticated && (
        <nav
          className="desktop-only header-nav-bar"
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            pointerEvents: "auto",
          }}
        >
          {wrapNavTooltip(
            "公共广场",
            <Button
              className="header-nav-btn"
              appearance={location.pathname === "/" ? "primary" : "subtle"}
              icon={<Globe20Regular />}
              onClick={() => handleNav("/")}
              style={{
                borderRadius: "8px",
                fontWeight: location.pathname === "/" ? 600 : 500,
              }}
            >
              <span className="header-nav-btn-text">公共广场</span>
            </Button>
          )}

          {wrapNavTooltip(
            "我的笔记",
            <Button
              className="header-nav-btn"
              appearance={
                location.pathname.startsWith("/workspace") &&
                  !location.pathname.startsWith("/workspace/users") &&
                  !location.pathname.startsWith("/workspace/ai") &&
                  location.pathname !== "/workspace/new"
                  ? "primary"
                  : "subtle"
              }
              icon={<Folder20Regular />}
              onClick={() => handleNav("/workspace")}
              style={{
                borderRadius: "8px",
                fontWeight:
                  location.pathname.startsWith("/workspace") &&
                    !location.pathname.startsWith("/workspace/users") &&
                    !location.pathname.startsWith("/workspace/ai") &&
                    location.pathname !== "/workspace/new"
                    ? 600
                    : 500,
              }}
            >
              <span className="header-nav-btn-text">我的笔记</span>
            </Button>
          )}

          {wrapNavTooltip(
            "AI 助手",
            <Button
              className="header-nav-btn"
              appearance={location.pathname.startsWith("/workspace/ai") ? "primary" : "subtle"}
              icon={<Bot20Regular />}
              onClick={() => handleNav("/workspace/ai")}
              style={{
                borderRadius: "8px",
                fontWeight: location.pathname.startsWith("/workspace/ai") ? 600 : 500,
                backgroundColor: location.pathname.startsWith("/workspace/ai")
                  ? "#5B7B8D"
                  : undefined,
                color: location.pathname.startsWith("/workspace/ai") ? "#ffffff" : undefined,
                boxShadow: location.pathname.startsWith("/workspace/ai")
                  ? "0 2px 8px rgba(91, 123, 141, 0.3)"
                  : undefined,
              }}
            >
              <span className="header-nav-btn-text">AI 助手</span>
            </Button>
          )}

          {user?.username === "tiany" &&
            wrapNavTooltip(
              "用户管理",
              <Button
                className="header-nav-btn"
                appearance={location.pathname.startsWith("/workspace/users") ? "primary" : "subtle"}
                icon={<PeopleCommunity20Regular />}
                onClick={() => handleNav("/workspace/users")}
                style={{
                  borderRadius: "8px",
                  fontWeight: location.pathname.startsWith("/workspace/users") ? 600 : 500,
                  backgroundColor: location.pathname.startsWith("/workspace/users")
                    ? "#5B7B8D"
                    : undefined,
                  color: location.pathname.startsWith("/workspace/users") ? "#ffffff" : undefined,
                  boxShadow: location.pathname.startsWith("/workspace/users")
                    ? "0 2px 8px rgba(91, 123, 141, 0.3)"
                    : undefined,
                }}
              >
                <span className="header-nav-btn-text">用户管理</span>
              </Button>
            )}
        </nav>
      )}

      {/* Right Actions (Desktop) - 极简图标与用户态操作区（支持接收外部宿主信号平滑向左平移让位） */}
      <div
        className="desktop-only header-actions-desktop"
        style={{
          alignItems: "center",
          gap: "8px",
          marginRight: hasExternalControls ? `${controlsWidth}px` : 0,
          transition: "margin-right 0.3s cubic-bezier(0.1, 0.9, 0.2, 1)",
        }}
      >
        {isAuthenticated && user ? (
          <>
            {/* 1. 新建日记图标按钮 */}
            <Tooltip content="写日记" relationship="label">
              <Button
                appearance="subtle"
                icon={<NoteAdd20Regular />}
                onClick={() => handleNav("/workspace/new")}
                aria-label="写日记"
              />
            </Tooltip>

            {/* 2. 主题模式下拉菜单 */}
            {renderThemeMenu("medium")}

            {/* 3. 系统设置按钮 */}
            <Tooltip content="系统设置" relationship="label">
              <Button
                appearance="subtle"
                icon={<Settings20Regular />}
                onClick={() => openSettings(user.username === "tiany" ? "wallpaper" : "profile")}
                aria-label="系统设置"
              />
            </Tooltip>

            {/* 4. 用户头像按钮（同时显示用户头像与用户名称） */}
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <Tooltip content={`当前用户: ${user.nickname || user.username}`} relationship="label">
                  <Button
                    className="header-avatar-btn"
                    appearance="subtle"
                    style={{
                      padding: "3px 10px 3px 4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      borderRadius: "8px",
                      border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
                    }}
                    aria-label={user.nickname || user.username}
                  >
                    <Avatar
                      name={user.nickname || user.username}
                      image={user.avatar ? { src: user.avatar } : undefined}
                      aria-label={user.nickname || user.username}
                      color="brand"
                      size={28}
                    />
                    <span
                      className="header-avatar-name"
                      style={{
                        fontWeight: 600,
                        fontSize: "13px",
                        maxWidth: "120px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {user.nickname || user.username}
                    </span>
                  </Button>
                </Tooltip>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem
                    icon={<Settings20Regular />}
                    onClick={() => openSettings()}
                  >
                    设置
                  </MenuItem>
                  <MenuItem
                    icon={<SignOut20Regular />}
                    onClick={() => setIsLogoutDialogOpen(true)}
                  >
                    退出登录
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          </>
        ) : (
          <>
            {/* Theme Dropdown (未登录) */}
            {renderThemeMenu("medium")}
            <Button
              appearance="primary"
              icon={<Person20Regular />}
              onClick={() => handleNav("/auth")}
              style={{
                backgroundColor: "#5B7B8D",
                borderRadius: "8px",
                fontWeight: 600,
              }}
            >
              登录
            </Button>
          </>
        )}
      </div>

      {/* Mobile Actions (<= 768px) - 移动端保持与桌面端相同的逻辑顺序 */}
      <div
        className="mobile-only header-actions-mobile"
        style={{
          alignItems: "center",
          gap: "4px",
          marginRight: hasExternalControls ? `${controlsWidth}px` : 0,
          transition: "margin-right 0.3s cubic-bezier(0.1, 0.9, 0.2, 1)",
        }}
      >
        {isAuthenticated && user ? (
          <>
            {/* 1. 新建日记图标按钮 */}
            <Tooltip content="写日记" relationship="label">
              <Button
                appearance="subtle"
                size="small"
                icon={<NoteAdd20Regular />}
                onClick={() => handleNav("/workspace/new")}
                aria-label="写日记"
              />
            </Tooltip>

            {/* 2. 主题模式下拉菜单 */}
            {renderThemeMenu("small")}

            {/* 3. 系统设置按钮 */}
            <Tooltip content="系统设置" relationship="label">
              <Button
                appearance="subtle"
                size="small"
                icon={<Settings20Regular />}
                onClick={() => openSettings(user.username === "tiany" ? "wallpaper" : "profile")}
                aria-label="系统设置"
              />
            </Tooltip>

            {/* 4. 用户头像按钮（同时显示用户头像与用户名称） */}
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <Button
                  className="mobile-avatar-btn"
                  appearance="subtle"
                  size="small"
                  style={{
                    padding: "2px 6px 2px 2px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    borderRadius: "6px",
                  }}
                  aria-label={user.nickname || user.username}
                >
                  <Avatar
                    name={user.nickname || user.username}
                    image={user.avatar ? { src: user.avatar } : undefined}
                    aria-label={user.nickname || user.username}
                    color="brand"
                    size={24}
                  />
                  <span
                    className="mobile-avatar-name"
                    style={{
                      fontWeight: 600,
                      fontSize: "12px",
                      maxWidth: "60px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.nickname || user.username}
                  </span>
                </Button>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem
                    icon={<Settings20Regular />}
                    onClick={() => openSettings()}
                  >
                    设置
                  </MenuItem>
                  <MenuItem
                    icon={<SignOut20Regular />}
                    onClick={() => setIsLogoutDialogOpen(true)}
                  >
                    退出登录
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          </>
        ) : (
          <>
            {renderThemeMenu("small")}
            <Tooltip content="登录" relationship="label">
              <Button
                appearance="primary"
                size="small"
                icon={<Person20Regular />}
                onClick={() => handleNav("/auth")}
                aria-label="登录"
                style={{
                  backgroundColor: "#5B7B8D",
                  borderRadius: "6px",
                  fontWeight: 600,
                  width: "32px",
                  height: "32px",
                  minWidth: "32px",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
            </Tooltip>
          </>
        )}
      </div>

      {/* 退出登录确认弹窗 */}
      <Dialog
        open={isLogoutDialogOpen}
        onOpenChange={(_, data) => setIsLogoutDialogOpen(data.open)}
      >
        <DialogSurface style={{ maxWidth: "380px", borderRadius: "12px", padding: "20px" }}>
          <DialogBody>
            <DialogTitle>确认退出登录</DialogTitle>
            <DialogContent style={{ marginTop: "10px", fontSize: "14px", lineHeight: 1.6, opacity: 0.85 }}>
              确定要退出当前账号吗？未保存的内容可能会丢失。
            </DialogContent>
            <DialogActions style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <Button
                appearance="secondary"
                onClick={() => setIsLogoutDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                appearance="primary"
                className="btn-danger"
                style={{
                  backgroundColor: "#d13438",
                  borderColor: "#d13438",
                  color: "#ffffff",
                }}
                onClick={handleLogout}
              >
                退出登录
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </header>
  );
};
