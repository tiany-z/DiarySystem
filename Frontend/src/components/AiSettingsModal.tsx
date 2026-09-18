import React, { useEffect, useState } from "react";
import {
  Badge,
  Body1,
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
  Spinner,
  Tooltip,
} from "@fluentui/react-components";
import {
  Bot20Regular,
  Checkmark20Regular,
  Dismiss20Regular,
  Eye20Regular,
  EyeOff20Regular,
  Globe20Regular,
  Key20Regular,
  PlugConnected20Regular,
  Save20Regular,
  Sparkle20Regular,
} from "@fluentui/react-icons";
import { getAiConfig, saveAiConfig, testAiConfig } from "../api/ai";
import { useAppTheme } from "../context/ThemeContext";
import { useAppDialogMotion } from "../utils/dialogMotion";

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

interface AiSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({
  open,
  onClose,
  onConfigSaved,
}) => {
  const { isDark } = useAppTheme();
  const { surfaceMotion, backdropMotion, isMobile } = useAppDialogMotion();

  const [baseUrl, setBaseUrl] = useState("");
  const [modelName, setModelName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");

  const [activePreset, setActivePreset] = useState<string | null>(null);

  // 弹窗打开时加载已有配置
  useEffect(() => {
    if (!open) {
      setTestStatus("idle");
      setTestMessage("");
      setSaveStatus("idle");
      setSaveMessage("");
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getAiConfig()
      .then((res) => {
        if (!isMounted) return;
        if (res.status === 1 && res.data) {
          setBaseUrl(res.data.baseUrl || "");
          setModelName(res.data.modelName || "");
          setHasKey(res.data.hasKey || false);
          setMaskedKey(res.data.maskedKey || "");
          setApiKey("");

          // 匹配当前已选 preset
          const matched = AI_PRESETS.find(
            (p) => p.baseUrl.toLowerCase() === (res.data?.baseUrl || "").toLowerCase()
          );
          if (matched) setActivePreset(matched.id);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setSaveStatus("error");
        setSaveMessage(`获取配置异常: ${err.message || String(err)}`);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open]);

  // 选择预设模板
  const handleSelectPreset = (preset: AiProviderPreset) => {
    setActivePreset(preset.id);
    setBaseUrl(preset.baseUrl);
    setModelName(preset.defaultModel);
    setTestStatus("idle");
    setTestMessage("");
  };

  // 连通性测试
  const handleTestConnection = async () => {
    if (!baseUrl.trim()) {
      setTestStatus("error");
      setTestMessage("请填写接口地址");
      return;
    }
    if (!modelName.trim()) {
      setTestStatus("error");
      setTestMessage("请填写模型名称");
      return;
    }
    if (!apiKey.trim() && !hasKey) {
      setTestStatus("error");
      setTestMessage("请填写 API 密钥");
      return;
    }

    setIsTesting(true);
    setTestStatus("idle");
    setTestMessage("");

    try {
      const res = await testAiConfig({
        baseUrl: baseUrl.trim(),
        modelName: modelName.trim(),
        apiKey: apiKey.trim() || undefined,
      });

      if (res.status === 1 && res.data) {
        setTestStatus("success");
        setTestMessage(res.data.message || `连通成功，延迟 ${res.data.latencyMs || 0}ms`);
      } else {
        setTestStatus("error");
        setTestMessage(res.content || "测试失败，请检查配置与网络");
      }
    } catch (err: any) {
      setTestStatus("error");
      setTestMessage(`测试失败: ${err.message || String(err)}`);
    } finally {
      setIsTesting(false);
    }
  };

  // 保存设置
  const handleSave = async () => {
    if (!baseUrl.trim()) {
      setSaveStatus("error");
      setSaveMessage("接口地址不能为空");
      return;
    }
    if (!modelName.trim()) {
      setSaveStatus("error");
      setSaveMessage("模型名称不能为空");
      return;
    }

    setIsSaving(true);
    setSaveStatus("idle");
    setSaveMessage("");

    try {
      const res = await saveAiConfig({
        baseUrl: baseUrl.trim(),
        modelName: modelName.trim(),
        apiKey: apiKey.trim() || undefined,
      });

      if (res.status === 1 && res.data) {
        setSaveStatus("success");
        setSaveMessage("设置已保存");
        setHasKey(res.data.hasKey);
        setMaskedKey(res.data.maskedKey);
        setApiKey("");
        onConfigSaved?.();
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setSaveStatus("error");
        setSaveMessage(res.content || "保存失败");
      }
    } catch (err: any) {
      setSaveStatus("error");
      setSaveMessage(`保存异常: ${err.message || String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 当前预设可选的模型列表
  const currentPresetModels = AI_PRESETS.find((p) => p.id === activePreset)?.models || [];

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()} surfaceMotion={surfaceMotion}>
      <DialogSurface
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
          width: isMobile ? "100%" : "540px",
          maxWidth: isMobile ? "100%" : "92vw",
          height: isMobile ? "100%" : undefined,
          maxHeight: isMobile ? "100%" : "88vh",
          margin: isMobile ? 0 : "auto",
          borderRadius: isMobile ? 0 : "16px",
          padding: 0,
          border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: isDark
            ? "0 24px 48px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.06)"
            : "0 24px 48px -12px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.04)",
          backgroundColor: isDark ? "rgba(36, 36, 36, 0.88)" : "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <DialogBody style={{ padding: 0, margin: 0, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Header */}
          <DialogTitle
            action={
              <Button
                appearance="subtle"
                aria-label="关闭"
                icon={<Dismiss20Regular />}
                onClick={onClose}
                style={{ borderRadius: "8px" }}
              />
            }
            style={{
              padding: "16px 20px",
              margin: 0,
              borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(91, 123, 141, 0.15)",
                  color: "#5B7B8D",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot20Regular />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "16px" }}>AI 助手设置</div>
                <Caption1 style={{ opacity: 0.65 }}>配置大模型服务接入地址与密钥</Caption1>
              </div>
            </div>
          </DialogTitle>

          {/* Content */}
          <DialogContent
            style={{
              padding: "20px",
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            {isLoading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
                <Spinner label="正在读取配置..." />
              </div>
            ) : (
              <>
                {/* 快捷服务商预设 */}
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "8px", opacity: 0.8 }}>
                    推荐服务商
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {AI_PRESETS.map((preset) => {
                      const isSelected = activePreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            border: isSelected
                              ? "1px solid #5B7B8D"
                              : isDark
                              ? "1px solid rgba(255, 255, 255, 0.1)"
                              : "1px solid rgba(0, 0, 0, 0.1)",
                            backgroundColor: isSelected
                              ? "rgba(91, 123, 141, 0.18)"
                              : isDark
                              ? "rgba(255, 255, 255, 0.04)"
                              : "rgba(0, 0, 0, 0.03)",
                            color: isSelected ? (isDark ? "#8cb3c8" : "#3b5869") : "inherit",
                            fontWeight: isSelected ? 600 : 400,
                            transition: "all 0.15s ease",
                          }}
                        >
                          <span>{preset.icon}</span>
                          <span>{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* API Base URL */}
                <Field
                  label="接口地址"
                  required
                  hint="兼容 OpenAI 规范的 API 服务地址"
                >
                  <Input
                    value={baseUrl}
                    onChange={(_, data) => {
                      setBaseUrl(data.value);
                      setTestStatus("idle");
                    }}
                    placeholder="例如: https://api.deepseek.com"
                    contentBefore={<Globe20Regular style={{ opacity: 0.6 }} />}
                    style={{ width: "100%" }}
                  />
                </Field>

                {/* Model Name */}
                <Field
                  label="模型名称"
                  required
                  hint="例如 deepseek-reasoner 或 gpt-4o"
                >
                  <Input
                    value={modelName}
                    onChange={(_, data) => {
                      setModelName(data.value);
                      setTestStatus("idle");
                    }}
                    placeholder="输入模型名称"
                    contentBefore={<Sparkle20Regular style={{ opacity: 0.6 }} />}
                    style={{ width: "100%" }}
                  />
                </Field>

                {/* 候选模型推荐标签 */}
                {currentPresetModels.length > 0 && (
                  <div style={{ marginTop: "-8px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <Caption1 style={{ opacity: 0.6 }}>推荐模型:</Caption1>
                    {currentPresetModels.map((m) => (
                      <Badge
                        key={m}
                        appearance={modelName === m ? "filled" : "tint"}
                        color={modelName === m ? "brand" : "subtle"}
                        style={{ cursor: "pointer", fontSize: "11px" }}
                        onClick={() => {
                          setModelName(m);
                          setTestStatus("idle");
                        }}
                      >
                        {m}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* API Key */}
                <Field
                  label="API 密钥"
                  hint={
                    hasKey
                      ? `当前密钥: ${maskedKey}，留空则保持不变`
                      : "请输入大模型服务商签发的 API Key"
                  }
                >
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={apiKey}
                    onChange={(_, data) => {
                      setApiKey(data.value);
                      setTestStatus("idle");
                    }}
                    placeholder={hasKey ? "留空保持原密钥" : "请输入密钥"}
                    contentBefore={<Key20Regular style={{ opacity: 0.6 }} />}
                    contentAfter={
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={showPassword ? <EyeOff20Regular /> : <Eye20Regular />}
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="查看/隐藏密码"
                      />
                    }
                    style={{ width: "100%" }}
                  />
                </Field>

                {/* 连通性测试按钮与反馈区 */}
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                    border: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.05)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Body1 style={{ fontSize: "12px", fontWeight: 600 }}>连通性测试</Body1>
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={isTesting ? <Spinner size="tiny" /> : <PlugConnected20Regular />}
                      disabled={isTesting}
                      onClick={handleTestConnection}
                      style={{ borderRadius: "6px" }}
                    >
                      {isTesting ? "正在测试..." : "测试连通性"}
                    </Button>
                  </div>

                  {testStatus === "success" && (
                    <MessageBar intent="success" style={{ borderRadius: "6px" }}>
                      <MessageBarBody>{testMessage}</MessageBarBody>
                    </MessageBar>
                  )}

                  {testStatus === "error" && (
                    <MessageBar intent="error" style={{ borderRadius: "6px" }}>
                      <MessageBarBody>{testMessage}</MessageBarBody>
                    </MessageBar>
                  )}
                </div>

                {/* 保存提示信息 */}
                {saveStatus === "success" && (
                  <MessageBar intent="success" style={{ borderRadius: "8px" }}>
                    <MessageBarBody>{saveMessage}</MessageBarBody>
                  </MessageBar>
                )}
                {saveStatus === "error" && (
                  <MessageBar intent="error" style={{ borderRadius: "8px" }}>
                    <MessageBarBody>{saveMessage}</MessageBarBody>
                  </MessageBar>
                )}
              </>
            )}
          </DialogContent>

          {/* Actions */}
          <DialogActions
            style={{
              padding: "14px 20px",
              margin: 0,
              borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
            }}
          >
            <Button appearance="secondary" onClick={onClose} style={{ borderRadius: "8px" }}>
              取消
            </Button>
            <Button
              appearance="primary"
              icon={isSaving ? <Spinner size="tiny" /> : <Save20Regular />}
              disabled={isSaving || isLoading}
              onClick={handleSave}
              style={{
                backgroundColor: "#5B7B8D",
                borderRadius: "8px",
                fontWeight: 600,
              }}
            >
              {isSaving ? "正在保存..." : "保存"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default AiSettingsModal;
