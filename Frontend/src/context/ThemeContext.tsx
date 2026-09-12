import React, { createContext, useContext, useEffect, useState } from "react";
import { Theme, webDarkTheme, webLightTheme } from "@fluentui/react-components";

interface ThemeContextType {
  isDark: boolean;
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  theme: webLightTheme,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 默认使用纯白晶亮、明朗高雅的 Microsoft Fluent 2 浅色模式，彻底清理旧版本残留缓存
  const [isDark, setIsDark] = useState<boolean>(() => {
    localStorage.removeItem("diary_theme");
    localStorage.removeItem("diary_theme_choice");
    const saved = localStorage.getItem("diary_fluent_theme_v3");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return false; // 默认浅色模式，决不自动回退至深色
  });

  useEffect(() => {
    localStorage.setItem("diary_fluent_theme_v3", isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
      document.body.style.backgroundColor = "#18181b";
      document.body.style.color = "#f4f4f5";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      document.body.style.backgroundColor = "#ffffff";
      document.body.style.color = "#0f172a";
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const currentTheme = isDark ? webDarkTheme : webLightTheme;

  return (
    <ThemeContext.Provider value={{ isDark, theme: currentTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
