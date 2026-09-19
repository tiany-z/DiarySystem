import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Slider,
  Spinner,
  Switch,
  Title3,
  Tooltip,
  Avatar,
} from "@fluentui/react-components";
import {
  Bot20Regular,
  Camera20Regular,
  Checkmark20Regular,
  Dismiss20Regular,
  Eye20Regular,
  EyeOff20Regular,
  Globe20Regular,
  Image20Regular,
  Key20Regular,
  LockClosed20Regular,
  PeopleCommunity20Regular,
  Person20Regular,
  PlugConnected20Regular,
  Save20Regular,
  Sparkle20Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
  Desktop20Regular,
  ArrowLeft20Regular,
  ArrowRight20Regular,
  ArrowSync20Regular,
  Delete20Regular,
  SignOut20Regular,
} from "@fluentui/react-icons";
import { getAiConfig, saveAiConfig, testAiConfig } from "../api/ai";
import { userApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { useAppTheme, ThemeMode } from "../context/ThemeContext";
import { useWallpaper } from "../context/WallpaperContext";
import { useSettings, SettingsTabKey } from "../context/SettingsContext";
import { useAppDialogMotion } from "../utils/dialogMotion";
import { AvatarCropModal } from "./AvatarCropModal";
import { ChangePasswordModal } from "./ChangePasswordModal";

export interface AiProviderPreset {
  id: string;
  name: string;
  icon: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
}

export const AI_PRESETS: AiProviderPreset[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: "🐋",
    baseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-reasoner",
    models: ["deepseek-reasoner", "deepseek-chat"],
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: "🟢",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini"],
  },
  {
    id: "ollama",
    name: "Ollama",
    icon: "🦙",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "qwen2.5:7b",
    models: ["qwen2.5:7b", "llama3.1:8b", "deepseek-r1:8b"],
  },
  {
    id: "qwen",
    name: "通义千问",
    icon: "☁️",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-plus",
    models: ["qwen-plus", "qwen-max", "qwen-turbo"],
  },
  {
    id: "moonshot",
    name: "Kimi",
    icon: "🌙",
    baseUrl: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-8k",
    models: ["moonshot-v1-8k", "moonshot-v1-32k"],
  },
];

export const UnifiedSettingsModal: React.FC = () => {
  const { isSettingsOpen, activeTab, closeSettings, setActiveTab } = useSettings();
  const { user, refreshProfile, updateAvatar, logout } = useAuth();
  const { isDark, themeMode, setThemeMode, forceCodeDark, setForceCodeDark } = useAppTheme();
  const { surfaceMotion, backdropMotion, isMobile } = useAppDialogMotion();
  const navigate = useNavigate();

  // Wallpaper context
  const {
    enabled: wpEnabled,
    blur: wpBlur,
    opacity: wpOpacity,
    currentWallpaper,
    isSaving: isWpSaving,
    setEnabled: setWpEnabled,
    setBlur: setWpBlur,
    setOpacity: setWpOpacity,
    nextWallpaper,
    prevWallpaper,
    refresh: refreshWallpaper,
    saveToDatabase: saveWpToDatabase,
  } = useWallpaper();

  const isTiany = user?.username === "tiany";

  // AI Settings states
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [aiModelName, setAiModelName] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiHasKey, setAiHasKey] = useState(false);
  const [aiMaskedKey, setAiMaskedKey] = useState("");
  const [showAiKey, setShowAiKey] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiTesting, setIsAiTesting] = useState(false);
  const [isAiSaving, setIsAiSaving] = useState(false);
  const [aiTestStatus, setAiTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [aiTestMessage, setAiTestMessage] = useState("");
  const [aiSaveStatus, setAiSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [aiSaveMessage, setAiSaveMessage] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Profile states
  const [nicknameInput, setNicknameInput] = useState("");
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false);
  const [nicknameMsg, setNicknameMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Change Password Modal state
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Avatar Crop Modal state
  const [isAvatarCropOpen, setIsAvatarCropOpen] = useState(false);

  // Logout confirm modal state
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Wallpaper save status
  const [wpSaveStatus, setWpSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [wpSaveMsg, setWpSaveMsg] = useState<string | null>(null);

  // Initialize data when modal opens
  useEffect(() => {
    if (!isSettingsOpen) {
      setAiTestStatus("idle");
      setAiTestMessage("");
      setAiSaveStatus("idle");
      setAiSaveMessage("");
      setNicknameMsg(null);
      setWpSaveMsg(null);
      return;
    }

    if (user?.nickname) {
      setNicknameInput(user.nickname);
    } else if (user?.username) {
      setNicknameInput(user.username);
    }

    // Load AI config
    setIsAiLoading(true);
    getAiConfig()
      .then((res) => {
        if (res.status === 1 && res.data) {
          setAiBaseUrl(res.data.baseUrl || "");
          setAiModelName(res.data.modelName || "");
          setAiHasKey(res.data.hasKey || false);
          setAiMaskedKey(res.data.maskedKey || "");
          setAiApiKey("");
          const currentUrl = res.data.baseUrl || "";
          const matched = AI_PRESETS.find(
            (p) =>
              currentUrl.startsWith(p.baseUrl) ||
              p.baseUrl.startsWith(currentUrl)
          );
          if (matched) setActivePreset(matched.id);
        }
      })
      .catch(() => {})
      .finally(() => setIsAiLoading(false));
  }, [isSettingsOpen, user]);

  // Handle AI preset click
  const handleSelectPreset = (preset: AiProviderPreset) => {
    setActivePreset(preset.id);
    setAiBaseUrl(preset.baseUrl);
    setAiModelName(preset.defaultModel);
  };

  // Test AI Connection
  const handleTestAi = async () => {
    if (!aiBaseUrl.trim()) {
      setAiTestStatus("error");
      setAiTestMessage("请输入服务地址");
      return;
    }
    if (!aiModelName.trim()) {
      setAiTestStatus("error");
      setAiTestMessage("请输入模型名称");
      return;
    }

    setIsAiTesting(true);
    setAiTestStatus("idle");
    setAiTestMessage("");

    try {
      const res = await testAiConfig({
        baseUrl: aiBaseUrl.trim(),
        modelName: aiModelName.trim(),
        apiKey: aiApiKey.trim() || undefined,
      });

      if (res.status === 1 && res.data?.success) {
        setAiTestStatus("success");
        setAiTestMessage(`连接成功 · ${res.data.latencyMs ?? 0}ms`);
      } else {
        setAiTestStatus("error");
        setAiTestMessage(res.data?.message || res.content || "连接失败");
      }
    } catch (err: any) {
      setAiTestStatus("error");
      setAiTestMessage(`连接失败: ${err?.message || "网络异常"}`);
    } finally {
      setIsAiTesting(false);
    }
  };

  // Save AI Config
  const handleSaveAi = async () => {
    if (!aiBaseUrl.trim()) {
      setAiSaveStatus("error");
      setAiSaveMessage("请输入服务地址");
      return;
    }
    if (!aiModelName.trim()) {
      setAiSaveStatus("error");
      setAiSaveMessage("请输入模型名称");
      return;
    }

    setIsAiSaving(true);
    setAiSaveStatus("idle");
    setAiSaveMessage("");

    try {
      const res = await saveAiConfig({
        baseUrl: aiBaseUrl.trim(),
        modelName: aiModelName.trim(),
        apiKey: aiApiKey.trim() || undefined,
      });

      if (res.status === 1) {
        setAiSaveStatus("success");
        setAiSaveMessage("已保存");
        setAiHasKey(Boolean(aiApiKey.trim() || aiHasKey));
        if (aiApiKey.trim()) {
          const raw = aiApiKey.trim();
          setAiMaskedKey(
            raw.length > 8 ? `${raw.slice(0, 3)}...${raw.slice(-4)}` : "******"
          );
          setAiApiKey("");
        }
        window.dispatchEvent(new CustomEvent("ai:config_updated"));
        setTimeout(() => {
          setAiSaveStatus("idle");
          setAiSaveMessage("");
        }, 2500);
      } else {
        setAiSaveStatus("error");
        setAiSaveMessage(res.content || "保存失败");
      }
    } catch (err: any) {
      setAiSaveStatus("error");
      setAiSaveMessage(`保存失败: ${err?.message || "网络异常"}`);
    } finally {
      setIsAiSaving(false);
    }
  };

  // Save Wallpaper
  const handleSaveWallpaper = async () => {
    if (!isTiany) return;
    setWpSaveStatus("idle");
    const ok = await saveWpToDatabase();
    if (ok) {
      setWpSaveStatus("success");
      setWpSaveMsg("已保存");
      setTimeout(() => {
        setWpSaveMsg(null);
        setWpSaveStatus("idle");
      }, 2500);
    } else {
      setWpSaveStatus("error");
      setWpSaveMsg("保存失败");
      setTimeout(() => {
        setWpSaveMsg(null);
        setWpSaveStatus("idle");
      }, 3000);
    }
  };

  // Save Nickname
  const handleSaveNickname = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) {
      setNicknameMsg({ type: "error", text: "请输入昵称" });
      return;
    }
    setIsUpdatingNickname(true);
    setNicknameMsg(null);
    try {
      const res = await userApi.updateProfile({ nickname: trimmed });
      if (res.status === 1) {
        await refreshProfile();
        setNicknameMsg({ type: "success", text: "已更新" });
        setTimeout(() => setNicknameMsg(null), 2500);
      } else {
        setNicknameMsg({ type: "error", text: res.content || "更新失败" });
      }
    } catch (err: any) {
      setNicknameMsg({ type: "error", text: err?.message || "网络异常" });
    } finally {
      setIsUpdatingNickname(false);
    }
  };


  // Reset Avatar
  const handleResetAvatar = async () => {
    if (!window.confirm("确定要恢复默认头像吗？")) return;
    try {
      const res = await userApi.updateAvatar(null);
      if (res.status === 1) {
        updateAvatar(null);
      }
    } catch {}
  };

  // 统一保存并关闭处理方法
  const handleSaveAndClose = async () => {
    if (activeTab === "ai") {
      setIsAiSaving(true);
      setAiSaveStatus("idle");
      setAiSaveMessage("");
      try {
        const res = await saveAiConfig({
          baseUrl: aiBaseUrl.trim(),
          modelName: aiModelName.trim(),
          apiKey: aiApiKey.trim() || undefined,
        });

        if (res.status === 1) {
          setAiSaveStatus("success");
          setAiSaveMessage("已保存");
          setAiHasKey(Boolean(aiApiKey.trim() || aiHasKey));
          if (aiApiKey.trim()) {
            const raw = aiApiKey.trim();
            setAiMaskedKey(
              raw.length > 8 ? `${raw.slice(0, 3)}...${raw.slice(-4)}` : "******"
            );
            setAiApiKey("");
          }
          window.dispatchEvent(new CustomEvent("ai:config_updated"));
          closeSettings();
        } else {
          setAiSaveStatus("error");
          setAiSaveMessage(res.content || "保存失败");
        }
      } catch (err: any) {
        setAiSaveStatus("error");
        setAiSaveMessage(`保存失败: ${err?.message || "网络异常"}`);
      } finally {
        setIsAiSaving(false);
      }
    } else if (activeTab === "wallpaper" && isTiany) {
      setWpSaveStatus("idle");
      const ok = await saveWpToDatabase();
      if (ok) {
        setWpSaveStatus("success");
        setWpSaveMsg("已保存");
        closeSettings();
      } else {
        setWpSaveStatus("error");
        setWpSaveMsg("保存失败");
      }
    } else if (activeTab === "profile") {
      const trimmed = nicknameInput.trim();
      if (trimmed && trimmed !== user?.nickname) {
        setIsUpdatingNickname(true);
        setNicknameMsg(null);
        try {
          const res = await userApi.updateProfile({ nickname: trimmed });
          if (res.status === 1) {
            await refreshProfile();
            closeSettings();
          } else {
            setNicknameMsg({ type: "error", text: res.content || "更新失败" });
          }
        } catch (err: any) {
          setNicknameMsg({ type: "error", text: err?.message || "网络异常" });
        } finally {
          setIsUpdatingNickname(false);
        }
      } else {
        closeSettings();
      }
    } else {
      closeSettings();
    }
  };

  // Navigation tabs definition
  const TABS: { id: SettingsTabKey; label: string; icon: React.ReactElement }[] = [
    { id: "ai", label: "AI 模型", icon: <Bot20Regular /> },
    { id: "wallpaper", label: "背景壁纸", icon: <Image20Regular /> },
    { id: "profile", label: "个人资料", icon: <Person20Regular /> },
    { id: "theme", label: "界面外观", icon: <Sparkle20Regular /> },
  ];

  return (
    <>
      <Dialog
        open={isSettingsOpen}
        onOpenChange={(_, data) => !data.open && closeSettings()}
        surfaceMotion={surfaceMotion}
      >
        <DialogSurface
          className="unified-settings-surface"
          backdropMotion={backdropMotion}
          backdrop={{
            style: {
              backdropFilter: "none",
              WebkitBackdropFilter: "none",
              backgroundColor: "rgba(0, 0, 0, 0.45)",
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
            maxWidth: isMobile ? "100vw" : "720px",
            minWidth: isMobile ? "100vw" : "620px",
            width: isMobile ? "100vw" : "85vw",
            minHeight: isMobile ? "100dvh" : "520px",
            maxHeight: isMobile ? "100dvh" : "580px",
            height: isMobile ? "100dvh" : "540px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: isMobile ? 0 : "14px",
            padding: 0,
            backgroundColor: isDark ? "#202026" : "#ffffff",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            border: isMobile
              ? "none"
              : isDark
              ? "1px solid rgba(255, 255, 255, 0.1)"
              : "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: isMobile
              ? "none"
              : isDark
              ? "0 24px 60px rgba(0, 0, 0, 0.65)"
              : "0 20px 48px rgba(0, 0, 0, 0.14)",
          }}
        >
          <DialogBody
            style={{
              display: "flex",
              flexDirection: "column",
              flex: "1 1 0px",
              minHeight: 0,
              overflow: "hidden",
              width: "100%",
              height: "100%",
              padding: 0,
            }}
          >
            {/* 顶栏 Header */}
            <header
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: isMobile
                  ? "max(12px, env(safe-area-inset-top)) 14px 10px"
                  : "10px 16px",
                borderBottom: isDark
                  ? "1px solid rgba(255, 255, 255, 0.08)"
                  : "1px solid rgba(0, 0, 0, 0.06)",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Title3 style={{ fontWeight: 600, fontSize: "15px", letterSpacing: "-0.01em" }}>设置</Title3>
              </div>

              <Tooltip content="关闭" relationship="label">
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<Dismiss20Regular />}
                  onClick={closeSettings}
                  aria-label="关闭设置"
                  style={{ borderRadius: "6px" }}
                />
              </Tooltip>
            </header>

            {/* 主体区：桌面端左侧边栏 + 右侧内容区；移动端顶部横向药丸导航 + 内容区 */}
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                flex: 1,
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              {/* 导航标签区 */}
              <nav
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "row" : "column",
                  gap: isMobile ? "6px" : "4px",
                  padding: isMobile ? "8px 12px" : "14px 10px",
                  width: isMobile ? "100%" : "145px",
                  flexShrink: 0,
                  boxSizing: "border-box",
                  backgroundColor: isDark
                    ? isMobile
                      ? "rgba(255, 255, 255, 0.02)"
                      : "rgba(0, 0, 0, 0.2)"
                    : isMobile
                    ? "rgba(0, 0, 0, 0.02)"
                    : "rgba(0, 0, 0, 0.025)",
                  borderRight: !isMobile
                    ? isDark
                      ? "1px solid rgba(255, 255, 255, 0.06)"
                      : "1px solid rgba(0, 0, 0, 0.06)"
                    : undefined,
                  borderBottom: isMobile
                    ? isDark
                      ? "1px solid rgba(255, 255, 255, 0.06)"
                      : "1px solid rgba(0, 0, 0, 0.06)"
                    : undefined,
                  overflowX: isMobile ? "auto" : undefined,
                  WebkitOverflowScrolling: isMobile ? "touch" : undefined,
                }}
              >
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: isMobile ? "6px 12px" : "8px 14px",
                        borderRadius: "8px",
                        border: "none",
                        cursor: "pointer",
                        background: isActive
                          ? isDark
                            ? "rgba(91, 123, 141, 0.25)"
                            : "rgba(91, 123, 141, 0.12)"
                          : "transparent",
                        color: isActive
                          ? isDark
                            ? "#8EAEC0"
                            : "#5B7B8D"
                          : isDark
                          ? "#a0aec0"
                          : "#4a5568",
                        fontWeight: isActive ? 600 : 500,
                        fontSize: "13.5px",
                        whiteSpace: "nowrap",
                        textAlign: "left",
                        width: isMobile ? "auto" : "100%",
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "18px",
                          display: "flex",
                          alignItems: "center",
                          color: isActive
                            ? isDark
                              ? "#8EAEC0"
                              : "#5B7B8D"
                            : undefined,
                        }}
                      >
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* 选项卡内容区 (独立滚动) */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  minWidth: 0,
                  overflowY: "auto",
                  padding: isMobile ? "14px 16px 20px" : "18px 24px 20px",
                  boxSizing: "border-box",
                }}
              >
                {/* 1. AI 模型设置 TAB */}
                {activeTab === "ai" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {/* 快捷预设 */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", color: isDark ? "#a0aec0" : "#64748b", marginRight: "4px" }}>
                        预设:
                      </span>
                      {AI_PRESETS.map((preset) => {
                        const isSelected = activePreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectPreset(preset)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              border: isSelected
                                ? "1px solid #5B7B8D"
                                : isDark
                                ? "1px solid rgba(255, 255, 255, 0.1)"
                                : "1px solid rgba(0, 0, 0, 0.1)",
                              backgroundColor: isSelected
                                ? isDark
                                   ? "rgba(91, 123, 141, 0.25)"
                                  : "rgba(91, 123, 141, 0.12)"
                                : isDark
                                ? "rgba(255, 255, 255, 0.04)"
                                : "rgba(0, 0, 0, 0.03)",
                              color: isSelected
                                ? isDark
                                  ? "#8EAEC0"
                                  : "#5B7B8D"
                                : isDark
                                ? "#e2e8f0"
                                : "#334155",
                              cursor: "pointer",
                              fontSize: "12.5px",
                              fontWeight: isSelected ? 600 : 400,
                              transition: "all 0.15s ease",
                            }}
                          >
                            <span style={{ fontSize: "14px" }}>{preset.icon}</span>
                            <span>{preset.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* API 服务地址 */}
                    <Field label="服务地址" required>
                      <Input
                        value={aiBaseUrl}
                        onChange={(_, d) => setAiBaseUrl(d.value)}
                        placeholder="例如: https://api.openai.com/v1"
                        contentBefore={<Globe20Regular style={{ opacity: 0.5 }} />}
                        disabled={isAiLoading}
                      />
                    </Field>

                    {/* 模型名称 */}
                    <Field label="模型名称" required>
                      <Input
                        value={aiModelName}
                        onChange={(_, d) => setAiModelName(d.value)}
                        placeholder="例如: gpt-4o, deepseek-chat"
                        contentBefore={<Bot20Regular style={{ opacity: 0.5 }} />}
                        disabled={isAiLoading}
                      />
                    </Field>

                    {/* API 密钥 */}
                    <Field
                      label={
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>API Key</span>
                          {aiHasKey && (
                            <Badge appearance="tint" color="success" size="small">
                              已配置 {aiMaskedKey}
                            </Badge>
                          )}
                        </div>
                      }
                    >
                      <Input
                        type={showAiKey ? "text" : "password"}
                        value={aiApiKey}
                        onChange={(_, d) => setAiApiKey(d.value)}
                        placeholder={aiHasKey ? "留空保持不变" : "sk-..."}
                        contentBefore={<Key20Regular style={{ opacity: 0.5 }} />}
                        contentAfter={
                          <Button
                            appearance="subtle"
                            icon={showAiKey ? <EyeOff20Regular /> : <Eye20Regular />}
                            onClick={() => setShowAiKey(!showAiKey)}
                          />
                        }
                        disabled={isAiLoading}
                      />
                    </Field>

                    {/* 测试状态通知 */}
                    {aiTestMessage && (
                      <MessageBar
                        intent={aiTestStatus === "success" ? "success" : "error"}
                        style={{ borderRadius: "6px", fontSize: "12px", padding: "4px 8px" }}
                      >
                        <MessageBarBody>{aiTestMessage}</MessageBarBody>
                      </MessageBar>
                    )}

                    {/* 保存状态通知 */}
                    {aiSaveMessage && (
                      <MessageBar
                        intent={aiSaveStatus === "success" ? "success" : "error"}
                        style={{ borderRadius: "6px", fontSize: "12px", padding: "4px 8px" }}
                      >
                        <MessageBarBody>{aiSaveMessage}</MessageBarBody>
                      </MessageBar>
                    )}
                  </div>
                )}

                {/* 2. 背景壁纸设置 TAB */}
                {activeTab === "wallpaper" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 500 }}>启用背景壁纸</span>
                        {!isTiany && (
                          <Badge appearance="tint" color="warning" size="small">
                            只读
                          </Badge>
                        )}
                      </div>
                      <Switch
                        checked={wpEnabled}
                        disabled={!isTiany}
                        onChange={(_, data) => setWpEnabled(data.checked)}
                      />
                    </div>

                    {/* 壁纸缩略预览与切换 */}
                    {wpEnabled && currentWallpaper && (
                      <div
                        style={{
                          borderRadius: "8px",
                          overflow: "hidden",
                          border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
                        }}
                      >
                        <div
                          style={{
                            height: "90px",
                            position: "relative",
                            backgroundImage: `url("${currentWallpaper.base64 || currentWallpaper.url}")`,
                            backgroundSize: "cover",
                            backgroundPosition: "center center",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              padding: "4px 8px",
                              background: "linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, transparent 100%)",
                              color: "#ffffff",
                            }}
                          >
                            <div style={{ fontSize: "12px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {currentWallpaper.title}
                            </div>
                          </div>
                        </div>

                        {/* 换壁纸控制条 */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "4px 8px",
                            backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                          }}
                        >
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<ArrowLeft20Regular />}
                            disabled={!isTiany}
                            onClick={prevWallpaper}
                          >
                            上一张
                          </Button>
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<ArrowSync20Regular />}
                            disabled={!isTiany}
                            onClick={refreshWallpaper}
                          >
                            刷新
                          </Button>
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<ArrowRight20Regular />}
                            disabled={!isTiany}
                            onClick={nextWallpaper}
                          >
                            下一张
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* 模糊度调节 */}
                    {wpEnabled && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 500 }}>模糊度</span>
                          <span style={{ fontSize: "11.5px", opacity: 0.7 }}>{wpBlur}px</span>
                        </div>
                        <Slider
                          min={0}
                          max={30}
                          value={wpBlur}
                          disabled={!isTiany}
                          onChange={(_, d) => setWpBlur(d.value)}
                          style={{ width: "100%" }}
                        />
                      </div>
                    )}

                    {/* 不透明度调节 */}
                    {wpEnabled && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 500 }}>不透明度</span>
                          <span style={{ fontSize: "11.5px", opacity: 0.7 }}>{Math.round(wpOpacity * 100)}%</span>
                        </div>
                        <Slider
                          min={10}
                          max={85}
                          value={Math.round(wpOpacity * 100)}
                          disabled={!isTiany}
                          onChange={(_, d) => setWpOpacity(Math.round(d.value) / 100)}
                          style={{ width: "100%" }}
                        />
                      </div>
                    )}

                    {/* 壁纸保存状态通知 */}
                    {wpSaveMsg && (
                      <MessageBar
                        intent={wpSaveStatus === "success" ? "success" : "error"}
                        style={{ borderRadius: "6px", fontSize: "12px", padding: "4px 8px" }}
                      >
                        <MessageBarBody>{wpSaveMsg}</MessageBarBody>
                      </MessageBar>
                    )}
                  </div>
                )}

                {/* 3. 个人资料 TAB */}
                {activeTab === "profile" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {/* 头像展示与操作 */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                        border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
                      }}
                    >
                      <Avatar
                        name={user?.nickname || user?.username || "用户"}
                        image={user?.avatar ? { src: user.avatar } : undefined}
                        color="brand"
                        size={40}
                      />

                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {user?.nickname || user?.username}
                        </div>
                        <div style={{ fontSize: "11px", opacity: 0.6 }}>@{user?.username}</div>
                      </div>

                      <div style={{ display: "flex", gap: "6px" }}>
                        <Button
                          appearance="secondary"
                          size="small"
                          icon={<Camera20Regular />}
                          onClick={() => setIsAvatarCropOpen(true)}
                        >
                          更换头像
                        </Button>
                        {user?.avatar && (
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<Delete20Regular />}
                            onClick={handleResetAvatar}
                          >
                            重置
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 用户名与昵称 (并排显示) */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <Field label="用户名">
                        <Input
                          value={user?.username || ""}
                          readOnly
                          contentBefore={<Person20Regular style={{ opacity: 0.5 }} />}
                        />
                      </Field>

                      <Field label="昵称">
                        <Input
                          value={nicknameInput}
                          onChange={(_, d) => setNicknameInput(d.value)}
                          placeholder="输入昵称"
                          contentBefore={<Person20Regular style={{ opacity: 0.5 }} />}
                          style={{ width: "100%" }}
                        />
                      </Field>
                    </div>

                    {nicknameMsg && (
                      <MessageBar
                        intent={nicknameMsg.type === "success" ? "success" : "error"}
                        style={{ borderRadius: "8px", fontSize: "13px", padding: "6px 12px" }}
                      >
                        <MessageBarBody>{nicknameMsg.text}</MessageBarBody>
                      </MessageBar>
                    )}

                    {/* 操作行列表 */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "6px" }}>
                      {/* 密码修改 */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
                          backgroundColor: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.015)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <LockClosed20Regular style={{ color: "#5B7B8D", fontSize: "18px" }} />
                          <span style={{ fontWeight: 500, fontSize: "14px" }}>账号密码</span>
                        </div>
                        <Button
                          appearance="secondary"
                          icon={<Key20Regular />}
                          onClick={() => setIsChangePasswordOpen(true)}
                        >
                          修改密码
                        </Button>
                      </div>

                      {/* 用户管理控制台入口 */}
                      {isTiany && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            borderRadius: "10px",
                            border: isDark ? "1px solid rgba(91, 123, 141, 0.25)" : "1px solid rgba(91, 123, 141, 0.2)",
                            backgroundColor: isDark ? "rgba(91, 123, 141, 0.06)" : "rgba(91, 123, 141, 0.03)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <PeopleCommunity20Regular style={{ color: "#5B7B8D", fontSize: "18px" }} />
                            <span style={{ fontWeight: 500, fontSize: "14px" }}>用户管理控制台</span>
                          </div>
                          <Button
                            appearance="primary"
                            icon={<PeopleCommunity20Regular />}
                            onClick={() => {
                              closeSettings();
                              navigate("/workspace/users");
                            }}
                          >
                            进入管理
                          </Button>
                        </div>
                      )}

                      {/* 退出登录 */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: isDark ? "1px solid rgba(209, 52, 56, 0.2)" : "1px solid rgba(209, 52, 56, 0.15)",
                          backgroundColor: isDark ? "rgba(209, 52, 56, 0.04)" : "rgba(209, 52, 56, 0.02)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <SignOut20Regular style={{ color: "#d13438", fontSize: "18px" }} />
                          <span style={{ fontWeight: 500, fontSize: "14px", color: "#d13438" }}>退出登录</span>
                        </div>
                        <Button
                          appearance="subtle"
                          className="btn-danger"
                          style={{ color: "#d13438" }}
                          onClick={() => setIsLogoutConfirmOpen(true)}
                        >
                          退出账号
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. 界面外观 TAB */}
                {activeTab === "theme" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {/* 主题选择卡片 */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                      {[
                        {
                          mode: "auto" as ThemeMode,
                          title: "跟随系统",
                          icon: <Desktop20Regular style={{ fontSize: "18px" }} />,
                        },
                        {
                          mode: "dark" as ThemeMode,
                          title: "深色",
                          icon: <WeatherMoon20Regular style={{ fontSize: "18px" }} />,
                        },
                        {
                          mode: "light" as ThemeMode,
                          title: "浅色",
                          icon: <WeatherSunny20Regular style={{ fontSize: "18px" }} />,
                        },
                      ].map((item) => {
                        const isSelected = themeMode === item.mode;
                        return (
                          <div
                            key={item.mode}
                            onClick={() => setThemeMode(item.mode)}
                            style={{
                              padding: "10px 8px",
                              borderRadius: "8px",
                              border: isSelected
                                ? "1.5px solid #5B7B8D"
                                : isDark
                                ? "1px solid rgba(255, 255, 255, 0.1)"
                                : "1px solid rgba(0, 0, 0, 0.1)",
                              backgroundColor: isSelected
                                ? isDark
                                  ? "rgba(91, 123, 141, 0.2)"
                                  : "rgba(91, 123, 141, 0.08)"
                                : isDark
                                ? "rgba(255, 255, 255, 0.03)"
                                : "rgba(0, 0, 0, 0.02)",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "6px",
                              textAlign: "center",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <span style={{ color: isSelected ? "#5B7B8D" : isDark ? "#cbd5e0" : "#4a5568" }}>
                              {item.icon}
                            </span>
                            <span style={{ fontWeight: 500, fontSize: "12.5px" }}>{item.title}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* 代码块深色高亮开关 */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500, fontSize: "13px" }}>
                          代码块始终深色
                        </div>
                        <div style={{ opacity: 0.6, fontSize: "11.5px" }}>
                          浅色模式下保持代码深色高亮
                        </div>
                      </div>
                      <Switch
                        checked={forceCodeDark}
                        onChange={(_, d) => setForceCodeDark(d.checked)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 底部固定区：统一取消与保存并关闭按钮置于右下角 */}
            <footer
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: isMobile
                  ? "8px 12px max(10px, env(safe-area-inset-bottom))"
                  : "8px 16px",
                borderTop: isDark
                  ? "1px solid rgba(255, 255, 255, 0.08)"
                  : "1px solid rgba(0, 0, 0, 0.06)",
                backgroundColor: isDark ? "rgba(0, 0, 0, 0.15)" : "rgba(0, 0, 0, 0.015)",
                flexShrink: 0,
              }}
            >
              {/* 左侧操作：AI 选项卡显示测试连接 */}
              <div>
                {activeTab === "ai" && (
                  <Button
                    appearance="secondary"
                    size="small"
                    icon={isAiTesting ? <Spinner size="tiny" /> : <PlugConnected20Regular />}
                    onClick={handleTestAi}
                    disabled={isAiTesting || isAiSaving || isAiLoading}
                    style={{ minHeight: "36px" }}
                  >
                    {isAiTesting ? "测试中..." : "测试连接"}
                  </Button>
                )}
              </div>

              {/* 右下角统一操作按钮：取消 + 保存并关闭 */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Button
                  appearance="secondary"
                  onClick={closeSettings}
                  style={{ borderRadius: "8px", minWidth: "76px", minHeight: "36px" }}
                >
                  取消
                </Button>

                <Button
                  appearance="primary"
                  icon={
                    isAiSaving || isWpSaving || isUpdatingNickname ? (
                      <Spinner size="tiny" />
                    ) : (
                      <Save20Regular />
                    )
                  }
                  onClick={handleSaveAndClose}
                  disabled={
                    isAiTesting ||
                    isAiSaving ||
                    isAiLoading ||
                    isWpSaving ||
                    isUpdatingNickname
                  }
                  style={{
                    backgroundColor: "#5B7B8D",
                    fontWeight: 600,
                    minWidth: "110px",
                    minHeight: "36px",
                    borderRadius: "8px",
                  }}
                >
                  {isAiSaving || isWpSaving || isUpdatingNickname
                    ? "保存中..."
                    : "保存并关闭"}
                </Button>
              </div>
            </footer>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* 头像在线裁剪弹窗 */}
      <AvatarCropModal
        isOpen={isAvatarCropOpen}
        onClose={() => setIsAvatarCropOpen(false)}
      />

      {/* 独立修改密码弹窗 */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* 退出登录确认弹窗 */}
      <Dialog
        open={isLogoutConfirmOpen}
        onOpenChange={(_, data) => setIsLogoutConfirmOpen(data.open)}
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
                onClick={() => setIsLogoutConfirmOpen(false)}
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
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  closeSettings();
                  logout();
                  navigate("/");
                }}
              >
                退出登录
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};

export default UnifiedSettingsModal;
