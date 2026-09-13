import React, { useEffect, useState } from "react";
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
  Title3,
  Tooltip,
} from "@fluentui/react-components";
import {
  ArrowLeft20Regular,
  Eye20Regular,
  EyeOff20Regular,
  LockClosed20Regular,
  Person20Regular,
  ShieldCheckmark20Regular,
} from "@fluentui/react-icons";
import { useAuth } from "../../context/AuthContext";
import { usePageCache } from "../../context/PageCacheContext";
import { useAppTheme } from "../../context/ThemeContext";
import { BrandLogo } from "../../components/BrandLogo";

export const AuthPortal: React.FC = () => {
  const { isDark } = useAppTheme();
  const { login } = useAuth();
  const navigate = useNavigate();

  const { hasPageLoaded, markPageLoaded } = usePageCache();
  const PAGE_KEY = "auth_portal";
  const alreadyLoaded = hasPageLoaded(PAGE_KEY);
  const [shouldAnimate] = useState<boolean>(!alreadyLoaded);

  useEffect(() => {
    if (!alreadyLoaded) {
      markPageLoaded(PAGE_KEY);
    }
  }, []);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
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

      const res = await login(cleanUsername, cleanPassword);
      if (res.success) {
        redirectAfterAuth();
      } else {
        setErrorMsg(res.message || "登录失败，请检查用户名与密码");
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
          ? "radial-gradient(ellipse at 50% 30%, rgba(91, 123, 141, 0.18) 0%, transparent 70%)"
          : "radial-gradient(ellipse at 50% 30%, rgba(91, 123, 141, 0.1) 0%, transparent 70%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Back Link */}
        <div className="win10-tile-rise win10-delay-1" style={{ marginBottom: "20px" }}>
          <Button
            onClick={() => navigate("/")}
            appearance="subtle"
            icon={<ArrowLeft20Regular />}
            size="small"
          >
            返回广场
          </Button>
        </div>

        {/* Auth Card */}
        <Card
          className="auth-portal-card win10-tile-rise win10-delay-2"
          style={{
            borderRadius: "16px",
            padding: "36px 32px",
            backgroundColor: isDark ? "#202026" : "#ffffff",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: isDark
              ? "0 16px 48px rgba(0, 0, 0, 0.5)"
              : "0 16px 48px rgba(91, 123, 141, 0.12)",
          }}
        >
          {/* Logo & Header */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <BrandLogo size={52} style={{ marginBottom: "14px", boxShadow: "0 6px 20px rgba(91, 123, 141, 0.35)" }} />
            <Title3 style={{ fontWeight: 700, display: "block", fontSize: "20px" }}>
              账户登录
            </Title3>
            <Body1 style={{ opacity: 0.65, fontSize: "13px", marginTop: "6px", display: "block" }}>
              输入用户名与密码以登录
            </Body1>
          </div>

          {/* Error Message Bar */}
          {errorMsg && (
            <MessageBar intent="error" style={{ marginBottom: "18px" }}>
              <MessageBarBody>{errorMsg}</MessageBarBody>
            </MessageBar>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Field label="用户名" required>
              <Input
                name="username"
                id="login-username"
                contentBefore={<Person20Regular />}
                placeholder="请输入用户名"
                value={username}
                onChange={(_, data) => setUsername(data.value)}
                autoComplete="username"
                disabled={isSubmitting}
                size="large"
              />
            </Field>

            <Field label="密码" required>
              <Input
                name="password"
                id="login-password"
                type={showPassword ? "text" : "password"}
                contentBefore={<LockClosed20Regular />}
                contentAfter={
                  <Tooltip content={showPassword ? "隐藏密码" : "显示密码"} relationship="label">
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={showPassword ? <EyeOff20Regular /> : <Eye20Regular />}
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    />
                  </Tooltip>
                }
                placeholder="请输入密码"
                value={password}
                onChange={(_, data) => setPassword(data.value)}
                autoComplete="current-password"
                disabled={isSubmitting}
                size="large"
              />
            </Field>

            <Button
              type="submit"
              appearance="primary"
              size="large"
              icon={isSubmitting ? <Spinner size="tiny" /> : <Person20Regular />}
              disabled={isSubmitting}
              style={{
                marginTop: "12px",
                height: "42px",
                backgroundColor: "#5B7B8D",
                fontWeight: 600,
                borderRadius: "8px",
                fontSize: "15px",
              }}
            >
              {isSubmitting ? "正在登录..." : "登录"}
            </Button>
          </form>

          {/* Registration Notice */}
          <div
            style={{
              marginTop: "24px",
              padding: "12px 14px",
              borderRadius: "8px",
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(91, 123, 141, 0.06)",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(91, 123, 141, 0.15)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "12px",
              color: isDark ? "#a19f9d" : "#605e5c",
            }}
          >
            <ShieldCheckmark20Regular style={{ color: "#5B7B8D", flexShrink: 0 }} />
            <span>
              如需账号或重置密码，请联系管理员 <strong>tiany</strong>。
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AuthPortal;
