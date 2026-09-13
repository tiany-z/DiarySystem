import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Slider,
  Spinner,
  Tooltip,
} from "@fluentui/react-components";
import {
  ArrowReset20Regular,
  ArrowRotateClockwise20Regular,
  ArrowUpload20Regular,
  Checkmark20Regular,
  Delete20Regular,
  Dismiss20Regular,
  Image20Regular,
  ZoomIn20Regular,
  ZoomOut20Regular,
} from "@fluentui/react-icons";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import { userApi } from "../api/auth";
import { useAppDialogMotion } from "../utils/dialogMotion";

interface AvatarCropModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CANVAS_SIZE = 320;
const CROP_SIZE = 220;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x + r, y);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({ isOpen, onClose }) => {
  const { isDark } = useAppTheme();
  const { user, updateAvatar } = useAuth();
  const { surfaceMotion, backdropMotion, isMobile } = useAppDialogMotion();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewSquareRef = useRef<HTMLCanvasElement>(null);
  const previewCircle80Ref = useRef<HTMLCanvasElement>(null);
  const previewCircle40Ref = useRef<HTMLCanvasElement>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [minZoom, setMinZoom] = useState<number>(0.2);
  const [maxZoom] = useState<number>(3.5);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [editorMask, setEditorMask] = useState<"circle" | "square">("circle");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // 初始化重置状态
  const handleResetEditor = useCallback(() => {
    if (!imageObj) return;
    const initialFit = Math.max(
      CROP_SIZE / imageObj.naturalWidth,
      CROP_SIZE / imageObj.naturalHeight
    );
    const fitZoom = Math.max(initialFit, 0.2);
    setMinZoom(Math.max(fitZoom * 0.5, 0.1));
    setZoom(fitZoom);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }, [imageObj]);

  // 当外部传入关闭时清理
  useEffect(() => {
    if (!isOpen) {
      setImageSrc(null);
      setImageObj(null);
      setStatusMsg(null);
    }
  }, [isOpen]);

  // 加载图片对象
  useEffect(() => {
    if (!imageSrc) {
      setImageObj(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImageObj(img);
      const initialFit = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
      const fitZoom = Math.max(initialFit, 0.2);
      setMinZoom(Math.max(fitZoom * 0.5, 0.1));
      setZoom(fitZoom);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setStatusMsg(null);
    };
    img.onerror = () => {
      setStatusMsg({ type: "error", text: "图片加载失败，请重试或更换图片" });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // 文件选择处理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusMsg({ type: "error", text: "请选择有效的图片文件 (JPG/PNG/WebP/GIF)" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatusMsg({ type: "error", text: "图片大小不能超过 10MB" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // 拖拽放置文件
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusMsg({ type: "error", text: "请选择有效的图片文件 (JPG/PNG/WebP/GIF)" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // 绘制主裁剪画布与三路实时预览
  const renderAllCanvases = useCallback(() => {
    if (!imageObj) return;

    const mainCanvas = mainCanvasRef.current;
    if (mainCanvas) {
      const ctx = mainCanvas.getContext("2d");
      if (ctx) {
        ctx.save();
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // 1. 绘制底层变换图片
        ctx.save();
        ctx.translate(CANVAS_SIZE / 2 + pan.x, CANVAS_SIZE / 2 + pan.y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);
        ctx.drawImage(imageObj, -imageObj.naturalWidth / 2, -imageObj.naturalHeight / 2);
        ctx.restore();

        // 2. 绘制暗色蒙版
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.beginPath();
        ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        const cropLeft = (CANVAS_SIZE - CROP_SIZE) / 2;
        const cropTop = (CANVAS_SIZE - CROP_SIZE) / 2;

        if (editorMask === "circle") {
          ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2, true);
        } else {
          drawRoundedRect(ctx, cropLeft, cropTop, CROP_SIZE, CROP_SIZE, 14);
        }
        ctx.closePath();
        ctx.fill("evenodd");

        // 3. 绘制裁剪框高亮边界
        ctx.strokeStyle = "#5B7B8D";
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (editorMask === "circle") {
          ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
        } else {
          drawRoundedRect(ctx, cropLeft, cropTop, CROP_SIZE, CROP_SIZE, 14);
        }
        ctx.stroke();

        // 4. 辅助九宫格线（淡色点线）
        ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cropLeft + CROP_SIZE / 3, cropTop);
        ctx.lineTo(cropLeft + CROP_SIZE / 3, cropTop + CROP_SIZE);
        ctx.moveTo(cropLeft + (CROP_SIZE * 2) / 3, cropTop);
        ctx.lineTo(cropLeft + (CROP_SIZE * 2) / 3, cropTop + CROP_SIZE);

        ctx.moveTo(cropLeft, cropTop + CROP_SIZE / 3);
        ctx.lineTo(cropLeft + CROP_SIZE, cropTop + CROP_SIZE / 3);
        ctx.moveTo(cropLeft, cropTop + (CROP_SIZE * 2) / 3);
        ctx.lineTo(cropLeft + CROP_SIZE, cropTop + (CROP_SIZE * 2) / 3);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    // 辅助预览绘制器
    const drawToPreview = (previewCanvas: HTMLCanvasElement | null, targetSize: number) => {
      if (!previewCanvas) return;
      const pCtx = previewCanvas.getContext("2d");
      if (!pCtx) return;

      pCtx.save();
      pCtx.clearRect(0, 0, targetSize, targetSize);

      const ratio = targetSize / CROP_SIZE;
      const center = targetSize / 2;

      pCtx.translate(center + pan.x * ratio, center + pan.y * ratio);
      pCtx.rotate((rotation * Math.PI) / 180);
      pCtx.scale(zoom * ratio, zoom * ratio);
      pCtx.drawImage(imageObj, -imageObj.naturalWidth / 2, -imageObj.naturalHeight / 2);
      pCtx.restore();
    };

    // 绘制正方形预览 (80x80)
    drawToPreview(previewSquareRef.current, 80);

    // 绘制圆形预览 (80x80 & 40x40)
    drawToPreview(previewCircle80Ref.current, 80);
    drawToPreview(previewCircle40Ref.current, 40);
  }, [imageObj, zoom, rotation, pan, editorMask]);

  useEffect(() => {
    renderAllCanvases();
  }, [renderAllCanvases]);

  // 鼠标拖拽平移事件
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 滚轮缩放事件
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => {
      const next = Math.min(Math.max(minZoom, prev + delta), maxZoom);
      return Number(next.toFixed(3));
    });
  };

  // 旋转 90 度
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // 保存头像
  const handleSaveAvatar = async () => {
    if (!imageObj) return;

    try {
      setIsSubmitting(true);
      setStatusMsg(null);

      // 导出高质量 256x256 图像
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = 256;
      exportCanvas.height = 256;
      const expCtx = exportCanvas.getContext("2d");
      if (!expCtx) throw new Error("无法创建导出画布");

      const scaleRatio = 256 / CROP_SIZE;
      expCtx.translate(128 + pan.x * scaleRatio, 128 + pan.y * scaleRatio);
      expCtx.rotate((rotation * Math.PI) / 180);
      expCtx.scale(zoom * scaleRatio, zoom * scaleRatio);
      expCtx.drawImage(imageObj, -imageObj.naturalWidth / 2, -imageObj.naturalHeight / 2);

      const dataUrl = exportCanvas.toDataURL("image/png", 0.95);

      const res = await userApi.updateAvatar(dataUrl);
      if (res.status === 1 && res.data) {
        updateAvatar(res.data.avatar);
        setStatusMsg({ type: "success", text: "头像更新成功！" });
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setStatusMsg({ type: "error", text: res.content || "更新头像失败，请稍后重试" });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `保存失败: ${err.message || String(err)}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 恢复默认头像
  const handleRemoveAvatar = async () => {
    if (!window.confirm("确定要恢复默认头像（使用用户名首字母头像）吗？")) return;
    try {
      setIsSubmitting(true);
      const res = await userApi.updateAvatar(null);
      if (res.status === 1) {
        updateAvatar(null);
        setStatusMsg({ type: "success", text: "已恢复默认头像" });
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        setStatusMsg({ type: "error", text: res.content || "恢复默认头像失败" });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: String(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(_, data) => !data.open && onClose()}
      surfaceMotion={surfaceMotion}
    >
      <DialogSurface
        backdropMotion={backdropMotion}
        backdrop={{
          style: {
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
          },
        }}
        style={{
          position: isMobile ? "fixed" : undefined,
          inset: isMobile ? 0 : undefined,
          top: isMobile ? 0 : undefined,
          left: isMobile ? 0 : undefined,
          right: isMobile ? 0 : undefined,
          bottom: isMobile ? 0 : undefined,
          margin: isMobile ? 0 : undefined,
          zIndex: isMobile ? 2000 : undefined,
          maxWidth: isMobile ? "100vw" : "680px",
          minWidth: isMobile ? "100vw" : undefined,
          width: isMobile ? "100vw" : "92vw",
          maxHeight: isMobile ? "100dvh" : "88vh",
          height: isMobile ? "100dvh" : undefined,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: isMobile ? 0 : "16px",
          padding: isMobile ? "max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom)) 16px" : "24px",
          backgroundColor: isDark ? "#1c1c23" : "#ffffff",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          border: isMobile ? "none" : (isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)"),
          boxShadow: isMobile
            ? "none"
            : (isDark
              ? "0 20px 48px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08)"
              : "0 20px 48px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.06)"),
        }}
      >
        <DialogBody style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden", width: "100%" }}>
          {/* Header - 固定顶部 */}
          <header className="dialog-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "16px", flexShrink: 0 }}>
            <div className="dialog-header-title" style={{ flex: 1, minWidth: 0 }}>
              <DialogTitle style={{ padding: 0, margin: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #5B7B8D, #8EAEC0)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                    }}
                  >
                    <Image20Regular />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: "16px" }}>自定义用户头像</span>
                </div>
              </DialogTitle>
            </div>
            <Tooltip content="关闭" relationship="label">
              <Button
                className="dialog-close-btn"
                appearance="subtle"
                icon={<Dismiss20Regular />}
                onClick={onClose}
                aria-label="关闭"
                style={{ marginLeft: "auto", flexShrink: 0 }}
              />
            </Tooltip>
          </header>

          <DialogContent style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", marginTop: "4px", padding: 0 }}>
            {/* 隐藏的本地文件输入框 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {/* 提示消息 */}
            {statusMsg && (
              <div
                style={{
                  marginBottom: "14px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor:
                    statusMsg.type === "success"
                      ? isDark
                        ? "rgba(16, 124, 65, 0.25)"
                        : "rgba(16, 124, 65, 0.1)"
                      : isDark
                      ? "rgba(196, 43, 28, 0.25)"
                      : "rgba(196, 43, 28, 0.1)",
                  color: statusMsg.type === "success" ? "#107c41" : "#c42b1c",
                  border:
                    statusMsg.type === "success"
                      ? "1px solid rgba(16, 124, 65, 0.3)"
                      : "1px solid rgba(196, 43, 28, 0.3)",
                }}
              >
                {statusMsg.type === "success" ? <Checkmark20Regular /> : null}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {!imageSrc ? (
              /* 未选择图片时的拖拽上传区 */
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: isDark ? "2px dashed rgba(255, 255, 255, 0.18)" : "2px dashed rgba(91, 123, 141, 0.35)",
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(91, 123, 141, 0.04)",
                  borderRadius: "14px",
                  padding: "48px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: isDark ? "rgba(91, 123, 141, 0.25)" : "rgba(91, 123, 141, 0.12)",
                    color: "#5B7B8D",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                  }}
                >
                  <ArrowUpload20Regular style={{ fontSize: "28px" }} />
                </div>
                <div style={{ fontWeight: 600, fontSize: "15px" }}>点击或拖拽图片到此处上传</div>
                <div style={{ fontSize: "12px", opacity: 0.65 }}>
                  支持 JPG, PNG, WebP, GIF 格式，单张图片不超过 10MB
                </div>
                <Button appearance="primary" style={{ marginTop: "8px", borderRadius: "8px" }}>
                  选择本地文件
                </Button>
              </div>
            ) : (
              /* 已选图片时的裁剪与实时双遮罩预览区 */
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "24px",
                  justifyContent: "center",
                  alignItems: "flex-start",
                }}
              >
                {/* 左侧：主裁剪画布与控制栏 */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
                  <div
                    style={{
                      position: "relative",
                      width: `${CANVAS_SIZE}px`,
                      height: `${CANVAS_SIZE}px`,
                      borderRadius: "14px",
                      overflow: "hidden",
                      border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.1)",
                      boxShadow: "0 6px 18px rgba(0, 0, 0, 0.15)",
                      cursor: isDragging ? "grabbing" : "grab",
                      backgroundColor: "#1e1e1e",
                      userSelect: "none",
                    }}
                  >
                    <canvas
                      ref={mainCanvasRef}
                      width={CANVAS_SIZE}
                      height={CANVAS_SIZE}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onWheel={handleWheel}
                      style={{ display: "block" }}
                    />

                    {/* 遮罩类型切换角标 (正方形 / 圆形) */}
                    <div
                      style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                        display: "flex",
                        gap: "4px",
                        backgroundColor: "rgba(0, 0, 0, 0.65)",
                        padding: "3px 4px",
                        borderRadius: "8px",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setEditorMask("circle")}
                        style={{
                          border: "none",
                          borderRadius: "6px",
                          padding: "3px 8px",
                          fontSize: "11px",
                          fontWeight: editorMask === "circle" ? 600 : 400,
                          backgroundColor: editorMask === "circle" ? "#5B7B8D" : "transparent",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        圆形框
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorMask("square")}
                        style={{
                          border: "none",
                          borderRadius: "6px",
                          padding: "3px 8px",
                          fontSize: "11px",
                          fontWeight: editorMask === "square" ? 600 : 400,
                          backgroundColor: editorMask === "square" ? "#5B7B8D" : "transparent",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        正方形框
                      </button>
                    </div>

                    {/* 操作提示小浮层 */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "8px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "rgba(0, 0, 0, 0.65)",
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "11px",
                        padding: "2px 10px",
                        borderRadius: "12px",
                        pointerEvents: "none",
                        backdropFilter: "blur(6px)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      拖拽移动位置 · 滚轮缩放
                    </div>
                  </div>

                  {/* 缩放滑块与微调按钮 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      width: "100%",
                      maxWidth: `${CANVAS_SIZE}px`,
                      padding: "0 4px",
                    }}
                  >
                    <Tooltip content="缩小" relationship="label">
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<ZoomOut20Regular />}
                        onClick={() => setZoom((z) => Math.max(minZoom, Number((z - 0.1).toFixed(2))))}
                      />
                    </Tooltip>
                    <Slider
                      min={minZoom}
                      max={maxZoom}
                      step={0.01}
                      value={zoom}
                      onChange={(_, data) => setZoom(data.value)}
                      style={{ flex: 1 }}
                    />
                    <Tooltip content="放大" relationship="label">
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<ZoomIn20Regular />}
                        onClick={() => setZoom((z) => Math.min(maxZoom, Number((z + 0.1).toFixed(2))))}
                      />
                    </Tooltip>
                  </div>

                  {/* 工具条：旋转、重置、重新选图 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      justifyContent: "center",
                      width: "100%",
                    }}
                  >
                    <Button
                      appearance="secondary"
                      size="small"
                      icon={<ArrowRotateClockwise20Regular />}
                      onClick={handleRotate}
                      style={{ borderRadius: "8px" }}
                    >
                      顺时针 90°
                    </Button>
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<ArrowReset20Regular />}
                      onClick={handleResetEditor}
                      style={{ borderRadius: "8px" }}
                    >
                      复位
                    </Button>
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<ArrowUpload20Regular />}
                      onClick={() => fileInputRef.current?.click()}
                      style={{ borderRadius: "8px" }}
                    >
                      更换图片
                    </Button>
                  </div>
                </div>

                {/* 右侧：双遮罩实时预览栏（正方形与圆形双向预览） */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "18px",
                    minWidth: "220px",
                    padding: "16px 20px",
                    borderRadius: "14px",
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                    border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontWeight: 600, fontSize: "14px" }}>实时裁剪预览</span>
                    <Badge size="small" appearance="tint" color="brand">
                      双遮罩
                    </Badge>
                  </div>

                  {/* 1. 正方形遮罩预览 (80x80) */}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <canvas
                      ref={previewSquareRef}
                      width={80}
                      height={80}
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "14px",
                        border: "2px solid #5B7B8D",
                        boxShadow: "0 4px 14px rgba(91, 123, 141, 0.28)",
                        backgroundColor: isDark ? "#202020" : "#f5f5f5",
                        display: "block",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontWeight: 600, fontSize: "13px" }}>正方形遮罩</span>
                      <span style={{ fontSize: "11px", opacity: 0.6 }}>圆角 14px · 80×80</span>
                      <span style={{ fontSize: "11px", opacity: 0.5 }}>卡片/列表展示</span>
                    </div>
                  </div>

                  {/* 2. 圆形遮罩预览 (80x80 与 40x40) */}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <canvas
                      ref={previewCircle80Ref}
                      width={80}
                      height={80}
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        border: "2px solid #5B7B8D",
                        boxShadow: "0 4px 14px rgba(91, 123, 141, 0.28)",
                        backgroundColor: isDark ? "#202020" : "#f5f5f5",
                        display: "block",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontWeight: 600, fontSize: "13px" }}>圆形遮罩</span>
                      <span style={{ fontSize: "11px", opacity: 0.6 }}>直径 80px</span>
                      <span style={{ fontSize: "11px", opacity: 0.5 }}>个人主页标准</span>
                    </div>
                  </div>

                  {/* 3. 导航栏微缩圆形预览 (40x40) */}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <canvas
                      ref={previewCircle40Ref}
                      width={40}
                      height={40}
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        border: "1.5px solid rgba(91, 123, 141, 0.7)",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                        backgroundColor: isDark ? "#202020" : "#f5f5f5",
                        display: "block",
                        flexShrink: 0,
                        marginLeft: "20px",
                      }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontWeight: 500, fontSize: "12px" }}>小尺寸微览</span>
                      <span style={{ fontSize: "11px", opacity: 0.6 }}>40×40 · 导航栏</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>

          {/* Actions - 固定底部 */}
          <footer className="dialog-footer-row" style={{ flexShrink: 0, width: "100%" }}>
            <DialogActions style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                {user?.avatar && (
                  <Button
                    appearance="subtle"
                    icon={<Delete20Regular />}
                    onClick={handleRemoveAvatar}
                    disabled={isSubmitting}
                    style={{ color: "#c42b1c", borderRadius: "8px" }}
                  >
                    恢复默认头像
                  </Button>
                )}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <Button appearance="secondary" onClick={onClose} disabled={isSubmitting} style={{ borderRadius: "8px" }}>
                  取消
                </Button>
                <Button
                  appearance="primary"
                  onClick={handleSaveAvatar}
                  disabled={!imageSrc || isSubmitting}
                  icon={isSubmitting ? <Spinner size="tiny" /> : undefined}
                  style={{
                    backgroundColor: "#5B7B8D",
                    borderRadius: "8px",
                    fontWeight: 600,
                    boxShadow: "0 2px 8px rgba(91, 123, 141, 0.35)",
                  }}
                >
                  {isSubmitting ? "正在保存..." : "保存头像"}
                </Button>
              </div>
            </DialogActions>
          </footer>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default AvatarCropModal;
