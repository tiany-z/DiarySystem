import React, { createContext, useContext, useEffect, useState } from "react";
import {
  Theme,
  BrandVariants,
  createLightTheme,
  createDarkTheme,
  webDarkTheme,
  webLightTheme,
} from "@fluentui/react-components";

export type ThemeMode = "auto" | "dark" | "light";

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  theme: Theme;
  toggleTheme: () => void;
  forceCodeDark: boolean;
  toggleForceCodeDark: () => void;
  setForceCodeDark: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "auto",
  setThemeMode: () => {},
  isDark: false,
  theme: webLightTheme,
  toggleTheme: () => {},
  forceCodeDark: true,
  toggleForceCodeDark: () => {},
  setForceCodeDark: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 读取本地存储的主题模式：auto | dark | light (默认为 auto 跟随系统)
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    localStorage.removeItem("diary_theme");
    localStorage.removeItem("diary_theme_choice");
    const savedMode = localStorage.getItem("diary_theme_mode") as ThemeMode | null;
    if (savedMode === "auto" || savedMode === "dark" || savedMode === "light") {
      return savedMode;
    }
    const legacy = localStorage.getItem("diary_fluent_theme_v3");
    if (legacy === "dark") return "dark";
    if (legacy === "light") return "light";
    return "auto";
  });

  // 系统偏好监听 (prefers-color-scheme)
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // 计算当前是否为深色
  const isDark = themeMode === "auto" ? systemPrefersDark : themeMode === "dark";

  // Markdown 代码块强制深色模式偏好设置：默认开启深色极客质感，并在本地浏览器缓存持久化
  const [forceCodeDark, setForceCodeDarkState] = useState<boolean>(() => {
    const saved = localStorage.getItem("diary_code_force_dark");
    if (saved === "false") return false;
    return true; // 默认开启代码块深色模式
  });

  useEffect(() => {
    localStorage.setItem("diary_theme_mode", themeMode);
    localStorage.setItem("diary_fluent_theme_v3", isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
      document.documentElement.style.backgroundColor = "#18181b";
      document.body.style.backgroundColor = "#18181b";
      document.body.style.color = "#f4f4f5";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      document.documentElement.style.backgroundColor = "#ffffff";
      document.body.style.backgroundColor = "#ffffff";
      document.body.style.color = "#0f172a";
    }
  }, [themeMode, isDark]);

  useEffect(() => {
    localStorage.setItem("diary_code_force_dark", forceCodeDark ? "true" : "false");
    if (forceCodeDark) {
      document.documentElement.classList.add("force-code-dark");
    } else {
      document.documentElement.classList.remove("force-code-dark");
    }
  }, [forceCodeDark]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const toggleTheme = () => {
    setThemeModeState((prev) => {
      if (prev === "auto") {
        return systemPrefersDark ? "light" : "dark";
      }
      return prev === "dark" ? "light" : "dark";
    });
  };

  const toggleForceCodeDark = () => setForceCodeDarkState((prev) => !prev);
  const setForceCodeDark = (val: boolean) => setForceCodeDarkState(val);

  // 全局主题色统一定制为 雾霾灰蓝 (#5B7B8D, rgb(91, 123, 141))
  const mistyBlueRamp: BrandVariants = {
    10: "#172127",
    20: "#213038",
    30: "#2B3E48",
    40: "#364D5A",
    50: "#405C6B",
    60: "#4B6B7D",
    70: "#537487",
    80: "#5B7B8D", // 雾霾灰蓝核心主色
    90: "#688798",
    100: "#7693A3",
    110: "#859FAF",
    120: "#94ACBA",
    130: "#A4BAC6",
    140: "#B5C7D2",
    150: "#C7D5DE",
    160: "#DAE4EA",
  };

  const customLightTheme: Theme = {
    ...createLightTheme(mistyBlueRamp),
    colorBrandBackground: "#5B7B8D",
    colorBrandBackgroundHover: "#4F6D7E",
    colorBrandBackgroundPressed: "#3F5765",
    colorBrandBackgroundSelected: "#5B7B8D",
    colorCompoundBrandBackground: "#5B7B8D",
    colorCompoundBrandBackgroundHover: "#4F6D7E",
    colorCompoundBrandBackgroundPressed: "#3F5765",
  };

  const customDarkTheme: Theme = {
    ...createDarkTheme(mistyBlueRamp),
    colorBrandBackground: "#5B7B8D",
    colorBrandBackgroundHover: "#688798",
    colorBrandBackgroundPressed: "#4F6D7E",
    colorBrandBackgroundSelected: "#5B7B8D",
    colorCompoundBrandBackground: "#5B7B8D",
    colorCompoundBrandBackgroundHover: "#688798",
    colorCompoundBrandBackgroundPressed: "#4F6D7E",
  };

  const currentTheme = isDark ? customDarkTheme : customLightTheme;

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode,
        isDark,
        theme: currentTheme,
        toggleTheme,
        forceCodeDark,
        toggleForceCodeDark,
        setForceCodeDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
