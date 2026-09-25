import React, { useState, useEffect, useMemo } from "react";
import {
  Badge,
  Button,
  Input,
  Popover,
  PopoverTrigger,
  PopoverSurface,
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
  Checkmark20Regular,
} from "@fluentui/react-icons";
import { usePageCache } from "../context/PageCacheContext";

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
const LEGACY_CUSTOM_MOODS_KEY = "diary_custom_moods";
const DELETED_MOODS_STORAGE_KEY = "diary_deleted_mood_ids";
const DISCOVERED_MOODS_KEY = "diary_discovered_note_moods";

// 获取用户明确删除的心情 ID / 名称黑名单
export const getDeletedMoodIds = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DELETED_MOODS_STORAGE_KEY);
    if (!raw) return new Set();
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return new Set();
    return new Set(
      list
        .map((id: any) => (id ? String(id).trim().toLowerCase() : ""))
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
};

// 获取系统所有可用心境类别（包含默认与已有自定义分类，严格排除已删除类别）
export const getUserMoods = (): MoodOption[] => {
  if (typeof window === "undefined") return DEFAULT_MOODS;
  const deletedSet = getDeletedMoodIds();
  const map = new Map<string, MoodOption>();

  // 1. 系统默认分类（未删除者）
  for (const m of DEFAULT_MOODS) {
    const lowerId = String(m.id || "").trim().toLowerCase();
    const lowerLabel = String(m.label || "").trim().toLowerCase();
    if (!deletedSet.has(lowerId) && !deletedSet.has(lowerLabel)) {
      map.set(lowerId, { ...m, isCustom: false });
    }
  }

  // 2. 本地保存的自定义与已有分类（兼容新旧两个 localStorage 键与缓存的日记已有分类）
  for (const key of [USER_MOODS_STORAGE_KEY, LEGACY_CUSTOM_MOODS_KEY, DISCOVERED_MOODS_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (!item) continue;
          const id = String(item.id || item.label || "").trim();
          if (!id) continue;
          const lowerId = id.toLowerCase();
          const lowerLabel = String(item.label || id).trim().toLowerCase();
          if (deletedSet.has(lowerId) || deletedSet.has(lowerLabel)) continue;
          map.set(lowerId, {
            id,
            label: String(item.label || id).trim(),
            emoji: item.emoji || "✨",
            color: item.color || "brand",
            icon: item.icon || MOOD_ICON_MAP[lowerId],
            hex: item.hex || "#a55eea",
            isCustom: true,
          });
        }
      }
    } catch { }
  }

  return Array.from(map.values());
};

export const getCustomMoods = getUserMoods;

export const saveCustomMood = (newMood: {
  label: string;
  emoji?: string;
  hex?: string;
}): MoodOption => {
  const trimmed = String(newMood.label || "").trim();
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
  const lower = id.toLowerCase();
  if (deletedSet.has(lower)) {
    deletedSet.delete(lower);
    localStorage.setItem(
      DELETED_MOODS_STORAGE_KEY,
      JSON.stringify(Array.from(deletedSet))
    );
  }

  // 保存到本地用户自定义列表
  try {
    const raw = localStorage.getItem(USER_MOODS_STORAGE_KEY);
    let list: any[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    }
    const filtered = list.filter((m) => {
      const mId = String(m?.id || "").trim().toLowerCase();
      const mLabel = String(m?.label || "").trim().toLowerCase();
      return mId !== lower && mLabel !== lower;
    });
    filtered.push(customItem);
    localStorage.setItem(USER_MOODS_STORAGE_KEY, JSON.stringify(filtered));
  } catch { }

  window.dispatchEvent(
    new CustomEvent("mood:custom_updated", { detail: customItem })
  );
  return customItem;
};

export const deleteMood = (id: string): void => {
  const lower = String(id || "").trim().toLowerCase();
  if (!lower) return;

  const deletedSet = getDeletedMoodIds();
  deletedSet.add(lower);
  localStorage.setItem(
    DELETED_MOODS_STORAGE_KEY,
    JSON.stringify(Array.from(deletedSet))
  );

  // 清除本地存储记录
  for (const key of [USER_MOODS_STORAGE_KEY, LEGACY_CUSTOM_MOODS_KEY, DISCOVERED_MOODS_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const filtered = list.filter((m: any) => {
          const mId = String(m?.id || "").trim().toLowerCase();
          const mLabel = String(m?.label || "").trim().toLowerCase();
          return mId !== lower && mLabel !== lower;
        });
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    } catch { }
  }

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
    map.set(String(m.id || "").toLowerCase(), m);
  }

  // 2. 动态从已有日记中补齐尚未删除的类别，并缓存以便新建笔记等页面使用
  if (notes && Array.isArray(notes)) {
    const discoveredList: any[] = [];
    for (const n of notes) {
      const moodVal = String(n.mood || "").trim();
      if (!moodVal) continue;
      const lower = moodVal.toLowerCase();
      // 用户主动删除的分类坚决不重新展示
      if (deletedSet.has(lower)) continue;
      if (!map.has(lower)) {
        const discoveredItem: MoodOption = {
          id: moodVal,
          label: moodVal,
          emoji: "✨",
          hex: "#8854d0",
          color: "informative",
          isCustom: true,
        };
        map.set(lower, discoveredItem);
        discoveredList.push(discoveredItem);
      }
    }

    if (discoveredList.length > 0) {
      try {
        const raw = localStorage.getItem(DISCOVERED_MOODS_KEY);
        let existingDiscovered: any[] = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(existingDiscovered)) existingDiscovered = [];
        const combined = [...existingDiscovered, ...discoveredList].filter((item, idx, self) =>
          idx === self.findIndex((t) => String(t.id).toLowerCase() === String(item.id).toLowerCase())
        );
        localStorage.setItem(DISCOVERED_MOODS_KEY, JSON.stringify(combined));
      } catch { }
    }
  }

  return Array.from(map.values());
};

export const getMoodOption = (mood?: string | null): MoodOption => {
  const currentList = getUserMoods();
  const safe = String(mood || "").trim().toLowerCase();

  if (safe) {
    const found = currentList.find(
      (m) =>
        String(m.id || "").toLowerCase() === safe ||
        String(m.label || "").toLowerCase() === safe
    );
    if (found) return found;

    // 检查是否在默认但未被删除的分类中
    const deletedSet = getDeletedMoodIds();
    if (!deletedSet.has(safe)) {
      const preset = DEFAULT_MOODS.find((m) => m.id.toLowerCase() === safe);
      if (preset) return preset;

      return {
        id: mood!.trim(),
        label: mood!.trim(),
        emoji: "✨",
        hex: "#8854d0",
        color: "informative",
        isCustom: true,
      };
    }
  }

  // 若无指定有效 mood 或已被删除，优先回退到当前可用分类的第一个
  if (currentList.length > 0) {
    return currentList[0];
  }

  // 终极安全兜底
  return {
    id: "default",
    label: "随笔",
    emoji: "✨",
    hex: "#5B7B8D",
    color: "brand",
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
  notes?: { mood?: string | null }[];
  borderless?: boolean;
  size?: "small" | "medium";
  style?: React.CSSProperties;
}> = ({ value, onChange, notes, borderless = false, size = "medium", style }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🍵");
  const [selectedColor, setSelectedColor] = useState("#a55eea");
  const [updateTick, setUpdateTick] = useState(0);
  const { getCachedData } = usePageCache();

  useEffect(() => {
    const handleUpdate = () => {
      setUpdateTick((prev) => prev + 1);
    };
    window.addEventListener("mood:custom_updated", handleUpdate);
    return () => window.removeEventListener("mood:custom_updated", handleUpdate);
  }, []);

  const current = getMoodOption(value);
  const CurrentIcon = current.icon;

  const cachedNotes = getCachedData<{ mood?: string | null }[]>("workspace_notes");
  const publicNotes = getCachedData<{ mood?: string | null }[]>("public_showcase");

  // 聚合当前系统中的全部心境（预设 + 自定义 + 笔记中已存在的心境 + 当前选中的心境）
  const allMoodsList = useMemo(() => {
    const combinedNotes = notes || [
      ...(cachedNotes || []),
      ...(publicNotes || []),
    ];
    const all = getAllMoods(combinedNotes);

    // 确保当前选中的 value（若来自外部导入或特殊标识）也完整包含在展示列表中
    if (value && value.trim()) {
      const safe = value.trim().toLowerCase();
      const deletedSet = getDeletedMoodIds();
      if (!deletedSet.has(safe) && !all.some((m) => m.id.toLowerCase() === safe || m.label.toLowerCase() === safe)) {
        all.push({
          id: value.trim(),
          label: value.trim(),
          emoji: "✨",
          hex: "#8854d0",
          color: "informative",
          isCustom: true,
        });
      }
    }
    return all;
  }, [notes, cachedNotes, publicNotes, updateTick, value]);

  const handleCreateConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const trimmed = newLabel.trim();
    if (!trimmed) return;

    const created = saveCustomMood({
      label: trimmed,
      emoji: selectedEmoji,
      hex: selectedColor,
    });
    setUpdateTick((prev) => prev + 1);
    onChange(created.id);
    setNewLabel("");
    setIsCreating(false);
    setIsOpen(false);
  };

  const handleDeleteMood = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    deleteMood(id);
    setUpdateTick((prev) => prev + 1);

    // 若当前选中的分类被删除，自动优雅回退至第一个可用分类
    const currentId = String(current?.id || "").toLowerCase();
    const currentLabel = String(current?.label || "").toLowerCase();
    const targetId = String(id || "").toLowerCase();
    if (
      currentId === targetId ||
      currentLabel === targetId ||
      String(value || "").toLowerCase() === targetId
    ) {
      const remaining = allMoodsList.filter(
        (m) =>
          String(m.id || "").toLowerCase() !== targetId &&
          String(m.label || "").toLowerCase() !== targetId
      );
      if (remaining.length > 0) {
        onChange(remaining[0].id);
      } else {
        onChange("default");
      }
    }
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={(_, data) => {
        setIsOpen(data.open);
        if (!data.open) setIsCreating(false);
      }}
      positioning={{
        position: borderless ? "above" : "below",
        align: "start",
        pinned: true,
        useTransform: false,
      }}
      surfaceMotion={null}
      trapFocus={false}
    >
      <PopoverTrigger disableButtonEnhancement>
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
      </PopoverTrigger>

      <PopoverSurface
        className="win11-mica-popover mood-picker-popover"
        style={{
          minWidth: "240px",
          maxWidth: "290px",
          padding: "8px",
          borderRadius: "12px",
          maxHeight: "360px",
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
      >
        {!isCreating ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {/* 统一心境类别列表：支持对任何类别的删除与自定义新增 */}
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "rgba(128, 128, 128, 0.8)",
                padding: "4px 8px 6px",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(128, 128, 128, 0.12)",
                marginBottom: "4px",
              }}
            >
              <span>心境类别</span>
              <span style={{ fontSize: "10px", opacity: 0.65 }}>
                {allMoodsList.length} 个分类
              </span>
            </div>

            {allMoodsList.length === 0 ? (
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
              <div
                className="mood-picker-popover"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  maxHeight: "220px",
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                }}
              >
                {allMoodsList.map((m) => {
                  const Icon = m.icon;
                  const isSelected =
                    String(value || "").toLowerCase() === String(m.id || "").toLowerCase() ||
                    String(value || "").toLowerCase() === String(m.label || "").toLowerCase();
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "2px 4px",
                        borderRadius: "6px",
                        backgroundColor: isSelected ? "rgba(91, 123, 141, 0.1)" : "transparent",
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      <div
                        onClick={() => {
                          onChange(m.id);
                          setIsOpen(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flex: 1,
                          cursor: "pointer",
                          padding: "6px 8px",
                          minWidth: 0,
                          userSelect: "none",
                        }}
                      >
                        {Icon ? (
                          <Icon style={{ color: m.hex, fontSize: "16px", flexShrink: 0 }} />
                        ) : (
                          <span style={{ fontSize: "14px", flexShrink: 0 }}>{m.emoji || "✨"}</span>
                        )}
                        <span
                          style={{
                            color: m.hex,
                            fontWeight: isSelected ? 600 : 500,
                            fontSize: "13px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {m.label}
                        </span>
                      </div>

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
                          padding: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "4px",
                          color: "#e74c3c",
                          transition: "all 0.15s ease",
                          flexShrink: 0,
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
                        <Delete20Regular style={{ fontSize: "14px" }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 底部新增分类入口 (粘性吸底) */}
            <div
              style={{
                borderTop: "1px solid rgba(128, 128, 128, 0.15)",
                marginTop: "6px",
                paddingTop: "6px",
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsCreating(true);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "7px 10px",
                  borderRadius: "8px",
                  border: "1px dashed rgba(91, 123, 141, 0.45)",
                  backgroundColor: "rgba(91, 123, 141, 0.08)",
                  color: "#5B7B8D",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(91, 123, 141, 0.16)";
                  e.currentTarget.style.borderColor = "rgba(91, 123, 141, 0.7)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(91, 123, 141, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(91, 123, 141, 0.45)";
                }}
              >
                <Add20Regular style={{ fontSize: "15px" }} />
                新建心情分类
              </button>
            </div>
          </div>
        ) : (
          /* 内联创建面板 */
          <div
            style={{
              padding: "4px 2px",
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
      </PopoverSurface>
    </Popover>
  );
};

