import React, { useState, useEffect, useMemo } from "react";
import {
  Badge,
  Button,
  Input,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Tooltip,
} from "@fluentui/react-components";
import {
  BrainCircuit20Regular,
  Clock20Regular,
  Emoji20Regular,
  EmojiSad20Regular,
  Heart20Regular,
  Sparkle20Regular,
  Add20Regular,
  Delete20Regular,
  Dismiss20Regular,
} from "@fluentui/react-icons";

export interface MoodOption {
  id: string; // 标识符 / 数据库存储值
  label: string; // 展示名称
  emoji?: string; // 标识 Emoji
  color?: "brand" | "success" | "important" | "informative" | "warning" | "severe" | "subtle";
  icon?: React.ComponentType<any>;
  hex?: string; // 主题色彩十六进制
  isCustom?: boolean; // 是否为用户自定义分类
}

export const DEFAULT_MOODS: MoodOption[] = [
  { id: "Happy", label: "欢喜", emoji: "✨", color: "brand", icon: Emoji20Regular, hex: "#ff9f43" },
  { id: "Peaceful", label: "宁静", emoji: "🌿", color: "success", icon: Heart20Regular, hex: "#10ac84" },
  { id: "Excited", label: "充沛", emoji: "🔥", color: "important", icon: Sparkle20Regular, hex: "#ee5253" },
  { id: "Thinking", label: "沉思", emoji: "💡", color: "informative", icon: BrainCircuit20Regular, hex: "#2e86de" },
  { id: "Tired", label: "倦怠", emoji: "🌙", color: "warning", icon: Clock20Regular, hex: "#f368e0" },
  { id: "Sad", label: "低落", emoji: "🌧️", color: "severe", icon: EmojiSad20Regular, hex: "#576574" },
];

export const MOOD_OPTIONS = DEFAULT_MOODS;

const MOOD_ICON_MAP: Record<string, any> = {
  happy: Emoji20Regular,
  peaceful: Heart20Regular,
  excited: Sparkle20Regular,
  thinking: BrainCircuit20Regular,
  tired: Clock20Regular,
  sad: EmojiSad20Regular,
};

const USER_MOODS_STORAGE_KEY = "diary_user_moods";
const DELETED_MOODS_STORAGE_KEY = "diary_deleted_mood_ids";

// 获取用户明确删除的心情 ID 黑名单
export const getDeletedMoodIds = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DELETED_MOODS_STORAGE_KEY);
    if (!raw) return new Set();
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return new Set();
    return new Set(list.map((id: string) => String(id).trim().toLowerCase()));
  } catch {
    return new Set();
  }
};

// 获取用户当前所有可用心境类别（无固定类别，所有预设或自定义类别均平等支持增删）
export const getUserMoods = (): MoodOption[] => {
  if (typeof window === "undefined") return DEFAULT_MOODS;
  const deletedSet = getDeletedMoodIds();
  try {
    const raw = localStorage.getItem(USER_MOODS_STORAGE_KEY);
    let list: MoodOption[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }

    // 若本地尚未有自定义列表，则以初始默认类别作为起点
    if (list.length === 0 && !localStorage.getItem(USER_MOODS_STORAGE_KEY)) {
      list = DEFAULT_MOODS.map((m) => ({ ...m, isCustom: true }));
    }

    return list
      .filter(
        (m) =>
          !deletedSet.has(m.id.toLowerCase()) &&
          !deletedSet.has(m.label.toLowerCase())
      )
      .map((item) => ({
        ...item,
        icon: item.icon || MOOD_ICON_MAP[item.id.toLowerCase()],
        isCustom: true,
      }));
  } catch {
    return DEFAULT_MOODS.filter((m) => !deletedSet.has(m.id.toLowerCase()));
  }
};

export const getCustomMoods = getUserMoods;

export const saveCustomMood = (newMood: {
  label: string;
  emoji?: string;
  hex?: string;
}): MoodOption => {
  const trimmed = newMood.label.trim();
  const id = trimmed;
  const emoji = newMood.emoji || "✨";
  const hex = newMood.hex || "#a55eea";

  const customItem: MoodOption = {
    id,
    label: trimmed,
    emoji,
    hex,
    color: "brand",
    isCustom: true,
    icon: MOOD_ICON_MAP[id.toLowerCase()],
  };

  // 若该 ID 曾经在黑名单中，解除删除状态
  const deletedSet = getDeletedMoodIds();
  if (deletedSet.has(id.toLowerCase())) {
    deletedSet.delete(id.toLowerCase());
    localStorage.setItem(
      DELETED_MOODS_STORAGE_KEY,
      JSON.stringify(Array.from(deletedSet))
    );
  }

  const existing = getUserMoods().filter(
    (m) =>
      m.id.toLowerCase() !== id.toLowerCase() &&
      m.label.toLowerCase() !== id.toLowerCase()
  );
  const updated = [...existing, customItem];
  localStorage.setItem(USER_MOODS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(
    new CustomEvent("mood:custom_updated", { detail: customItem })
  );
  return customItem;
};

export const deleteMood = (id: string): void => {
  const lower = id.trim().toLowerCase();
  const deletedSet = getDeletedMoodIds();
  deletedSet.add(lower);
  localStorage.setItem(
    DELETED_MOODS_STORAGE_KEY,
    JSON.stringify(Array.from(deletedSet))
  );

  const existing = getUserMoods().filter(
    (m) => m.id.toLowerCase() !== lower && m.label.toLowerCase() !== lower
  );
  localStorage.setItem(USER_MOODS_STORAGE_KEY, JSON.stringify(existing));
  window.dispatchEvent(
    new CustomEvent("mood:custom_updated", { detail: { id, deleted: true } })
  );
};

export const deleteCustomMood = deleteMood;

export const getAllMoods = (
  notes?: { mood?: string | null }[]
): MoodOption[] => {
  const deletedSet = getDeletedMoodIds();
  const userList = getUserMoods();
  const map = new Map<string, MoodOption>();

  // 1. 用户当前所有有效类别
  for (const m of userList) {
    map.set(m.id.toLowerCase(), m);
  }

  // 2. 动态从已有日记中补齐尚未删除的类别
  if (notes && Array.isArray(notes)) {
    for (const n of notes) {
      const moodVal = n.mood?.trim();
      if (!moodVal) continue;
      const lower = moodVal.toLowerCase();
      // 用户主动删除的分类坚决不重新展示
      if (deletedSet.has(lower)) continue;
      if (!map.has(lower)) {
        map.set(lower, {
          id: moodVal,
          label: moodVal,
          emoji: "✨",
          hex: "#8854d0",
          color: "informative",
          isCustom: true,
        });
      }
    }
  }

  return Array.from(map.values());
};

export const getMoodOption = (mood?: string | null): MoodOption => {
  const currentList = getUserMoods();
  if (!mood || !mood.trim()) {
    return (
      currentList[0] ||
      DEFAULT_MOODS[0] || {
        id: "Happy",
        label: "记录",
        emoji: "✨",
        hex: "#ff9f43",
        color: "brand",
      }
    );
  }
  const safe = mood.trim().toLowerCase();

  const found = currentList.find(
    (m) => m.id.toLowerCase() === safe || m.label.toLowerCase() === safe
  );
  if (found) return found;

  const preset = DEFAULT_MOODS.find((m) => m.id.toLowerCase() === safe);
  if (preset) return preset;

  return {
    id: mood.trim(),
    label: mood.trim(),
    emoji: "✨",
    hex: "#8854d0",
    color: "informative",
    isCustom: true,
  };
};

export const MoodIcon: React.FC<{ mood?: string | null; size?: number }> = ({
  mood,
  size = 17,
}) => {
  const item = getMoodOption(mood);
  const Icon = item.icon;

  return (
    <Tooltip content={`心境：${item.label}`} relationship="label">
      <span
        className="note-card-meta-icon"
        style={{
          color: item.hex || "#ff9f43",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: `${size}px`,
          lineHeight: 1,
        }}
        aria-label={`心境: ${item.label}`}
      >
        {Icon ? <Icon style={{ fontSize: `${size}px` }} /> : (item.emoji || "✨")}
      </span>
    </Tooltip>
  );
};

export const MoodBadge: React.FC<{ mood?: string | null; size?: "medium" | "large" }> = ({
  mood,
  size = "medium",
}) => {
  const item = getMoodOption(mood);
  const Icon = item.icon;

  return (
    <Badge
      appearance="tint"
      color={item.color || "brand"}
      size={size}
      icon={
        Icon ? (
          <Icon style={{ color: item.hex, fontSize: "16px" }} />
        ) : (
          <span style={{ fontSize: "14px", lineHeight: 1 }}>{item.emoji || "✨"}</span>
        )
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 13px",
        fontSize: "13px",
        fontWeight: 500,
        lineHeight: 1.45,
        borderRadius: "999px",
      }}
    >
      {item.label}
    </Badge>
  );
};

const SUGGESTED_EMOJIS = [
  "✨", "🌿", "🔥", "💡", "🌙", "🌧️",
  "🍵", "☕", "🧘", "🌸", "🏖️", "🌈",
  "🎸", "🎯", "🥂", "⛅", "🎉", "🎨"
];

const SUGGESTED_COLORS = [
  "#ff9f43", "#10ac84", "#ee5253", "#2e86de",
  "#a55eea", "#f368e0", "#576574", "#0abde3"
];

export const MoodPicker: React.FC<{
  value?: string | null;
  onChange: (val: string) => void;
  borderless?: boolean;
  size?: "small" | "medium";
  style?: React.CSSProperties;
}> = ({ value, onChange, borderless = false, size = "medium", style }) => {
  const [moodList, setMoodList] = useState<MoodOption[]>(getUserMoods());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🍵");
  const [selectedColor, setSelectedColor] = useState("#a55eea");

  useEffect(() => {
    const handleUpdate = () => {
      setMoodList(getUserMoods());
    };
    window.addEventListener("mood:custom_updated", handleUpdate);
    return () => window.removeEventListener("mood:custom_updated", handleUpdate);
  }, []);

  const current = getMoodOption(value);
  const CurrentIcon = current.icon;

  const handleCreateConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    const trimmed = newLabel.trim();
    if (!trimmed) return;

    const created = saveCustomMood({
      label: trimmed,
      emoji: selectedEmoji,
      hex: selectedColor,
    });
    setMoodList(getUserMoods());
    onChange(created.id);
    setNewLabel("");
    setIsCreating(false);
    setIsMenuOpen(false);
  };

  const handleDeleteMood = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteMood(id);
    const updated = getUserMoods();
    setMoodList(updated);
    if (
      value?.toLowerCase() === id.toLowerCase() ||
      current.label.toLowerCase() === id.toLowerCase()
    ) {
      if (updated.length > 0) {
        onChange(updated[0].id);
      } else {
        onChange("");
      }
    }
  };

  return (
    <Menu open={isMenuOpen} onOpenChange={(_, data) => {
      setIsMenuOpen(data.open);
      if (!data.open) setIsCreating(false);
    }}>
      <MenuTrigger disableButtonEnhancement>
        <Button
          appearance="subtle"
          size={size}
          icon={
            CurrentIcon ? (
              <CurrentIcon
                style={{
                  color: current.hex,
                  fontSize: size === "small" ? "15px" : "17px",
                }}
              />
            ) : (
              <span style={{ fontSize: size === "small" ? "13px" : "15px", lineHeight: 1 }}>
                {current.emoji || "✨"}
              </span>
            )
          }
          style={{
            borderRadius: "999px",
            padding: borderless ? "2px 6px" : "5px 14px",
            fontSize: size === "small" ? "12px" : "13px",
            fontWeight: 500,
            minWidth: borderless ? "unset" : undefined,
            height: borderless ? "28px" : undefined,
            border: borderless ? "none" : "1px solid rgba(128, 128, 128, 0.16)",
            background: borderless ? "transparent" : undefined,
            ...style,
          }}
        >
          {current.label}
        </Button>
      </MenuTrigger>
      <MenuPopover style={{ minWidth: "220px", maxWidth: "280px", padding: "6px" }}>
        {!isCreating ? (
          <MenuList>
            {/* 统一心境类别列表：支持对任何类别的删除与自定义新增 */}
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "rgba(128, 128, 128, 0.8)",
                padding: "4px 8px 4px",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>心境类别</span>
              <span style={{ fontSize: "10px", opacity: 0.65 }}>
                {moodList.length} 个分类
              </span>
            </div>

            {moodList.length === 0 ? (
              <div
                style={{
                  padding: "16px 8px",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "rgba(128, 128, 128, 0.6)",
                }}
              >
                暂无分类，点击下方新建
              </div>
            ) : (
              moodList.map((m) => {
                const Icon = m.icon;
                const isSelected =
                  value?.toLowerCase() === m.id.toLowerCase() ||
                  value?.toLowerCase() === m.label.toLowerCase();
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "2px 4px",
                      borderRadius: "6px",
                    }}
                  >
                    <MenuItem
                      style={{ flex: 1 }}
                      icon={
                        Icon ? (
                          <Icon style={{ color: m.hex }} />
                        ) : (
                          <span style={{ fontSize: "14px" }}>{m.emoji || "✨"}</span>
                        )
                      }
                      onClick={() => {
                        onChange(m.id);
                        setIsMenuOpen(false);
                      }}
                    >
                      <span style={{ color: m.hex, fontWeight: isSelected ? 600 : 500 }}>
                        {m.label}
                      </span>
                    </MenuItem>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteMood(e, m.id)}
                      title={`删除分类 “${m.label}”`}
                      aria-label={`删除分类 ${m.label}`}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        opacity: 0.45,
                        padding: "5px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "4px",
                        color: "#e74c3c",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.backgroundColor = "rgba(231, 76, 60, 0.12)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "0.45";
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <Delete20Regular style={{ fontSize: "15px" }} />
                    </button>
                  </div>
                );
              })
            )}

            {/* 底部新增分类入口 */}
            <div
              style={{
                borderTop: "1px solid rgba(128, 128, 128, 0.15)",
                marginTop: "6px",
                paddingTop: "4px",
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreating(true);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px dashed rgba(91, 123, 141, 0.4)",
                  backgroundColor: "rgba(91, 123, 141, 0.08)",
                  color: "#5B7B8D",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <Add20Regular style={{ fontSize: "15px" }} />
                新建心情分类
              </button>
            </div>
          </MenuList>
        ) : (
          /* 内联创建面板 */
          <div
            style={{
              padding: "8px 6px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "2px",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 600 }}>新建心情分类</span>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  opacity: 0.6,
                  padding: "2px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Dismiss20Regular style={{ fontSize: "16px" }} />
              </button>
            </div>

            {/* 分类名称输入框 */}
            <Input
              size="small"
              placeholder="分类名称"
              value={newLabel}
              onChange={(_, data) => setNewLabel(data.value)}
              maxLength={16}
              autoFocus
              style={{ width: "100%" }}
            />

            {/* 常用 Emoji 快捷选取 */}
            <div>
              <div style={{ fontSize: "11px", color: "rgba(128, 128, 128, 0.8)", marginBottom: "4px" }}>
                选择图标
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: "4px",
                }}
              >
                {SUGGESTED_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setSelectedEmoji(em)}
                    style={{
                      border: selectedEmoji === em ? "1.5px solid #5B7B8D" : "1px solid rgba(128, 128, 128, 0.15)",
                      borderRadius: "6px",
                      background: selectedEmoji === em ? "rgba(91, 123, 141, 0.15)" : "transparent",
                      fontSize: "14px",
                      height: "26px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* 颜色快捷选取 */}
            <div>
              <div style={{ fontSize: "11px", color: "rgba(128, 128, 128, 0.8)", marginBottom: "4px" }}>
                主题色彩
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {SUGGESTED_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      backgroundColor: c,
                      border: selectedColor === c ? "2px solid #ffffff" : "none",
                      boxShadow: selectedColor === c ? "0 0 0 1.5px #5B7B8D" : "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* 按钮行 */}
            <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                style={{
                  flex: 1,
                  height: "28px",
                  borderRadius: "6px",
                  border: "1px solid rgba(128, 128, 128, 0.2)",
                  background: "transparent",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateConfirm}
                disabled={!newLabel.trim()}
                style={{
                  flex: 1,
                  height: "28px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#5B7B8D",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: newLabel.trim() ? "pointer" : "not-allowed",
                  opacity: newLabel.trim() ? 1 : 0.5,
                }}
              >
                确认创建
              </button>
            </div>
          </div>
        )}
      </MenuPopover>
    </Menu>
  );
};

