import { useEffect, useState } from "react";
import type { DialogProps, DialogSurfaceProps } from "@fluentui/react-components";
import { createPresenceComponent } from "@fluentui/react-motion";

/**
 * 全局统一弹窗动效配置:
 * 1. 打开动画: 0.3s (300ms)，曲线 cubic-bezier(0.1, 0.9, 0.2, 1)
 *    从聪慧放大 (0.9 -> 1.04 [65%]) 到缩小到正常大小 (1.0 [100%])
 * 2. 关闭动画: 0.3s (300ms)，曲线 cubic-bezier(0.1, 0.9, 0.2, 1)
 *    从正常到放大 (1.0 -> 1.08 [100%], 透明度 1 -> 0)
 */
export const smartZoomDialogSurfaceMotion: DialogProps["surfaceMotion"] = createPresenceComponent(() => ({
  enter: [
    {
      keyframes: [
        { opacity: 0, transform: "scale(0.9)", offset: 0 },
        { opacity: 1, transform: "scale(1.04)", offset: 0.65 },
        { opacity: 1, transform: "scale(1)", offset: 1 },
      ],
      duration: 300,
      easing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
      fill: "both",
    },
  ],
  exit: [
    {
      keyframes: [
        { opacity: 1, transform: "scale(1)", offset: 0 },
        { opacity: 0, transform: "scale(1.08)", offset: 1 },
      ],
      duration: 300,
      easing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
      fill: "both",
    },
  ],
})) as any;

export const smartZoomBackdropMotion: DialogSurfaceProps["backdropMotion"] = {
  duration: 300,
  exitDuration: 300,
  easing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
  exitEasing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
} as any;

/**
 * 保持向下兼容导出的配置引用
 */
export const win10DialogSurfaceMotion = smartZoomDialogSurfaceMotion;
export const win10DialogBackdropMotion = smartZoomBackdropMotion;
export const mobileDrawerSurfaceMotion = smartZoomDialogSurfaceMotion;

/**
 * 精准判断当前是否处于平板设备 (明确区分并排除手机与桌面):
 * 1. iPad: UA 包含 iPad，或者 iPadOS (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
 * 2. Android 平板: UA 包含 Android 但不包含 Mobile
 * 3. 其他平板关键词: Tablet, PlayBook, Silk 等
 */
export function isTabletDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIPad = /iPad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
  const isOtherTablet = /Tablet|PlayBook|Silk/i.test(ua);
  return isIPad || isAndroidTablet || isOtherTablet;
}

/**
 * 精准判断当前是否处于手机移动端界面 (明确排除平板):
 * 1. 若当前设备属于平板 (isTabletDevice)，直接返回 false (绝对排除平板)！
 * 2. 视口宽度 <= 640px: 无论真机或浏览器响应式调试，一律判定为手机移动端界面；
 * 3. 真实手机移动端设备识别: iPhone, iPod, Android Mobile, Windows Phone；
 * 4. 手机横屏场景: 手机设备且视口高度 <= 500px。
 */
export function isMobilePhone(): boolean {
  if (typeof window === "undefined") return false;

  // 0. 明确优先排除平板！
  if (isTabletDevice()) {
    return false;
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  const ua = navigator.userAgent;

  // 1. 视口宽度 <= 640px: 响应式窄屏手机模式
  if (w <= 640) {
    return true;
  }

  // 2. 真实手机移动端设备识别
  const isIPhone = /iPhone|iPod/i.test(ua);
  const isAndroidMobile = /Android/i.test(ua) && /Mobile/i.test(ua);
  const isWindowsPhone = /Windows Phone/i.test(ua);
  const isPhoneDevice = isIPhone || isAndroidMobile || isWindowsPhone;

  // 3. 手机横屏场景 (高度 <= 500px 且是手机设备)
  if (isPhoneDevice && h <= 500) {
    return true;
  }

  return false;
}

// 模块加载时同步至 <html> class
if (typeof window !== "undefined" && typeof document !== "undefined") {
  const syncClass = () => {
    if (isMobilePhone()) {
      document.documentElement.classList.add("is-mobile-phone");
    } else {
      document.documentElement.classList.remove("is-mobile-phone");
    }
  };
  syncClass();
  window.addEventListener("resize", syncClass);
  window.addEventListener("orientationchange", syncClass);
}

/**
 * 响应式 Hook: 监听窗口尺寸变化，动态判断是否处于手机移动端界面
 */
export function useIsMobilePhone(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => isMobilePhone());

  useEffect(() => {
    const handleResize = () => {
      const mobile = isMobilePhone();
      setIsMobile(mobile);
      if (typeof document !== "undefined") {
        if (mobile) {
          document.documentElement.classList.add("is-mobile-phone");
        } else {
          document.documentElement.classList.remove("is-mobile-phone");
        }
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return isMobile;
}

/**
 * 统一获取当前环境的最佳 Dialog 动效:
 * 所有弹窗统一使用 0.3s cubic-bezier(0.1, 0.9, 0.2, 1) 的聪慧放大缩小进场与放大离场动效
 */
export function useAppDialogMotion() {
  const isMobile = useIsMobilePhone();

  return {
    surfaceMotion: smartZoomDialogSurfaceMotion,
    backdropMotion: smartZoomBackdropMotion,
    isMobile,
  };
}
