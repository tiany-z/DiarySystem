import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAppTheme } from "../context/ThemeContext";

/**
 * CustomFloatingScrollbar
 * 纯 HTML + CSS + JS 手搓的全局浮动滚动条
 * 特性：
 * 1. 完全脱离文档流（position: fixed 悬浮定位），0px 占用正常文档流布局空间，杜绝任何页面宽度抖动与跳动
 * 2. 纯 HTML 轨道 (track) 与滑块 (thumb) 实现，替代浏览器原生滚动条
 * 3. 丝滑拖拽（鼠标与触控支持）、轨道点击瞬时平滑跳转
 * 4. 自动感知动态内容高度变动（ResizeObserver + MutationObserver）
 * 5. 滚动时即时浮现，静止 1.2s 后优雅淡出，hover / drag 时常驻并适度加宽
 * 6. 完美契合 Fluent UI 深色与浅色模式
 */
export const CustomScrollbar: React.FC = () => {
  const { isDark } = useAppTheme();
  const location = useLocation();

  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const [isScrollable, setIsScrollable] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const hideTimerRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startScrollTopRef = useRef(0);
  const thumbHeightRef = useRef(36);
  const maxThumbTopRef = useRef(0);
  const maxScrollTopRef = useRef(0);

  // 计算滑块高度与当前垂直偏移量
  const updateMetrics = useCallback(() => {
    // 若在 AI 助手全屏页面或编辑器覆盖层，全屏内部自行处理，隐藏全局窗口滚动条
    if (location.pathname.startsWith("/workspace/ai")) {
      setIsScrollable(false);
      return;
    }

    const doc = document.documentElement;
    const scrollHeight = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
    const clientHeight = doc.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    // 当页面没有超出视口高度时，无需显示滚动条
    if (maxScroll <= 4) {
      setIsScrollable(false);
      return;
    }

    setIsScrollable(true);

    if (!trackRef.current || !thumbRef.current) return;
    const trackHeight = trackRef.current.clientHeight;
    if (trackHeight <= 0) return;

    // 最低 36px 确保良好触握与可拖拽性
    const minThumbHeight = 36;
    const ratio = clientHeight / scrollHeight;
    const calculatedHeight = ratio * trackHeight;
    const thumbHeight = Math.max(minThumbHeight, Math.min(trackHeight, calculatedHeight));
    const maxThumbTop = trackHeight - thumbHeight;

    thumbHeightRef.current = thumbHeight;
    maxThumbTopRef.current = maxThumbTop;
    maxScrollTopRef.current = maxScroll;

    const currentScrollY = window.scrollY || doc.scrollTop || 0;
    const scrollRatio = maxScroll > 0 ? Math.min(1, Math.max(0, currentScrollY / maxScroll)) : 0;
    const thumbTop = scrollRatio * maxThumbTop;

    thumbRef.current.style.height = `${thumbHeight}px`;
    thumbRef.current.style.transform = `translate3d(0, ${thumbTop}px, 0)`;
  }, [location.pathname]);

  // 监听原生滚动与窗口缩放
  useEffect(() => {
    const handleScroll = () => {
      updateMetrics();

      // 滚动发生时立即展现
      setIsVisible(true);
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }

      // 静止 1200ms 后自动淡出（除非正在 hover 或拖拽）
      hideTimerRef.current = window.setTimeout(() => {
        if (!isDraggingRef.current) {
          setIsVisible(false);
        }
      }, 1200);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    // 初始化执行
    handleScroll();

    // 监听文档尺寸与节点变动，例如动态加载笔记卡片、图片展开等
    const resizeObserver = new ResizeObserver(() => {
      updateMetrics();
    });
    resizeObserver.observe(document.documentElement);
    if (document.body) {
      resizeObserver.observe(document.body);
    }

    const mutationObserver = new MutationObserver(() => {
      updateMetrics();
    });
    if (document.body) {
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, [updateMetrics]);

  // 路由跳转时延迟同步一次度量
  useEffect(() => {
    const t = setTimeout(updateMetrics, 120);
    return () => clearTimeout(t);
  }, [location.pathname, updateMetrics]);

  // 鼠标拖拽滑块
  const handleThumbMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = true;
    setIsDragging(true);
    setIsVisible(true);
    startYRef.current = e.clientY;
    startScrollTopRef.current = window.scrollY || document.documentElement.scrollTop || 0;

    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = moveEvent.clientY - startYRef.current;
      const maxThumb = maxThumbTopRef.current;
      const maxScroll = maxScrollTopRef.current;

      if (maxThumb > 0) {
        const scrollDelta = (deltaY / maxThumb) * maxScroll;
        const newScrollTop = Math.max(0, Math.min(maxScroll, startScrollTopRef.current + scrollDelta));
        window.scrollTo({ top: newScrollTop, behavior: "instant" });
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      hideTimerRef.current = window.setTimeout(() => {
        setIsVisible(false);
      }, 1200);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // 触控拖拽滑块
  const handleThumbTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();

    isDraggingRef.current = true;
    setIsDragging(true);
    setIsVisible(true);
    startYRef.current = e.touches[0].clientY;
    startScrollTopRef.current = window.scrollY || document.documentElement.scrollTop || 0;

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (!isDraggingRef.current || moveEvent.touches.length !== 1) return;
      const deltaY = moveEvent.touches[0].clientY - startYRef.current;
      const maxThumb = maxThumbTopRef.current;
      const maxScroll = maxScrollTopRef.current;

      if (maxThumb > 0) {
        const scrollDelta = (deltaY / maxThumb) * maxScroll;
        const newScrollTop = Math.max(0, Math.min(maxScroll, startScrollTopRef.current + scrollDelta));
        window.scrollTo({ top: newScrollTop, behavior: "instant" });
      }
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);

      hideTimerRef.current = window.setTimeout(() => {
        setIsVisible(false);
      }, 1200);
    };

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
  };

  // 点击轨道空白处跳跃滚动
  const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === thumbRef.current) return;
    if (!trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const thumbH = thumbHeightRef.current;
    const maxThumb = maxThumbTopRef.current;
    const maxScroll = maxScrollTopRef.current;

    if (maxThumb <= 0) return;

    // 将滑块中心对齐点击位置
    const targetThumbTop = Math.max(0, Math.min(maxThumb, clickY - thumbH / 2));
    const targetRatio = targetThumbTop / maxThumb;
    const targetScrollTop = targetRatio * maxScroll;

    window.scrollTo({ top: targetScrollTop, behavior: "smooth" });
  };

  if (!isScrollable) return null;

  // 颜色调优：根据深浅主题与激活态匹配 Fluent 风格
  const thumbBg = isDragging
    ? isDark
      ? "rgba(255, 255, 255, 0.72)"
      : "rgba(0, 0, 0, 0.65)"
    : isHovered
    ? isDark
      ? "rgba(255, 255, 255, 0.50)"
      : "rgba(0, 0, 0, 0.44)"
    : isDark
    ? "rgba(255, 255, 255, 0.28)"
    : "rgba(0, 0, 0, 0.24)";

  const trackBg = isHovered || isDragging
    ? isDark
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(0, 0, 0, 0.04)"
    : "transparent";

  const thumbWidth = isHovered || isDragging ? 7 : 4;
  const show = isVisible || isHovered || isDragging;

  return (
    <aside
      aria-label="自定义滚动条"
      className="custom-floating-scrollbar"
      style={{
        position: "fixed",
        top: "var(--header-height, 64px)",
        right: 0,
        bottom: 0,
        width: "12px",
        zIndex: 1200,
        pointerEvents: "none",
        opacity: show ? 1 : 0,
        transition: "opacity 0.25s cubic-bezier(0.1, 0.9, 0.2, 1)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={trackRef}
        className="custom-scrollbar-track"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          backgroundColor: trackBg,
          pointerEvents: "auto",
          cursor: "pointer",
          transition: "background-color 0.2s ease",
        }}
        onMouseDown={handleTrackMouseDown}
      >
        <div
          ref={thumbRef}
          className="custom-scrollbar-thumb"
          style={{
            position: "absolute",
            right: "2px",
            width: `${thumbWidth}px`,
            borderRadius: "999px",
            backgroundColor: thumbBg,
            cursor: isDragging ? "grabbing" : "grab",
            transition: "width 0.15s ease, background-color 0.2s ease",
            willChange: "transform, height",
          }}
          onMouseDown={handleThumbMouseDown}
          onTouchStart={handleThumbTouchStart}
        />
      </div>
    </aside>
  );
};
