import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Subtitle2,
  Tooltip,
} from "@fluentui/react-components";
import {
  Add20Filled,
  Folder20Regular,
  Globe20Regular,
  Navigation20Regular,
  Notebook24Filled,
  Person20Regular,
  Settings20Regular,
  SignOut20Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
} from "@fluentui/react-icons";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import { useWallpaper } from "../context/WallpaperContext";

export const Header: React.FC = () => {
  const { isDark, toggleTheme } = useAppTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const { setIsSettingsOpen } = useWallpaper();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (targetPath: string) => {
    if (typeof window !== "undefined" && window.__checkUnsavedBeforeNavigate) {
      const allowed = window.__checkUnsavedBeforeNavigate(targetPath);
      if (!allowed) return;
    }
    navigate(targetPath);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined" && window.__checkUnsavedBeforeNavigate) {
      const allowed = window.__checkUnsavedBeforeNavigate("/");
      if (!allowed) return;
    }
    logout();
    navigate("/");
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
      {/* Brand Logo */}
      <div
        onClick={() => handleNav("/")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #0078d4, #60a5fa)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            boxShadow: "0 4px 12px rgba(0, 120, 212, 0.3)",
            flexShrink: 0,
          }}
        >
          <Notebook24Filled />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Subtitle2 style={{ fontWeight: 700, letterSpacing: "-0.3px", lineHeight: 1.25 }}>拾光手记</Subtitle2>
          <span style={{ fontSize: "10px", opacity: 0.6, fontWeight: 500, letterSpacing: "0.2px", lineHeight: 1.2 }}>ChronoNotes</span>
        </div>
      </div>

      {/* Nav Links (Desktop) - 图标与文字兼备的直观导航 */}
      <nav className="desktop-only" style={{ alignItems: "center", gap: "8px" }}>
        <Button
          appearance={location.pathname === "/" ? "primary" : "subtle"}
          icon={<Globe20Regular />}
          onClick={() => handleNav("/")}
          style={{
            borderRadius: "8px",
            fontWeight: location.pathname === "/" ? 600 : 500,
          }}
        >
          公共广场
        </Button>

        {isAuthenticated && (
          <>
            <Button
              appearance={location.pathname.startsWith("/workspace") && location.pathname !== "/workspace/new" ? "primary" : "subtle"}
              icon={<Folder20Regular />}
              onClick={() => handleNav("/workspace")}
              style={{
                borderRadius: "8px",
                fontWeight: location.pathname.startsWith("/workspace") && location.pathname !== "/workspace/new" ? 600 : 500,
              }}
            >
              我的笔记
            </Button>
            <Button
              appearance="primary"
              icon={<Add20Filled />}
              onClick={() => handleNav("/workspace/new")}
              style={{
                background: "linear-gradient(135deg, #0078d4, #005a9e)",
                borderRadius: "8px",
                fontWeight: 600,
              }}
            >
              写新日记
            </Button>
          </>
        )}
      </nav>

      {/* Right Actions (Desktop) - 极简图标 */}
      <div className="desktop-only" style={{ alignItems: "center", gap: "8px" }}>
        {/* Theme Toggle */}
        <Tooltip content={isDark ? "明亮模式" : "暗黑模式"} relationship="label">
          <Button
            appearance="subtle"
            icon={isDark ? <WeatherSunny20Regular /> : <WeatherMoon20Regular />}
            onClick={toggleTheme}
            aria-label="切换主题"
          />
        </Tooltip>

        {/* User Status */}
        {isAuthenticated && user ? (
          <>
            {/* Wallpaper & Appearance Settings Button */}
            <Tooltip content="壁纸与背景设置" relationship="label">
              <Button
                appearance="subtle"
                icon={<Settings20Regular />}
                onClick={() => setIsSettingsOpen(true)}
                aria-label="壁纸与背景设置"
              />
            </Tooltip>

            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <Tooltip content={user.nickname || user.username} relationship="label">
                  <Button
                    appearance="subtle"
                    style={{ padding: "4px" }}
                    aria-label={user.nickname || user.username}
                  >
                    <Avatar
                      name={user.nickname || user.username}
                      color="brand"
                      size={28}
                    />
                  </Button>
                </Tooltip>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <div style={{ padding: "8px 12px", borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)" }}>
                    <div style={{ fontWeight: 600, fontSize: "13px" }}>{user.nickname || user.username}</div>
                    <div style={{ fontSize: "11px", opacity: 0.6 }}>@{user.username}</div>
                  </div>
                  <MenuItem
                    icon={<Folder20Regular />}
                    onClick={() => handleNav("/workspace")}
                  >
                    笔记库
                  </MenuItem>
                  <MenuItem
                    icon={<Settings20Regular />}
                    onClick={() => setIsSettingsOpen(true)}
                  >
                    壁纸与背景设置
                  </MenuItem>
                  <MenuItem
                    icon={<SignOut20Regular />}
                    onClick={handleLogout}
                  >
                    退出登录
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          </>
        ) : (
          <Button
            appearance="primary"
            icon={<Person20Regular />}
            onClick={() => handleNav("/auth")}
            style={{
              background: "linear-gradient(135deg, #0078d4, #005a9e)",
              borderRadius: "8px",
              fontWeight: 600,
            }}
          >
            登录 / 注册
          </Button>
        )}
      </div>

      {/* Mobile Actions (<= 768px) */}
      <div className="mobile-only" style={{ alignItems: "center", gap: "6px" }}>
        {/* Theme Toggle Button */}
        <Button
          appearance="subtle"
          size="small"
          icon={isDark ? <WeatherSunny20Regular /> : <WeatherMoon20Regular />}
          onClick={toggleTheme}
          aria-label="切换主题"
        />

        {/* Quick New Note Button (if authenticated) */}
        {isAuthenticated && (
          <Button
            appearance="primary"
            size="small"
            icon={<Add20Filled />}
            onClick={() => handleNav("/workspace/new")}
            aria-label="写新日记"
          />
        )}

        {/* Mobile Hamburger Navigation Menu */}
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button
              appearance="subtle"
              size="small"
              icon={
                isAuthenticated && user ? (
                  <Avatar name={user.nickname || user.username} color="brand" size={24} />
                ) : (
                  <Navigation20Regular />
                )
              }
              aria-label="菜单导航"
            />
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {isAuthenticated && user && (
                <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(128, 128, 128, 0.15)", marginBottom: "4px" }}>
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>{user.nickname || user.username}</div>
                  <div style={{ fontSize: "11px", opacity: 0.6 }}>已登录个人笔记库</div>
                </div>
              )}
              <MenuItem icon={<Globe20Regular />} onClick={() => handleNav("/")}>
                公共笔记广场
              </MenuItem>
              {isAuthenticated ? (
                <>
                  <MenuItem icon={<Folder20Regular />} onClick={() => handleNav("/workspace")}>
                    我的笔记库
                  </MenuItem>
                  <MenuItem icon={<Add20Filled />} onClick={() => handleNav("/workspace/new")}>
                    写新日记
                  </MenuItem>
                  <MenuItem icon={<Settings20Regular />} onClick={() => setIsSettingsOpen(true)}>
                    壁纸与背景设置
                  </MenuItem>
                  <MenuItem icon={<SignOut20Regular />} onClick={handleLogout}>
                    退出登录
                  </MenuItem>
                </>
              ) : (
                <MenuItem icon={<Person20Regular />} onClick={() => handleNav("/auth")}>
                  登录 / 注册
                </MenuItem>
              )}
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
    </header>
  );
};
