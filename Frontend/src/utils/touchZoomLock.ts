/**
 * 全局防触摸缩放与手势锁定服务
 * 1. 禁用移动端/触屏双指捏合缩放网页 (Pinch-to-zoom)
 * 2. 禁用双击屏幕放大网页
 * 3. 针对 iOS Safari gesturestart/gesturechange 进行底层拦截
 * 4. 特别放行：处于 .image-lightbox-portal (图片/图表灯箱) 内部的手势操作完全交由灯箱自身处理
 */

let isInitialized = false;

export function initTouchZoomLock(): void {
  if (typeof window === "undefined" || isInitialized) return;
  isInitialized = true;

  // 1. 拦截双指以上触摸移动 (阻止浏览器触发整页缩放)
  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches && e.touches.length > 1) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(".image-lightbox-portal")) {
        e.preventDefault();
      }
    }
  };

  // 2. 拦截 iOS Safari 专属手势事件 (gesturestart / gesturechange / gestureend)
  const handleGesture = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (!target?.closest(".image-lightbox-portal")) {
      e.preventDefault();
    }
  };

  // 3. 拦截快速双击放大 (Double-tap to zoom)
  let lastTouchEndTime = 0;
  const handleTouchEnd = (e: TouchEvent) => {
    const now = Date.now();
    const target = e.target as HTMLElement | null;
    if (now - lastTouchEndTime <= 300) {
      if (
        !target?.closest(".image-lightbox-portal") &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName || "") &&
        !target?.isContentEditable
      ) {
        e.preventDefault();
      }
    }
    lastTouchEndTime = now;
  };

  // 4. 拦截 Ctrl + 滚轮缩放浏览器页面 (非灯箱区域)
  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(".image-lightbox-portal")) {
        e.preventDefault();
      }
    }
  };

  // 挂载非被动 (passive: false) 监听器，确保 preventDefault 能够严格生效
  try {
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("gesturestart", handleGesture, { passive: false });
    document.addEventListener("gesturechange", handleGesture, { passive: false });
    document.addEventListener("gestureend", handleGesture, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: false });
    window.addEventListener("wheel", handleWheel, { passive: false });
  } catch (err) {
    console.warn("Failed to initialize touch zoom lock:", err);
  }
}
