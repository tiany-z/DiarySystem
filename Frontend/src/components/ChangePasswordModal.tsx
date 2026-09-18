import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Title3,
  Tooltip,
} from "@fluentui/react-components";
import {
  Dismiss20Regular,
  Key20Regular,
  LockClosed20Regular,
  Save20Regular,
} from "@fluentui/react-icons";
import { userApi } from "../api/auth";
import { useAppTheme } from "../context/ThemeContext";
import { useAppDialogMotion } from "../utils/dialogMotion";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isDark } = useAppTheme();
  const { surfaceMotion, backdropMotion, isMobile } = useAppDialogMotion();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleResetForm = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMsg(null);
    setIsUpdating(false);
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!oldPassword.trim()) {
      setMsg({ type: "error", text: "请输入原密码" });
      return;
    }
    if (newPassword.trim().length < 6) {
      setMsg({ type: "error", text: "新密码不能少于 6 位" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ type: "error", text: "两次输入密码不一致" });
      return;
    }

    setIsUpdating(true);
    setMsg(null);

    try {
      const res = await userApi.updateProfile({
        oldPassword: oldPassword.trim(),
        newPassword: newPassword.trim(),
      });
      if (res.status === 1) {
        setMsg({ type: "success", text: "密码已更新" });
        setTimeout(() => {
          handleClose();
        }, 1200);
      } else {
        setMsg({ type: "error", text: res.content || "原密码错误" });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "网络异常" });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(_, data) => !data.open && handleClose()}
      surfaceMotion={surfaceMotion}
    >
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
          width: isMobile ? "100vw" : "420px",
          maxWidth: isMobile ? "100vw" : "420px",
          borderRadius: isMobile ? 0 : "14px",
          padding: 0,
          backgroundColor: isDark ? "#1a1a22" : "#ffffff",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: isDark
            ? "0 24px 64px rgba(0, 0, 0, 0.65)"
            : "0 20px 48px rgba(0, 0, 0, 0.15)",
        }}
      >
        <DialogBody style={{ padding: 0 }}>
          {/* Header */}
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px 14px",
              borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <LockClosed20Regular style={{ color: "#5B7B8D" }} />
              <Title3 style={{ fontWeight: 600, fontSize: "16px" }}>修改密码</Title3>
            </div>
            <Tooltip content="关闭" relationship="label">
              <Button
                appearance="subtle"
                icon={<Dismiss20Regular />}
                onClick={handleClose}
                aria-label="关闭"
                size="small"
              />
            </Tooltip>
          </header>

          {/* Form Content */}
          <form onSubmit={handleSubmit}>
            <div
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <Field label="原密码" required>
                <Input
                  type="password"
                  value={oldPassword}
                  onChange={(_, d) => setOldPassword(d.value)}
                  placeholder="当前密码"
                  contentBefore={<Key20Regular style={{ opacity: 0.5 }} />}
                  autoFocus
                />
              </Field>

              <Field label="新密码" required>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(_, d) => setNewPassword(d.value)}
                  placeholder="至少 6 位"
                  contentBefore={<LockClosed20Regular style={{ opacity: 0.5 }} />}
                />
              </Field>

              <Field label="确认密码" required>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(_, d) => setConfirmPassword(d.value)}
                  placeholder="再次输入新密码"
                  contentBefore={<LockClosed20Regular style={{ opacity: 0.5 }} />}
                />
              </Field>

              {msg && (
                <MessageBar
                  intent={msg.type === "success" ? "success" : "error"}
                  style={{ borderRadius: "8px", fontSize: "12.5px" }}
                >
                  <MessageBarBody>{msg.text}</MessageBarBody>
                </MessageBar>
              )}
            </div>

            {/* Actions */}
            <footer
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                padding: "12px 20px",
                borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
                backgroundColor: isDark ? "rgba(0, 0, 0, 0.15)" : "rgba(0, 0, 0, 0.015)",
              }}
            >
              <Button appearance="secondary" onClick={handleClose}>
                取消
              </Button>
              <Button
                type="submit"
                appearance="primary"
                icon={isUpdating ? <Spinner size="tiny" /> : <Save20Regular />}
                disabled={isUpdating || !oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
                style={{ backgroundColor: "#5B7B8D", fontWeight: 600 }}
              >
                {isUpdating ? "修改中..." : "确认修改"}
              </Button>
            </footer>
          </form>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default ChangePasswordModal;
