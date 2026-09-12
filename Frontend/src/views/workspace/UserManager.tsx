import React, { useEffect, useState, useMemo } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Title2,
  Title3,
  Tooltip,
} from "@fluentui/react-components";
import {
  Add20Filled,
  ArrowLeft20Regular,
  ArrowSync20Regular,
  Delete20Regular,
  Dismiss20Regular,
  Document20Regular,
  Eye20Regular,
  EyeOff20Regular,
  Key20Regular,
  LockClosed20Regular,
  PeopleCommunity24Filled,
  PersonAdd20Regular,
  Person20Regular,
  Search20Regular,
  ShieldCheckmark20Regular,
  Warning20Regular,
} from "@fluentui/react-icons";
import { adminApi, AdminUserInfo } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";

export const UserManager: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const navigate = useNavigate();

  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const [updatedPassword, setUpdatedPassword] = useState("");
  const [updatedConfirmPassword, setUpdatedConfirmPassword] = useState("");
  const [showUpdatedPassword, setShowUpdatedPassword] = useState(false);
  const [isPassSubmitting, setIsPassSubmitting] = useState(false);
  const [passModalError, setPassModalError] = useState<string | null>(null);

  // 删除用户确认
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<AdminUserInfo | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  // 加载用户列表
  const fetchUsers = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await adminApi.getUsersList();
      if (res.status === 1 && res.data) {
        setUsers(res.data);
      } else {
        setErrorMsg(res.content || "获取用户列表失败");
      }
    } catch (err: any) {
      setErrorMsg(`网络请求异常: ${err.message || String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 保护：仅总管理员 tiany 可访问此控制台
    if (user && user.username !== "tiany") {
      navigate("/workspace", { replace: true });
      return;
    }
    fetchUsers();
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
        setSuccessMsg(`✅ 成功添加新用户 [${u}]`);
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
        setSuccessMsg(`✅ 成功重置用户 [${selectedUserForPass.username}] 的登录密码`);
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
        setSuccessMsg(
          `🗑️ 成功彻底销毁用户 [${selectedUserForDelete.username}]（连带清除了 ${res.data?.deletedNotesCount || 0} 篇笔记）`
        );
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

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "32px 20px 60px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #0078d4, #005a9e)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 8px 24px rgba(0, 120, 212, 0.3)",
            }}
          >
            <PeopleCommunity24Filled />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Title2 style={{ fontWeight: 700, margin: 0, fontSize: "24px" }}>
                用户管理中枢
              </Title2>
              <Badge appearance="filled" color="brand" size="medium">
                👑 系统总管控制台
              </Badge>
            </div>
            <Body1 style={{ opacity: 0.65, fontSize: "13px", marginTop: "4px" }}>
              总账户专享功能：注册开立新用户、重置修改任意密码、级联清理注销账户
            </Body1>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Button
            appearance="subtle"
            icon={<ArrowLeft20Regular />}
            onClick={() => navigate("/workspace")}
          >
            返回我的日记库
          </Button>
          <Button
            appearance="subtle"
            icon={<ArrowSync20Regular />}
            onClick={fetchUsers}
            disabled={isLoading}
          >
            刷新
          </Button>
          <Button
            appearance="primary"
            icon={<PersonAdd20Regular />}
            onClick={() => {
              setAddModalError(null);
              setIsAddUserOpen(true);
            }}
            style={{
              background: "linear-gradient(135deg, #0078d4, #005a9e)",
              borderRadius: "8px",
              fontWeight: 600,
            }}
          >
            添加新账户
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
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <Card
          style={{
            padding: "20px 24px",
            borderRadius: "14px",
            backgroundColor: isDark ? "#202026" : "#ffffff",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
          }}
        >
          <Caption1 style={{ opacity: 0.65, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            全站已注册用户数
          </Caption1>
          <div style={{ fontSize: "32px", fontWeight: 700, color: "#0078d4", marginTop: "4px" }}>
            {users.length}
          </div>
          <Caption1 style={{ opacity: 0.6, marginTop: "4px" }}>
            仅限管理员手动开立，无外部匿名注册
          </Caption1>
        </Card>

        <Card
          style={{
            padding: "20px 24px",
            borderRadius: "14px",
            backgroundColor: isDark ? "#202026" : "#ffffff",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
          }}
        >
          <Caption1 style={{ opacity: 0.65, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            全站随笔日记总数
          </Caption1>
          <div style={{ fontSize: "32px", fontWeight: 700, color: "#107c41", marginTop: "4px" }}>
            {totalNotes}
          </div>
          <Caption1 style={{ opacity: 0.6, marginTop: "4px" }}>
            删除用户时将自动连带永久清空所有笔记
          </Caption1>
        </Card>

        <Card
          style={{
            padding: "20px 24px",
            borderRadius: "14px",
            backgroundColor: isDark ? "#202026" : "#ffffff",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
          }}
        >
          <Caption1 style={{ opacity: 0.65, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            当前操作执行人
          </Caption1>
          <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Avatar name="tiany" size={28} color="brand" />
            <span>@tiany (系统总管)</span>
          </div>
          <Caption1 style={{ opacity: 0.6, marginTop: "6px" }}>
            拥有全站全局调度与管理权限
          </Caption1>
        </Card>
      </div>

      {/* Filter and Table Container */}
      <Card
        style={{
          padding: "24px",
          borderRadius: "16px",
          backgroundColor: isDark ? "#202026" : "#ffffff",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: isDark
            ? "0 8px 32px rgba(0, 0, 0, 0.4)"
            : "0 8px 32px rgba(0, 0, 0, 0.06)",
        }}
      >
        {/* Search Bar */}
        <div style={{ marginBottom: "20px", maxWidth: "360px" }}>
          <Input
            contentBefore={<Search20Regular />}
            placeholder="按用户名或昵称搜索..."
            value={searchQuery}
            onChange={(_, data) => setSearchQuery(data.value)}
            style={{ width: "100%" }}
          />
        </div>

        {/* User Table */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Spinner size="large" label="正在拉取全量用户数据..." />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.6 }}>
            <Person20Regular style={{ fontSize: "36px", marginBottom: "8px" }} />
            <div>未检索到匹配的用户记录</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <Table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" }}>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell style={{ fontWeight: 600 }}>用户信息</TableHeaderCell>
                  <TableHeaderCell style={{ fontWeight: 600 }}>系统角色</TableHeaderCell>
                  <TableHeaderCell style={{ fontWeight: 600 }}>关联随笔数</TableHeaderCell>
                  <TableHeaderCell style={{ fontWeight: 600 }}>注册创建时间</TableHeaderCell>
                  <TableHeaderCell style={{ fontWeight: 600, textAlign: "right" }}>操作</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((item) => {
                  const isSuperAdmin = item.username === "tiany";
                  return (
                    <TableRow
                      key={item.id}
                      style={{
                        backgroundColor: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
                        borderRadius: "8px",
                      }}
                    >
                      {/* User Info */}
                      <TableCell>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0" }}>
                          <Avatar
                            name={item.nickname || item.username}
                            color={isSuperAdmin ? "brand" : "colorful"}
                            size={36}
                          />
                          <div>
                            <Body1Strong style={{ display: "block" }}>
                              {item.nickname || item.username}
                            </Body1Strong>
                            <Caption1 style={{ opacity: 0.6 }}>@{item.username}</Caption1>
                          </div>
                        </div>
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        {isSuperAdmin ? (
                          <Badge appearance="filled" color="brand">
                            👑 系统总管
                          </Badge>
                        ) : (
                          <Badge appearance="tint" color="informative">
                            普通用户
                          </Badge>
                        )}
                      </TableCell>

                      {/* Notes count */}
                      <TableCell>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Document20Regular style={{ opacity: 0.6 }} />
                          <Body1>{item.note_count || 0} 篇</Body1>
                        </div>
                      </TableCell>

                      {/* Created At */}
                      <TableCell>
                        <Caption1 style={{ opacity: 0.75 }}>
                          {item.created_at ? new Date(item.created_at).toLocaleString("zh-CN") : "-"}
                        </Caption1>
                      </TableCell>

                      {/* Actions */}
                      <TableCell style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <Tooltip content="修改该账户登录密码" relationship="label">
                            <Button
                              appearance="subtle"
                              size="small"
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
                            content={isSuperAdmin ? "系统总管账户不可删除" : "连带删除此用户及其所有笔记"}
                            relationship="label"
                          >
                            <Button
                              appearance="subtle"
                              size="small"
                              icon={<Delete20Regular />}
                              disabled={isSuperAdmin}
                              onClick={() => {
                                setSelectedUserForDelete(item);
                                setDeleteModalError(null);
                                setIsDeleteOpen(true);
                              }}
                              style={{ color: isSuperAdmin ? undefined : "#d13438" }}
                            >
                              删除账户
                            </Button>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* 模态框 1：添加新用户 */}
      <Dialog open={isAddUserOpen} onOpenChange={(_, data) => setIsAddUserOpen(data.open)}>
        <DialogSurface style={{ maxWidth: "460px" }}>
          <form onSubmit={handleAddUserSubmit}>
            <DialogBody>
              <DialogTitle
                action={
                  <Button
                    appearance="subtle"
                    aria-label="close"
                    icon={<Dismiss20Regular />}
                    onClick={() => setIsAddUserOpen(false)}
                  />
                }
              >
                添加新用户账户
              </DialogTitle>
              <DialogContent style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
                {addModalError && (
                  <MessageBar intent="error">
                    <MessageBarBody>{addModalError}</MessageBarBody>
                  </MessageBar>
                )}

                <Field label="账号用户名" required hint="用户登录时使用的唯一账号名">
                  <Input
                    contentBefore={<Person20Regular />}
                    placeholder="请输入用户名 (如 alice)"
                    value={newUsername}
                    onChange={(_, data) => setNewUsername(data.value)}
                    required
                  />
                </Field>

                <Field label="个性手记昵称" hint="日记展示与广场展示的名号">
                  <Input
                    placeholder="请输入昵称 (如 拾光作者)"
                    value={newNickname}
                    onChange={(_, data) => setNewNickname(data.value)}
                  />
                </Field>

                <Field label="初始登录密码" required hint="不少于 6 位密码">
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
                    placeholder="请输入初始登录密码"
                    value={newPassword}
                    onChange={(_, data) => setNewPassword(data.value)}
                    required
                  />
                </Field>

                <Field label="确认初始密码" required>
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    contentBefore={<LockClosed20Regular />}
                    placeholder="请再次输入初始密码"
                    value={newConfirmPassword}
                    onChange={(_, data) => setNewConfirmPassword(data.value)}
                    required
                  />
                </Field>
              </DialogContent>
              <DialogActions style={{ marginTop: "20px" }}>
                <Button appearance="secondary" onClick={() => setIsAddUserOpen(false)}>
                  取消
                </Button>
                <Button
                  type="submit"
                  appearance="primary"
                  disabled={isAddSubmitting}
                  icon={isAddSubmitting ? <Spinner size="tiny" /> : <Add20Filled />}
                >
                  {isAddSubmitting ? "正在开立..." : "确认添加"}
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>

      {/* 模态框 2：修改密码 */}
      <Dialog open={isUpdatePassOpen} onOpenChange={(_, data) => setIsUpdatePassOpen(data.open)}>
        <DialogSurface style={{ maxWidth: "440px" }}>
          <form onSubmit={handleUpdatePasswordSubmit}>
            <DialogBody>
              <DialogTitle
                action={
                  <Button
                    appearance="subtle"
                    aria-label="close"
                    icon={<Dismiss20Regular />}
                    onClick={() => setIsUpdatePassOpen(false)}
                  />
                }
              >
                重置用户密码
              </DialogTitle>
              <DialogContent style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
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
                  <Caption1 style={{ opacity: 0.6 }}>当前正在为以下账户重置密码：</Caption1>
                  <Body1Strong style={{ display: "block", fontSize: "15px", marginTop: "2px" }}>
                    {selectedUserForPass?.nickname || selectedUserForPass?.username} (@{selectedUserForPass?.username})
                  </Body1Strong>
                </div>

                <Field label="新登录密码" required hint="不少于 6 位字符">
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

                <Field label="确认新密码" required>
                  <Input
                    type={showUpdatedPassword ? "text" : "password"}
                    contentBefore={<Key20Regular />}
                    placeholder="请再次输入新密码"
                    value={updatedConfirmPassword}
                    onChange={(_, data) => setUpdatedConfirmPassword(data.value)}
                    required
                  />
                </Field>
              </DialogContent>
              <DialogActions style={{ marginTop: "20px" }}>
                <Button appearance="secondary" onClick={() => setIsUpdatePassOpen(false)}>
                  取消
                </Button>
                <Button
                  type="submit"
                  appearance="primary"
                  disabled={isPassSubmitting}
                  icon={isPassSubmitting ? <Spinner size="tiny" /> : <Key20Regular />}
                >
                  {isPassSubmitting ? "正在更新..." : "确认修改"}
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>

      {/* 模态框 3：级联删除确认 */}
      <Dialog open={isDeleteOpen} onOpenChange={(_, data) => setIsDeleteOpen(data.open)}>
        <DialogSurface style={{ maxWidth: "440px" }}>
          <DialogBody>
            <DialogTitle
              action={
                <Button
                  appearance="subtle"
                  aria-label="close"
                  icon={<Dismiss20Regular />}
                  onClick={() => setIsDeleteOpen(false)}
                />
              }
            >
              <span style={{ color: "#d13438", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <Warning20Regular /> 确认级联删除账户
              </span>
            </DialogTitle>
            <DialogContent style={{ marginTop: "12px" }}>
              {deleteModalError && (
                <MessageBar intent="error" style={{ marginBottom: "12px" }}>
                  <MessageBarBody>{deleteModalError}</MessageBarBody>
                </MessageBar>
              )}

              <Body1>
                您确定要彻底删除用户{" "}
                <strong>
                  {selectedUserForDelete?.nickname || selectedUserForDelete?.username} (@
                  {selectedUserForDelete?.username})
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
                ⚠️ <strong>重大警告：</strong> 该用户名下所有随笔日记（共{" "}
                <strong>{selectedUserForDelete?.note_count || 0}</strong> 篇）将被<strong>永久级联清除</strong>
                ，且无法撤销！
              </div>
            </DialogContent>
            <DialogActions style={{ marginTop: "20px" }}>
              <Button appearance="secondary" onClick={() => setIsDeleteOpen(false)}>
                取消
              </Button>
              <Button
                appearance="primary"
                disabled={isDeleteSubmitting}
                onClick={handleDeleteUserSubmit}
                style={{ backgroundColor: "#d13438", borderColor: "#d13438" }}
                icon={isDeleteSubmitting ? <Spinner size="tiny" /> : <Delete20Regular />}
              >
                {isDeleteSubmitting ? "正在连带清空..." : "确认彻底删除"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default UserManager;
