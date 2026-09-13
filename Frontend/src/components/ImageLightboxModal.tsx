import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Tooltip } from "@fluentui/react-components";
import {
  Add20Regular,
  ArrowReset20Regular,
  Dismiss20Regular,
  Subtract20Regular,
} from "@fluentui/react-icons";

export interface ImageLightboxModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc?: string | null;
  imageAlt?: string;
  svgHtml?: string | null;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  open,
  onClose,
  imageSrc,
  imageAlt,
  svgHtml,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  const positionRef = useRef<{ x: number; y: number }>(position);
  positionRef.current = position;
  const scaleRef = useRef<number>(scale);
  scaleRef.current = scale;

  // 当灯箱打开时，重置缩放和位移状态
  useEffect(() => {
    if (open) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [open, imageSrc, svgHtml]);

  // 重置视图为最大化适应状态
  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // 放大
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(Math.round(prev * 1.25 * 100) / 100, 25));
  }, []);

  // 缩小
  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(Math.round(prev * 0.8 * 100) / 100, 0.2));
  }, []);

  // 核心：拦截原生 non-passive wheel 事件
  // 必须使用原生 addEventListener({ passive: false }) 才能有效调用 preventDefault() 阻止浏览器缩放
  useEffect(() => {
    if (!open) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // 当按下 Ctrl (或 Mac Command) 键滚动滚轮，或者触控板双指缩放时
      if (e.ctrlKey || e.metaKey) {
        // 关键：杜绝影响浏览器页面本身的缩放设置
        e.preventDefault();
        e.stopPropagation();

        const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
        setScale((prev) => {
          const next = Math.min(Math.max(prev * zoomFactor, 0.2), 25);
          return Math.round(next * 100) / 100;
        });
      }
    };

    viewport.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", handleNativeWheel);
    };
  }, [open]);

  // 核心：触摸屏手势引擎 (支持单指平移、双指捏合缩放、手势焦点跟随、双碰复位)
  useEffect(() => {
    if (!open) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    let touchMode: "none" | "pan" | "pinch" = "none";
    let startTouch1 = { x: 0, y: 0 };
    let startDist = 0;
    let startScale = 1;
    let startPos = { x: 0, y: 0 };
    let startMidpoint = { x: 0, y: 0 };
    let hasMoved = false;
    let lastTapTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest(".image-lightbox-top-bar")) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      const touches = e.touches;
      if (touches.length === 1) {
        touchMode = "pan";
        hasMoved = false;
        startTouch1 = { x: touches[0].clientX, y: touches[0].clientY };
        startPos = { ...positionRef.current };
        setIsDragging(true);
      } else if (touches.length >= 2) {
        touchMode = "pinch";
        hasMoved = true;
        const t1 = touches[0];
        const t2 = touches[1];
        startDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        startScale = scaleRef.current;
        startPos = { ...positionRef.current };
        startMidpoint = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };
        setIsDragging(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest(".image-lightbox-top-bar")) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      const touches = e.touches;

      if (touchMode === "pan" && touches.length === 1) {
        const dx = touches[0].clientX - startTouch1.x;
        const dy = touches[0].clientY - startTouch1.y;
        if (Math.hypot(dx, dy) > 3) {
          hasMoved = true;
        }
        setPosition({
          x: Math.round(startPos.x + dx),
          y: Math.round(startPos.y + dy),
        });
      } else if (touches.length >= 2) {
        hasMoved = true;
        const t1 = touches[0];
        const t2 = touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const currentMidpoint = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };

        if (startDist > 0) {
          const ratio = currentDist / startDist;
          const targetScale = Math.min(Math.max(startScale * ratio, 0.2), 25);
          const roundedScale = Math.round(targetScale * 100) / 100;
          setScale(roundedScale);

          // 计算缩放时的指尖焦点平移补偿，使两指中心点处的图像位置在缩放时保持不动
          const vpRect = viewport.getBoundingClientRect();
          const vpCenterX = vpRect.left + vpRect.width / 2;
          const vpCenterY = vpRect.top + vpRect.height / 2;

          const k = targetScale / startScale;
          const mX = startMidpoint.x - vpCenterX;
          const mY = startMidpoint.y - vpCenterY;
          const deltaMidX = currentMidpoint.x - startMidpoint.x;
          const deltaMidY = currentMidpoint.y - startMidpoint.y;

          const nextPosX = startPos.x * k + (1 - k) * mX + deltaMidX;
          const nextPosY = startPos.y * k + (1 - k) * mY + deltaMidY;

          setPosition({
            x: Math.round(nextPosX * 10) / 10,
            y: Math.round(nextPosY * 10) / 10,
          });
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest(".image-lightbox-top-bar")) {
        return;
      }
      const touches = e.touches;

      if (touches.length === 1) {
        // 双指松开变为单指：无缝衔接单指平移，重置单指拖拽基准点
        touchMode = "pan";
        startTouch1 = { x: touches[0].clientX, y: touches[0].clientY };
        startPos = { ...positionRef.current };
      } else if (touches.length === 0) {
        setIsDragging(false);
        const now = Date.now();

        // 若手指未显著滑动 (轻触交互)
        if (!hasMoved) {
          const target = e.target as HTMLElement | null;
          const isCard = target?.closest(".lightbox-content-card");

          if (now - lastTapTime < 300) {
            // 双碰卡片：复位或放大至 2.0 倍
            e.preventDefault();
            if (scaleRef.current !== 1 || positionRef.current.x !== 0 || positionRef.current.y !== 0) {
              handleReset();
            } else {
              setScale(2.0);
            }
            lastTapTime = 0;
          } else {
            lastTapTime = now;
            // 若轻触外部半透明背景区域且非双碰，延迟平稳关闭
            if (!isCard) {
              setTimeout(() => {
                if (Date.now() - lastTapTime >= 280 && lastTapTime !== 0) {
                  onClose();
                }
              }, 290);
            }
          }
        }
        touchMode = "none";
      }
    };

    viewport.addEventListener("touchstart", handleTouchStart, { passive: false });
    viewport.addEventListener("touchmove", handleTouchMove, { passive: false });
    viewport.addEventListener("touchend", handleTouchEnd, { passive: false });
    viewport.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    return () => {
      viewport.removeEventListener("touchstart", handleTouchStart);
      viewport.removeEventListener("touchmove", handleTouchMove);
      viewport.removeEventListener("touchend", handleTouchEnd);
      viewport.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [open, onClose, handleReset]);

  // 全局键盘快捷键监听 (Esc 关闭、+/- 缩放、0 复位)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleReset();
      } else if ((e.key === "=" || e.key === "+") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleZoomIn();
      } else if ((e.key === "-" || e.key === "_") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleZoomOut();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, handleReset, handleZoomIn, handleZoomOut]);

  // 鼠标拖拽平移事件绑定
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // 仅左键可拖拽
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // 双击图片：复位或放大至 1.8 倍
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale !== 1 || position.x !== 0 || position.y !== 0) {
      handleReset();
    } else {
      setScale(1.8);
    }
  };

  if (!open || (!imageSrc && !svgHtml)) return null;
  if (typeof document === "undefined") return null;

  const displayPercentage = Math.round(scale * 100);

  return createPortal(
    <div
      ref={viewportRef}
      className="image-lightbox-portal"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100dvh",
        backgroundColor: "rgba(0, 0, 0, 0.88)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2147483647,
        padding: 0,
        margin: 0,
        overflow: "hidden",
        userSelect: "none",
        WebkitUserSelect: "none",
        animation: "smartZoomEnter 0.25s cubic-bezier(0.1, 0.9, 0.2, 1)",
      }}
    >
      {/* 顶部悬浮控制栏 */}
      <div
        className="image-lightbox-top-bar"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: "20px",
          right: "24px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          zIndex: 2147483647,
          backgroundColor: "rgba(30, 30, 36, 0.72)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          padding: "6px 12px",
          borderRadius: "30px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.45)",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            color: "rgba(255, 255, 255, 0.85)",
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            minWidth: "46px",
            textAlign: "center",
            paddingRight: "4px",
          }}
        >
          {displayPercentage}%
        </span>

        <Tooltip content="放大 (Ctrl + 滚轮向上)" relationship="label">
          <Button
            appearance="subtle"
            size="small"
            icon={<Add20Regular style={{ color: "#ffffff" }} />}
            onClick={handleZoomIn}
            aria-label="放大"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              minWidth: "32px",
              padding: 0,
            }}
          />
        </Tooltip>

        <Tooltip content="缩小 (Ctrl + 滚轮向下)" relationship="label">
          <Button
            appearance="subtle"
            size="small"
            icon={<Subtract20Regular style={{ color: "#ffffff" }} />}
            onClick={handleZoomOut}
            aria-label="缩小"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              minWidth: "32px",
              padding: 0,
            }}
          />
        </Tooltip>

        <Tooltip content="复位比例与居中 (双击图片)" relationship="label">
          <Button
            appearance="subtle"
            size="small"
            icon={<ArrowReset20Regular style={{ color: "#ffffff" }} />}
            onClick={handleReset}
            aria-label="复位"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              minWidth: "32px",
              padding: 0,
            }}
          />
        </Tooltip>

        <div
          style={{
            width: "1px",
            height: "18px",
            backgroundColor: "rgba(255, 255, 255, 0.18)",
            margin: "0 2px",
          }}
        />

        <Tooltip content="关闭预览 (Esc)" relationship="label">
          <Button
            appearance="subtle"
            size="small"
            icon={<Dismiss20Regular style={{ color: "#ffffff" }} />}
            onClick={onClose}
            aria-label="关闭"
            style={{
              backgroundColor: "rgba(255, 60, 60, 0.35)",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              minWidth: "32px",
              padding: 0,
            }}
          />
        </Tooltip>
      </div>

      {/* 图片 / SVG 渲染交互视口 */}
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isDragging ? "grabbing" : "grab",
          overflow: "hidden",
        }}
        onMouseDown={handleMouseDown}
      >
        {svgHtml ? (
          <div
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={handleDoubleClick}
            className="lightbox-svg-wrapper lightbox-content-card"
            style={{
              maxWidth: "96vw",
              maxHeight: "92vh",
              overflow: "visible",
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.12s cubic-bezier(0.2, 0, 0.2, 1)",
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "32px 36px",
              boxShadow: "0 28px 80px rgba(0, 0, 0, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "auto",
              boxSizing: "border-box",
            }}
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        ) : (
          <div
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={handleDoubleClick}
            className="lightbox-img-card lightbox-content-card"
            style={{
              maxWidth: "96vw",
              maxHeight: "92vh",
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.12s cubic-bezier(0.2, 0, 0.2, 1)",
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "16px",
              boxShadow: "0 28px 80px rgba(0, 0, 0, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "auto",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <img
              src={imageSrc!}
              alt={imageAlt || "图片预览"}
              draggable={false}
              style={{
                maxWidth: "calc(96vw - 32px)",
                maxHeight: "calc(92vh - 32px)",
                width: "auto",
                height: "auto",
                objectFit: "contain",
                borderRadius: "8px",
                backgroundColor: "#ffffff",
                userSelect: "none",
                display: "block",
              }}
            />
          </div>
        )}
      </div>

      {/* 底部悬浮说明与操作指引栏 */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          bottom: "22px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          pointerEvents: "none",
          zIndex: 2147483647,
        }}
      >
        {imageAlt && imageAlt !== "图片" && imageAlt !== "随笔插图预览" && (
          <div
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              padding: "4px 16px",
              borderRadius: "16px",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 500,
              textAlign: "center",
              maxWidth: "min(85vw, 680px)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
            }}
          >
            {imageAlt}
          </div>
        )}
        <div
          style={{
            backgroundColor: "rgba(20, 20, 24, 0.65)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            padding: "4px 14px",
            borderRadius: "14px",
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "11.5px",
            fontWeight: 400,
            letterSpacing: "0.2px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          💡 双指/Ctrl滚轮缩放 · 拖拽平移 · 双击复位
        </div>
      </div>
    </div>,
    document.body
  );
};
