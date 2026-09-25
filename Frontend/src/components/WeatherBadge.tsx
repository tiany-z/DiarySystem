import React from "react";
import { Badge, Button, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Tooltip } from "@fluentui/react-components";
import {
  WeatherBlowingSnow20Regular,
  WeatherPartlyCloudyDay20Regular,
  WeatherRain20Regular,
  WeatherSnow20Regular,
  WeatherSunny20Regular,
  WeatherThunderstorm20Regular,
} from "@fluentui/react-icons";

export const WEATHER_OPTIONS = [
  { id: "Sunny", label: "晴天", icon: WeatherSunny20Regular, color: "#f39c12" },
  { id: "Cloudy", label: "多云", icon: WeatherPartlyCloudyDay20Regular, color: "#3498db" },
  { id: "Rainy", label: "雨天", icon: WeatherRain20Regular, color: "#2980b9" },
  { id: "Snowy", label: "雪天", icon: WeatherSnow20Regular, color: "#1abc9c" },
  { id: "Windy", label: "大风", icon: WeatherBlowingSnow20Regular, color: "#16a085" },
  { id: "Thunder", label: "雷阵雨", icon: WeatherThunderstorm20Regular, color: "#8e44ad" },
];

export const WeatherIcon: React.FC<{ weather?: string | null; size?: number }> = ({
  weather,
  size = 17,
}) => {
  const safeWeather = (weather || "Sunny").toLowerCase();
  const item = WEATHER_OPTIONS.find((w) => w.id.toLowerCase() === safeWeather) || WEATHER_OPTIONS[0];
  const Icon = item.icon;

  return (
    <Tooltip content={`天气：${item.label}`} relationship="label">
      <span
        className="note-card-meta-icon"
        style={{ color: item.color }}
        aria-label={`天气: ${item.label}`}
      >
        <Icon style={{ fontSize: `${size}px` }} />
      </span>
    </Tooltip>
  );
};

export const WeatherBadge: React.FC<{ weather?: string | null; size?: "medium" | "large" }> = ({
  weather,
  size = "medium",
}) => {
  const safeWeather = (weather || "Sunny").toLowerCase();
  const item = WEATHER_OPTIONS.find((w) => w.id.toLowerCase() === safeWeather) || WEATHER_OPTIONS[0];
  const Icon = item.icon;

  return (
    <Badge
      appearance="tint"
      color="informative"
      size={size}
      icon={<Icon style={{ color: item.color, fontSize: "16px" }} />}
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

export const WeatherPicker: React.FC<{
  value?: string | null;
  onChange: (val: string) => void;
  borderless?: boolean;
  size?: "small" | "medium";
  style?: React.CSSProperties;
}> = ({ value, onChange, borderless = false, size = "medium", style }) => {
  const safeVal = (value || "Sunny").toLowerCase();
  const current = WEATHER_OPTIONS.find((w) => w.id.toLowerCase() === safeVal) || WEATHER_OPTIONS[0];
  const CurrentIcon = current.icon;

  return (
    <Menu
      positioning={{
        position: borderless ? "above" : "below",
        align: "start",
        pinned: true,
        useTransform: false,
      }}
      surfaceMotion={null}
    >
      <MenuTrigger disableButtonEnhancement>
        <Button
          appearance="subtle"
          size={size}
          icon={<CurrentIcon style={{ color: current.color, fontSize: size === "small" ? "15px" : "17px" }} />}
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
          {WEATHER_OPTIONS.map((w) => {
            const Icon = w.icon;
            return (
              <MenuItem
                key={w.id}
                icon={<Icon style={{ color: w.color }} />}
                onClick={() => onChange(w.id)}
              >
                {w.label}
              </MenuItem>
            );
          })}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};
