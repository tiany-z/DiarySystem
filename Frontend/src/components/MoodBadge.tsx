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

const CUSTOM_MOODS_STORAGE_KEY = "diary_custom_moods";

export const getCustomMoods = (): MoodOption[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_MOODS_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.map((item) => ({
      ...item,
      isCustom: true,
    }));
  } catch {
    return [];
  }
};

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
  };

  const existing = getCustomMoods().filter(
    (m) => m.id.toLowerCase() !== id.toLowerCase()
  );
  const updated = [...existing, customItem];
  localStorage.setItem(CUSTOM_MOODS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("mood:custom_updated", { detail: customItem }));
  return customItem;
};

export const deleteCustomMood = (id: string): void => {
  const existing = getCustomMoods().filter(
    (m) => m.id.toLowerCase() !== id.toLowerCase()
  );
  localStorage.setItem(CUSTOM_MOODS_STORAGE_KEY, JSON.stringify(existing));
  window.dispatchEvent(
    new CustomEvent("mood:custom_updated", { detail: { id, deleted: true } })
  );
};

export const getAllMoods = (notes?: { mood?: string | null }[]): MoodOption[] => {
  const customList = getCustomMoods();
  const map = new Map<string, MoodOption>();

  // 1. 默认预设分类
  for (const m of DEFAULT_MOODS) {
    map.set(m.id.toLowerCase(), m);
  }

  // 2. 本地自定义分类
  for (const m of customList) {
    map.set(m.id.toLowerCase(), m);
  }

  // 3. 动态从已有日记中补齐其他分类（如公开日记或其他设备创建）
  if (notes && Array.isArray(notes)) {
    for (const n of notes) {
      const moodVal = n.mood?.trim();
      if (!moodVal) continue;
      const lower = moodVal.toLowerCase();
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
  if (!mood || !mood.trim()) return DEFAULT_MOODS[0];
  const safe = mood.trim().toLowerCase();

  const preset = DEFAULT_MOODS.find((m) => m.id.toLowerCase() === safe);
  if (preset) return preset;

  const customList = getCustomMoods();
  const custom = customList.find(
    (m) => m.id.toLowerCase() === safe || m.label.toLowerCase() === safe
  );
  if (custom) return custom;

  // 优雅兜底：保留原本名称，绝不强转为“欢喜”
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
  const [customMoods, setCustomMoods] = useState<MoodOption[]>(getCustomMoods());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🍵");
  const [selectedColor, setSelectedColor] = useState("#a55eea");

  useEffect(() => {
    const handleUpdate = () => {
      setCustomMoods(getCustomMoods());
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
    onChange(created.id);
    setNewLabel("");
    setIsCreating(false);
    setIsMenuOpen(false);
  };

  const handleDeleteCustom = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteCustomMood(id);
    if (value?.toLowerCase() === id.toLowerCase()) {
      onChange("Happy");
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
            {/* 系统预设心情 */}
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "rgba(128, 128, 128, 0.8)",
                padding: "4px 8px 2px",
                userSelect: "none",
              }}
            >
              预设心境
            </div>
            {DEFAULT_MOODS.map((m) => {
              const Icon = m.icon;
              return (
                <MenuItem
                  key={m.id}
                  icon={
                    Icon ? (
                      <Icon style={{ color: m.hex }} />
                    ) : (
                      <span>{m.emoji}</span>
                    )
                  }
                  onClick={() => {
                    onChange(m.id);
                    setIsMenuOpen(false);
                  }}
                >
                  {m.label} {m.emoji}
                </MenuItem>
              );
            })}

            {/* 用户自定义心情 */}
            {customMoods.length > 0 && (
              <>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "rgba(128, 128, 128, 0.8)",
                    padding: "8px 8px 2px",
                    borderTop: "1px solid rgba(128, 128, 128, 0.15)",
                    marginTop: "4px",
                    userSelect: "none",
                  }}
                >
                  自定义分类
                </div>
                {customMoods.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "2px 4px",
                    }}
                  >
                    <MenuItem
                      style={{ flex: 1 }}
                      icon={<span style={{ fontSize: "14px" }}>{m.emoji || "✨"}</span>}
                      onClick={() => {
                        onChange(m.id);
                        setIsMenuOpen(false);
                      }}
                    >
                      <span style={{ color: m.hex, fontWeight: 500 }}>{m.label}</span>
                    </MenuItem>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCustom(e, m.id)}
                      title="删除该分类"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        opacity: 0.5,
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        borderRadius: "4px",
                        color: "#e74c3c",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
                    >
                      <Delete20Regular style={{ fontSize: "16px" }} />
                    </button>
                  </div>
                ))}
              </>
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

