import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Badge,
  Body1,
  Body1Strong,
  Button,
  Caption1,
  Card,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Divider,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Title2,
  Title3,
  Tooltip,
} from "@fluentui/react-components";
import {
  Add20Filled,
  ArrowSync20Regular,
  Delete20Regular,
  Dismiss20Regular,
  Document20Regular,
  Eye20Regular,
  EyeOff20Regular,
  Key20Regular,
  LockClosed20Regular,
  PersonAdd20Regular,
  Person20Regular,
  Search20Regular,
  ShieldCheckmark20Regular,
  Warning20Regular,
} from "@fluentui/react-icons";
import { adminApi, AdminUserInfo } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { usePageCache } from "../../context/PageCacheContext";
import { useAppTheme } from "../../context/ThemeContext";
import { useAppDialogMotion } from "../../utils/dialogMotion";

export const UserManager: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const { surfaceMotion, backdropMotion, isMobile } = useAppDialogMotion();
  const navigate = useNavigate();

  const { hasPageLoaded, markPageLoaded, getCachedData, setCachedData } = usePageCache();
  const PAGE_KEY = "workspace_users";
  const alreadyLoaded = hasPageLoaded(PAGE_KEY);
  const cachedUsers = getCachedData<AdminUserInfo[]>(PAGE_KEY);

  const [users, setUsers] = useState<AdminUserInfo[]>(cachedUsers || []);
  const [isPageLoading, setIsPageLoading] = useState<boolean>(!alreadyLoaded || cachedUsers === null);
  const [shouldAnimate, setShouldAnimate] = useState<boolean>(!alreadyLoaded);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal 状态
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isUpdatePassOpen, setIsUpdatePassOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // 添加用户表单
  const [newUsername, setNewUsername] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newConfirmPassword, setNewConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isAddSubmitting, setIsAddSubmitting] = useState(false);
  const [addModalError, setAddModalError] = useState<string | null>(null);

  // 修改密码表单
  const [selectedUserForPass, setSelectedUserForPass] = useState<AdminUserInfo | null>(null);
  const lastUserForPassRef = useRef<AdminUserInfo | null>(selectedUserForPass);
  if (selectedUserForPass) {
    lastUserForPassRef.current = selectedUserForPass;
  }
  const activeUserForPass = selectedUserForPass || lastUserForPassRef.current;

  const [updatedPassword, setUpdatedPassword] = useState("");
  const [updatedConfirmPassword, setUpdatedConfirmPassword] = useState("");
  const [showUpdatedPassword, setShowUpdatedPassword] = useState(false);
  const [isPassSubmitting, setIsPassSubmitting] = useState(false);
  const [passModalError, setPassModalError] = useState<string | null>(null);

  // 删除用户确认
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<AdminUserInfo | null>(null);
  const lastUserForDeleteRef = useRef<AdminUserInfo | null>(selectedUserForDelete);
  if (selectedUserForDelete) {
    lastUserForDeleteRef.current = selectedUserForDelete;
  }
  const activeUserForDelete = selectedUserForDelete || lastUserForDeleteRef.current;

  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  // 加载用户列表
  const fetchUsers = async (isSilent: boolean = false) => {
    if (!isSilent) {
      setIsPageLoading(true);
      setErrorMsg(null);
    }
    try {
      const res = await adminApi.getUsersList();
      if (res.status === 1 && res.data) {
        setUsers(res.data);
        setCachedData(PAGE_KEY, res.data);
      } else if (!isSilent) {
        setErrorMsg(res.content || "获取用户列表失败");
      }
    } catch (err: any) {
      if (!isSilent) {
        setErrorMsg(`网络请求异常: ${err.message || String(err)}`);
      }
    } finally {
      if (!isSilent) {
        setIsPageLoading(false);
        markPageLoaded(PAGE_KEY);
      }
    }
  };

  useEffect(() => {
    // 保护：仅总管理员 tiany 可访问此控制台
    if (user && user.username !== "tiany") {
      navigate("/workspace", { replace: true });
      return;
    }
    if (alreadyLoaded && cachedUsers !== null) {
      // 页面加载过之后：不显示全屏转圈，不重复动画，后台静默调用一次数据更新直接展示最新数据
      setShouldAnimate(false);
      fetchUsers(true);
    } else {
      // 首次进入：居中转圈，完成后动画显示
      fetchUsers(false);
    }
  }, [user]);

  // 搜索过滤
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.nickname && u.nickname.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  // 汇总统计
  const totalNotes = useMemo(() => {
    return users.reduce((acc, curr) => acc + (Number(curr.note_count) || 0), 0);
  }, [users]);

  // 处理添加用户提交
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddModalError(null);

    const u = newUsername.trim();
    const p = newPassword.trim();
    const nick = newNickname.trim();

    if (!u || !p) {
      setAddModalError("用户名和初始密码不能为空");
      return;
    }
    if (p.length < 6) {
      setAddModalError("密码长度不能小于 6 位");
      return;
    }
    if (p !== newConfirmPassword.trim()) {
      setAddModalError("两次输入的密码不一致");
      return;
    }

    setIsAddSubmitting(true);
    try {
      const res = await adminApi.createUser({
        username: u,
        password: p,
        nickname: nick || undefined,
      });

      if (res.status === 1) {
        setIsAddUserOpen(false);
        setNewUsername("");
        setNewNickname("");
        setNewPassword("");
        setNewConfirmPassword("");
        setSuccessMsg(`已添加用户 [${u}]`);
        await fetchUsers();
      } else {
        setAddModalError(res.content || "创建用户失败");
      }
    } catch (err: any) {
      setAddModalError(err.message || "请求异常");
    } finally {
      setIsAddSubmitting(false);
    }
  };

  // 处理修改密码提交
  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassModalError(null);

    if (!selectedUserForPass) return;
    const p = updatedPassword.trim();

    if (!p) {
      setPassModalError("新密码不能为空");
      return;
    }
    if (p.length < 6) {
      setPassModalError("密码长度不能小于 6 位");
      return;
    }
    if (p !== updatedConfirmPassword.trim()) {
      setPassModalError("两次输入的新密码不一致");
      return;
    }

    setIsPassSubmitting(true);
    try {
      const res = await adminApi.updatePassword({
        userId: selectedUserForPass.id,
        newPassword: p,
      });

      if (res.status === 1) {
        setIsUpdatePassOpen(false);
        setUpdatedPassword("");
        setUpdatedConfirmPassword("");
        setSuccessMsg(`已修改用户 [${selectedUserForPass.username}] 的密码`);
        setSelectedUserForPass(null);
      } else {
        setPassModalError(res.content || "修改密码失败");
      }
    } catch (err: any) {
      setPassModalError(err.message || "请求异常");
    } finally {
      setIsPassSubmitting(false);
    }
  };

  // 处理删除用户提交 (级联清空笔记)
  const handleDeleteUserSubmit = async () => {
    if (!selectedUserForDelete) return;
    setDeleteModalError(null);
    setIsDeleteSubmitting(true);

    try {
      const res = await adminApi.deleteUser({
        userId: selectedUserForDelete.id,
      });

      if (res.status === 1) {
        setIsDeleteOpen(false);
        setSuccessMsg(`已删除用户 [${selectedUserForDelete.username}]`);
        setSelectedUserForDelete(null);
        await fetchUsers();
      } else {
        setDeleteModalError(res.content || "删除用户失败");
      }
    } catch (err: any) {
      setDeleteModalError(err.message || "请求异常");
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="fluent-page-center-loader">
        <Spinner size="large" label="正在获取用户数据..." />
      </div>
    );
  }

  return (
    <div
      className="win10-page-transition-host user-manager-page-container page-content-container"
      style={{
        width: "100%",
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "32px 24px 80px 24px",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      {/* Top Header Bar */}
      <div
        className="win10-tile-rise win10-delay-1 user-manager-header page-header-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <Title2 style={{ fontWeight: 800, margin: 0 }}>用户管理</Title2>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Button
            className="page-header-action-btn"
            appearance="secondary"
            icon={<ArrowSync20Regular />}
            onClick={() => fetchUsers(false)}
            disabled={isPageLoading}
            style={{
              borderRadius: "8px",
              fontWeight: 600,
            }}
            aria-label="刷新"
          >
            <span className="header-action-btn-text">刷新</span>
          </Button>
          <Button
            className="page-header-action-btn"
            appearance="primary"
            icon={<PersonAdd20Regular />}
            onClick={() => {
              setAddModalError(null);
              setIsAddUserOpen(true);
            }}
            style={{
              backgroundColor: "#5B7B8D",
              borderRadius: "8px",
              fontWeight: 600,
            }}
            aria-label="添加用户"
          >
            <span className="header-action-btn-text">添加用户</span>
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <MessageBar intent="error" style={{ marginBottom: "20px" }}>
          <MessageBarBody>{errorMsg}</MessageBarBody>
        </MessageBar>
      )}
      {successMsg && (
        <MessageBar intent="success" style={{ marginBottom: "20px" }}>
          <MessageBarBody>{successMsg}</MessageBarBody>
        </MessageBar>
      )}

      {/* Stats Cards */}
      <div
        className="win10-stagger-grid user-manager-stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <Card
          data-win10-tile
          className="win11-mica-card hover-lift"
          style={{
            padding: "20px 24px",
            borderRadius: "14px",
          }}
        >
          <Caption1 style={{ opacity: 0.65, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            用户总数
          </Caption1>
          <div style={{ fontSize: "32px", fontWeight: 700, color: isDark ? "#8EAEC0" : "#5B7B8D", marginTop: "4px" }}>
            {users.length}
          </div>
          <Caption1 style={{ opacity: 0.6, marginTop: "4px" }}>
            系统注册用户
          </Caption1>
        </Card>

        <Card
          data-win10-tile
          className="win11-mica-card hover-lift"
          style={{
            padding: "20px 24px",
            borderRadius: "14px",
          }}
        >
          <Caption1 style={{ opacity: 0.65, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            笔记总数
          </Caption1>
          <div style={{ fontSize: "32px", fontWeight: 700, color: "#107c41", marginTop: "4px" }}>
            {totalNotes}
          </div>
          <Caption1 style={{ opacity: 0.6, marginTop: "4px" }}>
            包含全部用户笔记
          </Caption1>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="win10-tile-rise win10-delay-3"
        style={{
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ maxWidth: "360px", width: "100%", flex: 1, minWidth: "200px" }}>
          <Input
            className="win11-mica-input"
            contentBefore={<Search20Regular />}
            placeholder="搜索用户姓名或账号..."
            value={searchQuery}
            onChange={(_, data) => setSearchQuery(data.value)}
            style={{ width: "100%", borderRadius: "10px" }}
          />
        </div>
        <Caption1 style={{ opacity: 0.65 }}>
          共 {filteredUsers.length} 位用户
        </Caption1>
      </div>

      {/* User Cards List: 一行用户为一个卡片 */}
      <div
        className="win10-tile-rise win10-delay-4"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {filteredUsers.length === 0 ? (
          <Card
            className="win11-mica-card"
            style={{
              textAlign: "center",
              padding: "60px 20px",
              borderRadius: "14px",
              opacity: 0.7,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Person20Regular style={{ fontSize: "36px", marginBottom: "8px" }} />
            <div>未找到匹配用户</div>
          </Card>
        ) : (
          filteredUsers.map((item) => {
            const isSuperAdmin = item.username === "tiany";
            return (
              <Card
                key={item.id}
                data-win10-tile
                className="user-row-card win11-mica-card hover-lift"
                style={{
                  padding: "14px 20px",
                  borderRadius: "14px",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                {/* User Info (Avatar + Nickname + @username) */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    minWidth: "200px",
                    flex: "1 1 220px",
                  }}
                >
                  <Avatar
                    image={
                      (item.avatar || (user?.username === item.username ? user?.avatar : null))
                        ? { src: (item.avatar || (user?.username === item.username ? user?.avatar : null))! }
                        : undefined
                    }
                    aria-label={item.nickname || item.username}
                    color={isSuperAdmin ? "brand" : "colorful"}
                    size={40}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <Body1Strong style={{ fontSize: "15px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.nickname || item.username}
                      </Body1Strong>
                      {isSuperAdmin ? (
                        <Badge appearance="filled" color="brand" size="small">
                          管理员
                        </Badge>
                      ) : (
                        <Badge appearance="tint" color="informative" size="small">
                          普通用户
                        </Badge>
                      )}
                    </div>
                    <Caption1 style={{ opacity: 0.6, display: "block", marginTop: "2px" }}>
                      @{item.username}
                    </Caption1>
                  </div>
                </div>

                {/* Notes count */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    minWidth: "100px",
                    flex: "0 0 auto",
                  }}
                >
                  <Document20Regular style={{ opacity: 0.6 }} />
                  <Body1>{item.note_count || 0} 篇随笔</Body1>
                </div>

                {/* Created At */}
                <div
                  className="user-row-created"
                  style={{
                    minWidth: "160px",
                    flex: "0 0 auto",
                  }}
                >
                  <Caption1 style={{ opacity: 0.55, display: "block", fontSize: "11px" }}>
                    注册创建时间
                  </Caption1>
                  <Caption1 style={{ opacity: 0.85, fontSize: "13px" }}>
                    {item.created_at ? new Date(item.created_at).toLocaleString("zh-CN") : "-"}
                  </Caption1>
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexShrink: 0,
                  }}
                >
                  <Tooltip content="修改密码" relationship="label">
                    <Button
                      appearance="subtle"
                      size="medium"
                      icon={<Key20Regular />}
                      onClick={() => {
                        setSelectedUserForPass(item);
                        setUpdatedPassword("");
                        setUpdatedConfirmPassword("");
                        setPassModalError(null);
                        setIsUpdatePassOpen(true);
                      }}
                    >
                      修改密码
                    </Button>
                  </Tooltip>

                  <Tooltip
                    content={isSuperAdmin ? "不可删除管理员" : "删除用户"}
                    relationship="label"
                  >
                    <Button
                      appearance="subtle"
                      size="medium"
                      icon={<Delete20Regular />}
                      disabled={isSuperAdmin}
                      onClick={() => {
                        setSelectedUserForDelete(item);
                        setDeleteModalError(null);
                        setIsDeleteOpen(true);
                      }}
                      style={{ color: isSuperAdmin ? undefined : "#d13438" }}
                    >
                      删除
                    </Button>
                  </Tooltip>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* 模态框 1：添加新用户 */}
      <Dialog
        open={isAddUserOpen}
        onOpenChange={(_, data) => setIsAddUserOpen(data.open)}
        surfaceMotion={surfaceMotion}
      >
        <DialogSurface
          backdropMotion={backdropMotion}
          backdrop={{
            style: {
              backdropFilter: "none",
              WebkitBackdropFilter: "none",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
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
            maxWidth: isMobile ? "100vw" : "460px",
            minWidth: isMobile ? "100vw" : undefined,
            width: isMobile ? "100vw" : undefined,
            maxHeight: isMobile ? "100dvh" : "88vh",
            height: isMobile ? "100dvh" : undefined,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: isMobile ? 0 : "16px",
            padding: isMobile ? "max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom)) 16px" : undefined,
            backgroundColor: isDark ? "#1c1c23" : "#ffffff",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            border: isMobile ? "none" : undefined,
          }}
        >
          <form onSubmit={handleAddUserSubmit} style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden", width: "100%" }}>
            <DialogBody style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden", width: "100%" }}>
              {/* Header - 固定顶部 */}
              <header className="dialog-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "16px", flexShrink: 0 }}>
                <div className="dialog-header-title" style={{ flex: 1, minWidth: 0 }}>
                  <DialogTitle style={{ padding: 0, margin: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <PersonAdd20Regular style={{ color: "#5B7B8D" }} />
                      <Title3 style={{ fontWeight: 600, fontSize: "18px" }}>添加用户</Title3>
                    </div>
                  </DialogTitle>
                </div>
                <Tooltip content="关闭" relationship="label">
                  <Button
                    className="dialog-close-btn"
                    appearance="subtle"
                    icon={<Dismiss20Regular />}
                    onClick={() => setIsAddUserOpen(false)}
                    aria-label="关闭"
                    style={{ marginLeft: "auto", flexShrink: 0 }}
                  />
                </Tooltip>
              </header>

              <DialogContent style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px", flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
                {addModalError && (
                  <MessageBar intent="error">
                    <MessageBarBody>{addModalError}</MessageBarBody>
                  </MessageBar>
                )}

                <Field label="用户名" required>
                  <Input
                    contentBefore={<Person20Regular />}
                    placeholder="请输入用户名"
                    value={newUsername}
                    onChange={(_, data) => setNewUsername(data.value)}
                    required
                  />
                </Field>

                <Field label="昵称">
                  <Input
                    placeholder="请输入昵称"
                    value={newNickname}
                    onChange={(_, data) => setNewNickname(data.value)}
                  />
                </Field>

                <Field label="初始密码" required hint="不少于 6 位">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    contentBefore={<LockClosed20Regular />}
                    contentAfter={
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={showNewPassword ? <EyeOff20Regular /> : <Eye20Regular />}
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        tabIndex={-1}
                      />
                    }
                    placeholder="请输入初始密码"
                    value={newPassword}
                    onChange={(_, data) => setNewPassword(data.value)}
                    required
                  />
                </Field>

                <Field label="确认密码" required>
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    contentBefore={<LockClosed20Regular />}
                    placeholder="请再次输入密码"
                    value={newConfirmPassword}
                    onChange={(_, data) => setNewConfirmPassword(data.value)}
                    required
                  />
                </Field>
              </DialogContent>

              {/* Footer Actions - 固定底部 */}
              <footer className="dialog-footer-row" style={{ flexShrink: 0, width: "100%" }}>
                <DialogActions style={{ marginTop: "20px", flexShrink: 0 }}>
                  <Button appearance="secondary" onClick={() => setIsAddUserOpen(false)}>
                    取消
                  </Button>
                  <Button
                    type="submit"
                    appearance="primary"
                    disabled={isAddSubmitting}
                    icon={isAddSubmitting ? <Spinner size="tiny" /> : <Add20Filled />}
                    style={{
                      backgroundColor: "#5B7B8D",
                      fontWeight: 600,
                    }}
                  >
                    {isAddSubmitting ? "正在保存..." : "确定"}
                  </Button>
                </DialogActions>
              </footer>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>

      {/* 模态框 2：修改密码 */}
      <Dialog
        open={isUpdatePassOpen}
        onOpenChange={(_, data) => setIsUpdatePassOpen(data.open)}
        surfaceMotion={surfaceMotion}
      >
        <DialogSurface
          backdropMotion={backdropMotion}
          backdrop={{
            style: {
              backdropFilter: "none",
              WebkitBackdropFilter: "none",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
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
            maxWidth: isMobile ? "100vw" : "440px",
            minWidth: isMobile ? "100vw" : undefined,
            width: isMobile ? "100vw" : undefined,
            maxHeight: isMobile ? "100dvh" : "88vh",
            height: isMobile ? "100dvh" : undefined,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: isMobile ? 0 : "16px",
            padding: isMobile ? "max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom)) 16px" : undefined,
            backgroundColor: isDark ? "#1c1c23" : "#ffffff",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            border: isMobile ? "none" : undefined,
          }}
        >
          <form onSubmit={handleUpdatePasswordSubmit} style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden", width: "100%" }}>
            <DialogBody style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden", width: "100%" }}>
              {/* Header - 固定顶部 */}
              <header className="dialog-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "16px", flexShrink: 0 }}>
                <div className="dialog-header-title" style={{ flex: 1, minWidth: 0 }}>
                  <DialogTitle style={{ padding: 0, margin: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Key20Regular style={{ color: "#5B7B8D" }} />
                      <Title3 style={{ fontWeight: 600, fontSize: "18px" }}>修改密码</Title3>
                    </div>
                  </DialogTitle>
                </div>
                <Tooltip content="关闭" relationship="label">
                  <Button
                    className="dialog-close-btn"
                    appearance="subtle"
                    icon={<Dismiss20Regular />}
                    onClick={() => setIsUpdatePassOpen(false)}
                    aria-label="关闭"
                    style={{ marginLeft: "auto", flexShrink: 0 }}
                  />
                </Tooltip>
              </header>

              <DialogContent style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px", flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
                {passModalError && (
                  <MessageBar intent="error">
                    <MessageBarBody>{passModalError}</MessageBarBody>
                  </MessageBar>
                )}

                <div
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <Caption1 style={{ opacity: 0.6 }}>修改以下账号密码：</Caption1>
                  <Body1Strong style={{ display: "block", fontSize: "15px", marginTop: "2px" }}>
                    @{activeUserForPass?.username}
                  </Body1Strong>
                </div>

                <Field label="新密码" required hint="不少于 6 位">
                  <Input
                    type={showUpdatedPassword ? "text" : "password"}
                    contentBefore={<Key20Regular />}
                    contentAfter={
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={showUpdatedPassword ? <EyeOff20Regular /> : <Eye20Regular />}
                        onClick={() => setShowUpdatedPassword(!showUpdatedPassword)}
                        tabIndex={-1}
                      />
                    }
                    placeholder="请输入新密码"
                    value={updatedPassword}
                    onChange={(_, data) => setUpdatedPassword(data.value)}
                    required
                  />
                </Field>

                <Field label="确认密码" required>
                  <Input
                    type={showUpdatedPassword ? "text" : "password"}
                    contentBefore={<Key20Regular />}
                    placeholder="请再次输入密码"
                    value={updatedConfirmPassword}
                    onChange={(_, data) => setUpdatedConfirmPassword(data.value)}
                    required
                  />
                </Field>
              </DialogContent>

              {/* Footer Actions - 固定底部 */}
              <footer className="dialog-footer-row" style={{ flexShrink: 0, width: "100%" }}>
                <DialogActions style={{ marginTop: "20px", flexShrink: 0 }}>
                  <Button appearance="secondary" onClick={() => setIsUpdatePassOpen(false)}>
                    取消
                  </Button>
                  <Button
                    type="submit"
                    appearance="primary"
                    disabled={isPassSubmitting}
                    icon={isPassSubmitting ? <Spinner size="tiny" /> : <Key20Regular />}
                    style={{
                      backgroundColor: "#5B7B8D",
                      fontWeight: 600,
                    }}
                  >
                    {isPassSubmitting ? "正在保存..." : "确定"}
                  </Button>
                </DialogActions>
              </footer>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>

      {/* 模态框 3：级联删除确认 */}
      <Dialog
        open={isDeleteOpen}
        onOpenChange={(_, data) => setIsDeleteOpen(data.open)}
        surfaceMotion={surfaceMotion}
      >
        <DialogSurface
          backdropMotion={backdropMotion}
          backdrop={{
            style: {
              backdropFilter: "none",
              WebkitBackdropFilter: "none",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
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
            maxWidth: isMobile ? "100vw" : "440px",
            minWidth: isMobile ? "100vw" : undefined,
            width: isMobile ? "100vw" : undefined,
            maxHeight: isMobile ? "100dvh" : "88vh",
            height: isMobile ? "100dvh" : undefined,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: isMobile ? 0 : "16px",
            padding: isMobile ? "max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom)) 16px" : undefined,
            backgroundColor: isDark ? "#1c1c23" : "#ffffff",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            border: isMobile ? "none" : undefined,
          }}
        >
          <DialogBody style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden", width: "100%" }}>
            {/* Header - 固定顶部 */}
            <header className="dialog-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "16px", flexShrink: 0 }}>
              <div className="dialog-header-title" style={{ flex: 1, minWidth: 0 }}>
                <DialogTitle style={{ padding: 0, margin: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#d13438" }}>
                    <Warning20Regular />
                    <Title3 style={{ fontWeight: 600, fontSize: "18px", color: "#d13438" }}>删除用户</Title3>
                  </div>
                </DialogTitle>
              </div>
              <Tooltip content="关闭" relationship="label">
                <Button
                  className="dialog-close-btn"
                  appearance="subtle"
                  icon={<Dismiss20Regular />}
                  onClick={() => setIsDeleteOpen(false)}
                  aria-label="关闭"
                  style={{ marginLeft: "auto", flexShrink: 0 }}
                />
              </Tooltip>
            </header>

            <DialogContent style={{ marginTop: "12px", flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
              {deleteModalError && (
                <MessageBar intent="error" style={{ marginBottom: "12px" }}>
                  <MessageBarBody>{deleteModalError}</MessageBarBody>
                </MessageBar>
              )}

              <Body1>
                确定删除用户{" "}
                <strong>
                  @{activeUserForDelete?.username}
                </strong>{" "}
                吗？
              </Body1>

              <div
                style={{
                  marginTop: "14px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(209, 52, 56, 0.08)",
                  border: "1px solid rgba(209, 52, 56, 0.2)",
                  color: "#d13438",
                  fontSize: "13px",
                  lineHeight: "1.5",
                }}
              >
                删除后该用户的笔记也将一并清除，且无法恢复。
              </div>
            </DialogContent>

            {/* Footer Actions - 固定底部 */}
            <footer className="dialog-footer-row" style={{ flexShrink: 0, width: "100%" }}>
              <DialogActions style={{ marginTop: "20px", flexShrink: 0 }}>
                <Button appearance="secondary" onClick={() => setIsDeleteOpen(false)}>
                  取消
                </Button>
                <Button
                  appearance="primary"
                  className="btn-danger"
                  disabled={isDeleteSubmitting}
                  onClick={handleDeleteUserSubmit}
                  style={{ backgroundColor: "#d13438", borderColor: "#d13438", color: "#ffffff" }}
                  icon={isDeleteSubmitting ? <Spinner size="tiny" /> : <Delete20Regular style={{ color: "#ffffff" }} />}
                >
                  {isDeleteSubmitting ? "正在删除..." : "确定"}
                </Button>
              </DialogActions>
            </footer>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default UserManager;
