import React from "react";
import { Badge, Button, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Tooltip } from "@fluentui/react-components";
import {
  BrainCircuit20Regular,
  Clock20Regular,
  Emoji20Regular,
  EmojiSad20Regular,
  Heart20Regular,
  Sparkle20Regular,
} from "@fluentui/react-icons";

export const MOOD_OPTIONS = [
  { id: "Happy", label: "欢喜", color: "brand" as const, icon: Emoji20Regular, hex: "#ff9f43" },
  { id: "Peaceful", label: "宁静", color: "success" as const, icon: Heart20Regular, hex: "#10ac84" },
  { id: "Excited", label: "充沛", color: "important" as const, icon: Sparkle20Regular, hex: "#ee5253" },
  { id: "Thinking", label: "沉思", color: "informative" as const, icon: BrainCircuit20Regular, hex: "#2e86de" },
  { id: "Tired", label: "倦怠", color: "warning" as const, icon: Clock20Regular, hex: "#f368e0" },
  { id: "Sad", label: "低落", color: "severe" as const, icon: EmojiSad20Regular, hex: "#576574" },
];

export const MoodIcon: React.FC<{ mood?: string | null; size?: number }> = ({
  mood,
  size = 17,
}) => {
  const safeMood = (mood || "Happy").toLowerCase();
  const item = MOOD_OPTIONS.find((m) => m.id.toLowerCase() === safeMood) || MOOD_OPTIONS[0];
  const Icon = item.icon;

  return (
    <Tooltip content={`心境：${item.label}`} relationship="label">
      <span
        className="note-card-meta-icon"
        style={{ color: item.hex }}
        aria-label={`心境: ${item.label}`}
      >
        <Icon style={{ fontSize: `${size}px` }} />
      </span>
    </Tooltip>
  );
};

export const MoodBadge: React.FC<{ mood?: string | null; size?: "medium" | "large" }> = ({
  mood,
  size = "medium",
}) => {
  const safeMood = (mood || "Happy").toLowerCase();
  const item = MOOD_OPTIONS.find((m) => m.id.toLowerCase() === safeMood) || MOOD_OPTIONS[0];
  const Icon = item.icon;

  return (
    <Badge
      appearance="tint"
      color={item.color}
      size={size}
      icon={<Icon style={{ color: item.hex, fontSize: "16px" }} />}
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

export const MoodPicker: React.FC<{
  value?: string | null;
  onChange: (val: string) => void;
  borderless?: boolean;
  size?: "small" | "medium";
  style?: React.CSSProperties;
}> = ({ value, onChange, borderless = false, size = "medium", style }) => {
  const safeVal = (value || "Happy").toLowerCase();
  const current = MOOD_OPTIONS.find((m) => m.id.toLowerCase() === safeVal) || MOOD_OPTIONS[0];
  const CurrentIcon = current.icon;

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Button
          appearance="subtle"
          size={size}
          icon={<CurrentIcon style={{ color: current.hex, fontSize: size === "small" ? "15px" : "17px" }} />}
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
      <MenuPopover>
        <MenuList>
          {MOOD_OPTIONS.map((m) => {
            const Icon = m.icon;
            return (
              <MenuItem
                key={m.id}
                icon={<Icon style={{ color: m.hex }} />}
                onClick={() => onChange(m.id)}
              >
                {m.label}
              </MenuItem>
            );
          })}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};
