import React, { createContext, useContext, useEffect, useState } from "react";

export interface WindowControlsState {
  /** 是否收到外部信号，启用了外部窗口控制按钮避让 */
  hasExternalControls: boolean;
  /** 外部窗口控件（最小化、还原、关闭）占用的宽度，默认 138px */
  controlsWidth: number;
  /** 手动切换控制状态（用于调试或特定场景） */
  setExternalControls: (enabled: boolean, width?: number) => void;
}

const DEFAULT_CONTROLS_WIDTH = 138;

const WindowControlsContext = createContext<WindowControlsState>({
  hasExternalControls: false,
  controlsWidth: DEFAULT_CONTROLS_WIDTH,
  setExternalControls: () => {},
});

export const useWindowControls = () => useContext(WindowControlsContext);

export const WindowControlsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // 检查首屏 URL 是否携带相关参数，支持即时免闪烁激活
  const getInitialState = (): { enabled: boolean; width: number } => {
    if (typeof window === "undefined") {
      return { enabled: false, width: DEFAULT_CONTROLS_WIDTH };
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const urlHasControls =
        params.get("windowControls") === "true" ||
        params.get("hasControls") === "true" ||
        params.get("embedControls") !== null;

      const customWidthParam =
        params.get("controlsWidth") || params.get("embedControls");
      const parsedWidth = customWidthParam ? parseInt(customWidthParam, 10) : NaN;
      const width = !isNaN(parsedWidth) && parsedWidth > 0 ? parsedWidth : DEFAULT_CONTROLS_WIDTH;

      return {
        enabled: urlHasControls,
        width,
      };
    } catch {
      return { enabled: false, width: DEFAULT_CONTROLS_WIDTH };
    }
  };

  const initial = getInitialState();
  const [hasExternalControls, setHasExternalControlsState] = useState<boolean>(initial.enabled);
  const [controlsWidth, setControlsWidth] = useState<number>(initial.width);

  const setExternalControls = (enabled: boolean, width?: number) => {
    setHasExternalControlsState(enabled);
    if (width !== undefined && !isNaN(width) && width > 0) {
      setControlsWidth(width);
    }
  };

  // 同步 CSS 类与 CSS 变量到 documentElement，方便全局样式与动画统一取用
  useEffect(() => {
    const root = document.documentElement;
    if (hasExternalControls) {
      root.classList.add("has-external-controls");
      root.style.setProperty("--external-controls-width", `${controlsWidth}px`);
    } else {
      root.classList.remove("has-external-controls");
      root.style.removeProperty("--external-controls-width");
    }
  }, [hasExternalControls, controlsWidth]);

  // 监听外部网页（宿主 / iframe 父级 / 外部通信通道）发来的 postMessage 信号
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 容错安全防御
      if (!event || !event.data) return;

      const data = event.data;

      // 1. 支持字符串指令形式：'ENABLE_WINDOW_CONTROLS' / 'DISABLE_WINDOW_CONTROLS'
      if (typeof data === "string") {
        if (data === "ENABLE_WINDOW_CONTROLS" || data === "SG_ENABLE_WINDOW_CONTROLS") {
          setHasExternalControlsState(true);
          return;
        }
        if (data === "DISABLE_WINDOW_CONTROLS" || data === "SG_DISABLE_WINDOW_CONTROLS") {
          setHasExternalControlsState(false);
          return;
        }
      }

      // 2. 支持对象协议形式：{ type: 'SET_WINDOW_CONTROLS', enabled: true, width: 138 }
      if (typeof data === "object") {
        const type = data.type || data.action;
        const isMatchedType =
          type === "SET_WINDOW_CONTROLS" ||
          type === "SG_WINDOW_CONTROLS" ||
          type === "WINDOW_CONTROLS" ||
          type === "EMBED_WINDOW_CONTROLS" ||
          type === "UPDATE_WINDOW_CONTROLS";

        if (isMatchedType) {
          const enabled = data.enabled !== undefined ? Boolean(data.enabled) : true;
          const incomingWidth =
            typeof data.width === "number"
              ? data.width
              : typeof data.width === "string"
                ? parseInt(data.width, 10)
                : undefined;

          setHasExternalControlsState(enabled);
          if (incomingWidth && !isNaN(incomingWidth) && incomingWidth > 0) {
            setControlsWidth(incomingWidth);
          }

          // 向发送源回复确认握手 ACK
          try {
            if (event.source && "postMessage" in event.source) {
              (event.source as Window).postMessage(
                {
                  type: "SET_WINDOW_CONTROLS_ACK",
                  success: true,
                  enabled,
                  width: incomingWidth || controlsWidth,
                },
                "*"
              );
            }
          } catch {
            // 忽略跨域 ACK 发送失败
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [controlsWidth]);

  return (
    <WindowControlsContext.Provider
      value={{
        hasExternalControls,
        controlsWidth,
        setExternalControls,
      }}
    >
      {children}
    </WindowControlsContext.Provider>
  );
};
