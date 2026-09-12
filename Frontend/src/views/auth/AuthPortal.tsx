import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Body1,
  Button,
  Card,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Subtitle1,
  Tab,
  TabList,
  Title3,
} from "@fluentui/react-components";
import {
  ArrowLeft20Regular,
  LockClosed20Regular,
  Notebook24Filled,
  Person20Regular,
  PersonAdd20Regular,
  Sparkle20Regular,
} from "@fluentui/react-icons";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";

export const AuthPortal: React.FC = () => {
  const { isDark } = useAppTheme();
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg("用户名和密码不能为空");
      return;
    }

    setIsSubmitting(true);
    try {
      const redirectAfterAuth = () => {
        const pending = sessionStorage.getItem("pending_template");
        if (pending) {
          sessionStorage.removeItem("pending_template");
          try {
            const parsed = JSON.parse(pending);
            navigate("/workspace/new", { state: parsed });
            return;
          } catch {
            // fallback
          }
        }
        navigate("/workspace");
      };

      if (mode === "login") {
        const res = await login(username.trim(), password.trim());
        if (res.success) {
          redirectAfterAuth();
        } else {
          setErrorMsg(res.message || "登录失败，请检查用户名与密码");
        }
      } else {
        const res = await register(
          username.trim(),
          password.trim(),
          nickname.trim() || undefined
        );
        if (res.success) {
          redirectAfterAuth();
        } else {
          setErrorMsg(res.message || "注册失败，请更换用户名重试");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "calc(100vh - var(--header-height, 64px))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        background: isDark
          ? "radial-gradient(ellipse at 50% 30%, rgba(0, 120, 212, 0.15) 0%, transparent 70%)"
          : "radial-gradient(ellipse at 50% 30%, rgba(0, 120, 212, 0.08) 0%, transparent 70%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Back Link */}
        <div style={{ marginBottom: "20px" }}>
          <Button
            onClick={() => navigate("/")}
            appearance="subtle"
            icon={<ArrowLeft20Regular />}
            size="small"
          >
            返回公开广场
          </Button>
        </div>

        {/* Auth Card */}
        <Card
          className="auth-portal-card"
          style={{
            borderRadius: "16px",
            padding: "32px 28px",
            backgroundColor: isDark ? "#202026" : "#ffffff",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: isDark
              ? "0 16px 48px rgba(0, 0, 0, 0.5)"
              : "0 16px 48px rgba(0, 120, 212, 0.12)",
          }}
        >
          {/* Logo & Header */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #0078d4, #60a5fa)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 6px 18px rgba(0, 120, 212, 0.35)",
                marginBottom: "12px",
              }}
            >
              <Notebook24Filled />
            </div>
            <Title3 style={{ fontWeight: 700, display: "block" }}>拾光手记 · 账户中心</Title3>
            <Body1 style={{ opacity: 0.65, fontSize: "13px", marginTop: "4px" }}>
              登录进入您的专属云端灵感手记工作台
            </Body1>
          </div>

          {/* Mode Switch Tabs */}
          <div style={{ marginBottom: "20px" }}>
            <TabList
              selectedValue={mode}
              onTabSelect={(_, data) => {
                setMode(data.value as "login" | "register");
                setErrorMsg(null);
              }}
              style={{ width: "100%", justifyContent: "center" }}
            >
              <Tab value="login" style={{ flex: 1 }}>
                用户登录
              </Tab>
              <Tab value="register" style={{ flex: 1 }}>
                新用户注册
              </Tab>
            </TabList>
          </div>

          {/* Error Message Bar */}
          {errorMsg && (
            <MessageBar intent="error" style={{ marginBottom: "16px" }}>
              <MessageBarBody>{errorMsg}</MessageBarBody>
            </MessageBar>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Field label="账号用户名" required>
              <Input
                contentBefore={<Person20Regular />}
                placeholder="请输入用户名"
                value={username}
                onChange={(_, data) => setUsername(data.value)}
                autoComplete="username"
                disabled={isSubmitting}
              />
            </Field>

            {mode === "register" && (
              <Field label="个性昵称">
                <Input
                  contentBefore={<Sparkle20Regular />}
                  placeholder="请输入您的手记昵称"
                  value={nickname}
                  onChange={(_, data) => setNickname(data.value)}
                  disabled={isSubmitting}
                />
              </Field>
            )}

            <Field label="账户密码" required>
              <Input
                type="password"
                contentBefore={<LockClosed20Regular />}
                placeholder="请输入登录密码"
                value={password}
                onChange={(_, data) => setPassword(data.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                disabled={isSubmitting}
              />
            </Field>

            <Button
              type="submit"
              appearance="primary"
              size="large"
              icon={isSubmitting ? <Spinner size="tiny" /> : mode === "login" ? <Person20Regular /> : <PersonAdd20Regular />}
              disabled={isSubmitting}
              style={{
                marginTop: "12px",
                background: "linear-gradient(135deg, #0078d4, #005a9e)",
                fontWeight: 600,
                borderRadius: "8px",
              }}
            >
              {isSubmitting ? "正在处理中..." : mode === "login" ? "立即登录工作台" : "完成注册并进入"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
