import React, { createContext, useContext, useState, useCallback } from "react";

export type SettingsTabKey = "ai" | "wallpaper" | "profile" | "theme";

interface SettingsContextType {
  isSettingsOpen: boolean;
  activeTab: SettingsTabKey;
  openSettings: (tab?: SettingsTabKey) => void;
  closeSettings: () => void;
  setActiveTab: (tab: SettingsTabKey) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  isSettingsOpen: false,
  activeTab: "ai",
  openSettings: () => {},
  closeSettings: () => {},
  setActiveTab: () => {},
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("ai");

  const openSettings = useCallback((tab?: SettingsTabKey) => {
    if (tab) {
      setActiveTab(tab);
    }
    setIsSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        isSettingsOpen,
        activeTab,
        openSettings,
        closeSettings,
        setActiveTab,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);

export default SettingsContext;
