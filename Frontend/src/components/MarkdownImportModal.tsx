import React, { useRef, useState } from "react";
import {
  Badge,
  Button,
  Caption1,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Input,
  ProgressBar,
  Select,
  Spinner,
  Subtitle2,
  Title3,
  Tooltip,
} from "@fluentui/react-components";
import {
  Add20Regular,
  ArrowUpload20Regular,
  CheckmarkCircle20Filled,
  Delete20Regular,
  Dismiss20Regular,
  DocumentArrowUp20Regular,
  Sparkle20Regular,
} from "@fluentui/react-icons";
import { diaryApi } from "../api/diary";
import { useAppTheme } from "../context/ThemeContext";

export interface ParsedMarkdownItem {
  id: string;
  file: File;
  title: string;
  hasHeadingTitle: boolean;
  headingLevel?: number;
  bodyContent: string;
  fullContent: string;
  charCount: number;
  status: "pending" | "uploading" | "success" | "error";
  errorMsg?: string;
}

interface MarkdownImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportSuccess: (importedCount: number) => void;
  initialFiles?: File[];
}

/**
 * 解析单个 Markdown 文本的首行 H 标题与正文
 */
export function parseMarkdownFile(file: File, text: string): ParsedMarkdownItem {
  const lines = text.split(/\r?\n/);
  let firstNonEmptyIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().length > 0) {
      firstNonEmptyIdx = i;
      break;
    }
  }

  let title = "";
  let hasHeadingTitle = false;
  let headingLevel: number | undefined = undefined;
  let bodyStartIndex = 0;

  if (firstNonEmptyIdx !== -1) {
    const firstLine = lines[firstNonEmptyIdx].trim();

    // 1. 标准 ATX 标题 (# 标题, ## 标题 ... ###### 标题)
    const atxMatch = firstLine.match(/^(#{1,6})\s+(.+)$/);
    if (atxMatch) {
      headingLevel = atxMatch[1].length;
      title = atxMatch[2].trim();
      hasHeadingTitle = true;
      bodyStartIndex = firstNonEmptyIdx + 1;
    } else {
      // 2. HTML 标题 (<h1>标题</h1> ... <h6>标题</h6>)
      const htmlMatch = firstLine.match(/^<h([1-6])[^>]*>(.*?)<\/h\1>/i);
      if (htmlMatch) {
        headingLevel = parseInt(htmlMatch[1], 10);
        title = htmlMatch[2].replace(/<[^>]+>/g, "").trim();
        hasHeadingTitle = true;
        bodyStartIndex = firstNonEmptyIdx + 1;
      } else {
        // 3. Setext 标题 (第二行为 === 或 ---)
        if (firstNonEmptyIdx + 1 < lines.length) {
          const secondLine = lines[firstNonEmptyIdx + 1].trim();
          if (/^=+$/.test(secondLine)) {
            headingLevel = 1;
            title = firstLine;
            hasHeadingTitle = true;
            bodyStartIndex = firstNonEmptyIdx + 2;
          } else if (/^-+$/.test(secondLine) && !/^---\s*$/.test(firstLine)) {
            headingLevel = 2;
            title = firstLine;
            hasHeadingTitle = true;
            bodyStartIndex = firstNonEmptyIdx + 2;
          }
        }
      }
    }
  }

  // 清洗标题中的粗体、斜体、删除线等 Markdown 行内装饰符号
  if (title) {
    title = title
      .replace(/^(\*\*|\*|__|_|~~|`)+/, "")
      .replace(/(\*\*|\*|__|_|~~|`)+$/, "")
      .trim();
  }

  // 若首行不是 H 标题，采用文件名（去除 .md 等后缀）作为兜底标题
  if (!title) {
    title = file.name.replace(/\.(md|markdown|txt)$/i, "").trim() || "未命名笔记";
    bodyStartIndex = 0;
  }

  // 截取剩余正文内容 (若首行即为唯一内容，则保留以免出现空白)
  const bodyContent = bodyStartIndex < lines.length
    ? lines.slice(bodyStartIndex).join("\n").trim()
    : text.trim();

  const charCount = text.replace(/\s+/g, "").length;

  return {
    id: `${file.name}-${file.size}-${Math.random().toString(36).substring(2, 7)}`,
    file,
    title,
    hasHeadingTitle,
    headingLevel,
    bodyContent,
    fullContent: text,
    charCount,
    status: "pending",
  };
}

export const MarkdownImportModal: React.FC<MarkdownImportModalProps> = ({
  open,
  onClose,
  onImportSuccess,
  initialFiles,
}) => {
  const { isDark } = useAppTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [items, setItems] = useState<ParsedMarkdownItem[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [progressIndex, setProgressIndex] = useState<number>(0);
  const [stripLeadingHeading, setStripLeadingHeading] = useState<boolean>(true);
  const [defaultWeather, setDefaultWeather] = useState<string>("Sunny");
  const [defaultMood, setDefaultMood] = useState<string>("Happy");
  const [defaultIsPublic, setDefaultIsPublic] = useState<boolean>(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // 处理文件读取与标题自动解析
  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) =>
      /\.(md|markdown|txt)$/i.test(f.name) || f.type.includes("markdown") || f.type.includes("text")
    );
    if (files.length === 0) return;

    setIsReadingFiles(true);
    const newItems: ParsedMarkdownItem[] = [];

    for (const file of files) {
      try {
        const text = await file.text();
        const parsed = parseMarkdownFile(file, text);
        newItems.push(parsed);
      } catch (err) {
        console.error("读取文件异常:", file.name, err);
      }
    }

    setItems((prev) => [...prev, ...newItems]);
    setIsReadingFiles(false);
  };

  // 初始加载传入的文件列表 (如有)
  React.useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      processFiles(initialFiles);
    }
  }, [initialFiles]);

  // 拖拽上传支持
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  // 修改特定项的标题
  const handleUpdateTitle = (id: string, newTitle: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title: newTitle } : item))
    );
  };

  // 移除特定项
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // 清空待导入列表
  const handleClearAll = () => {
    setItems([]);
    setImportNotice(null);
  };

  // 执行批量导入日记
  const handleStartImport = async () => {
    if (items.length === 0 || isImporting) return;

    setIsImporting(true);
    setProgressIndex(0);
    setImportNotice(null);

    let successCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setProgressIndex(i + 1);

      // 更新为上传中状态
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: "uploading" } : it))
      );

      const contentToSave = stripLeadingHeading && item.hasHeadingTitle
        ? item.bodyContent || item.fullContent
        : item.fullContent;

      try {
        const res = await diaryApi.create({
          title: item.title.trim() || "未命名笔记",
          content: contentToSave,
          weather: defaultWeather,
          mood: defaultMood,
          is_public: defaultIsPublic ? 1 : 0,
        });

        if (res.status === 1) {
          successCount++;
          setItems((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, status: "success" } : it))
          );
        } else {
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? { ...it, status: "error", errorMsg: res.content || "创建失败" }
                : it
            )
          );
        }
      } catch (err: any) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: "error", errorMsg: err.message || "网络异常" }
              : it
          )
        );
      }
    }

    setIsImporting(false);
    setImportNotice(`🎉 成功导入 ${successCount} 篇 Markdown 日记！`);
    onImportSuccess(successCount);

    if (successCount === items.length) {
      setTimeout(() => {
        handleModalClose();
      }, 1500);
    }
  };

  // 关闭并重置弹窗
  const handleModalClose = () => {
    if (isImporting) return;
    onClose();
    setTimeout(() => {
      setItems([]);
      setImportNotice(null);
      setProgressIndex(0);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && handleModalClose()}>
      <DialogSurface
        backdrop={{
          style: {
            backdropFilter: "blur(14px) saturate(135%)",
            WebkitBackdropFilter: "blur(14px) saturate(135%)",
            backgroundColor: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(15, 23, 42, 0.45)",
          },
        }}
        style={{
          maxWidth: "800px",
          width: "92vw",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "18px",
          padding: "24px 28px",
          backgroundColor: isDark ? "rgba(28, 28, 35, 0.95)" : "rgba(255, 255, 255, 0.97)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: isDark
            ? "0 28px 72px rgba(0, 0, 0, 0.65), 0 6px 24px rgba(0, 0, 0, 0.4)"
            : "0 24px 64px rgba(0, 0, 0, 0.2), 0 4px 18px rgba(0, 120, 212, 0.08)",
        }}
      >
        <DialogBody style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #0078d4, #60a5fa)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(0, 120, 212, 0.25)",
                }}
              >
                <DocumentArrowUp20Regular />
              </div>
              <div>
                <DialogTitle style={{ margin: 0, padding: 0 }}>
                  <Title3 style={{ fontWeight: 700, fontSize: "18px" }}>批量导入 Markdown 日记</Title3>
                </DialogTitle>
                <Caption1 style={{ opacity: 0.65 }}>
                  一次选择多个 .md 文件，首行 H 标题自动解析为日记标题
                </Caption1>
              </div>
            </div>

            <Tooltip content="关闭" relationship="label">
              <Button
                appearance="subtle"
                icon={<Dismiss20Regular />}
                onClick={handleModalClose}
                disabled={isImporting}
                aria-label="关闭"
              />
            </Tooltip>
          </div>

          <DialogContent
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              margin: 0,
              padding: "4px 2px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* 隐藏原生多文件选择 input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".md,.markdown,text/markdown,text/plain"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files) {
                  processFiles(e.target.files);
                  e.target.value = "";
                }
              }}
            />

            {/* 文件选择 / 拖拽区域 */}
            {items.length === 0 ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed rgba(0, 120, 212, 0.35)",
                  borderRadius: "14px",
                  padding: "40px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 120, 212, 0.02)",
                  transition: "all 0.2s ease",
                }}
              >
                <ArrowUpload20Regular style={{ fontSize: "40px", color: "#0078d4", marginBottom: "12px" }} />
                <Subtitle2 style={{ fontWeight: 700, display: "block", marginBottom: "6px" }}>
                  点击选择或将 Markdown 文件拖拽至此处
                </Subtitle2>
                <Caption1 style={{ opacity: 0.65, display: "block" }}>
                  支持按住 Ctrl / Shift 一次选择多个 .md 文件，将自动解析第一行 H 标题
                </Caption1>
                <Button
                  appearance="primary"
                  icon={<Add20Regular />}
                  style={{ marginTop: "16px", borderRadius: "8px" }}
                >
                  浏览本地 Markdown 文件
                </Button>
              </div>
            ) : (
              <>
                {/* 顶部工具栏: 默认属性与设置 */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "12px",
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Caption1 style={{ fontWeight: 600 }}>默认天气:</Caption1>
                      <Select
                        size="small"
                        value={defaultWeather}
                        onChange={(_, data) => setDefaultWeather(data.value)}
                        style={{ minWidth: "90px" }}
                      >
                        <option value="Sunny">晴朗 ☀️</option>
                        <option value="Cloudy">多云 ⛅</option>
                        <option value="Rainy">微雨 🌧️</option>
                        <option value="Snowy">雪落 ❄️</option>
                        <option value="Windy">清风 🍃</option>
                      </Select>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Caption1 style={{ fontWeight: 600 }}>默认心情:</Caption1>
                      <Select
                        size="small"
                        value={defaultMood}
                        onChange={(_, data) => setDefaultMood(data.value)}
                        style={{ minWidth: "90px" }}
                      >
                        <option value="Happy">欢喜 ✨</option>
                        <option value="Peaceful">宁静 🌿</option>
                        <option value="Excited">充沛 🔥</option>
                        <option value="Thinking">沉思 💡</option>
                        <option value="Tired">倦怠 🌙</option>
                      </Select>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Caption1 style={{ fontWeight: 600 }}>可见性:</Caption1>
                      <Select
                        size="small"
                        value={defaultIsPublic ? "public" : "private"}
                        onChange={(_, data) => setDefaultIsPublic(data.value === "public")}
                        style={{ minWidth: "90px" }}
                      >
                        <option value="private">仅自己可见 (私密)</option>
                        <option value="public">发布至公共广场 (公开)</option>
                      </Select>
                    </div>
                  </div>

                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<Add20Regular />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    添加更多文件
                  </Button>
                </div>

                {/* 选项: 正文是否剥离首行已提取的 H 标题 */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Checkbox
                    checked={stripLeadingHeading}
                    onChange={(_, data) => setStripLeadingHeading(!!data.checked)}
                    label="正文中自动去除已作为日记标题的首行 H 标题（避免正文开头重复大标题）"
                    disabled={isImporting}
                  />
                  <Caption1 style={{ opacity: 0.65 }}>共 {items.length} 篇待导入</Caption1>
                </div>

                {/* 进度条 (导入中展示) */}
                {isImporting && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Caption1 style={{ fontWeight: 600 }}>
                        正在批量导入日记... ({progressIndex} / {items.length})
                      </Caption1>
                      <Caption1 style={{ color: "#0078d4", fontWeight: 600 }}>
                        {Math.round((progressIndex / items.length) * 100)}%
                      </Caption1>
                    </div>
                    <ProgressBar value={progressIndex / items.length} color="brand" />
                  </div>
                )}

                {/* 成功提示条 */}
                {importNotice && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(16, 124, 65, 0.12)",
                      border: "1px solid rgba(16, 124, 65, 0.25)",
                      color: "#107c41",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    <CheckmarkCircle20Filled />
                    <span>{importNotice}</span>
                  </div>
                )}

                {/* 解析后的文件列表 */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    maxHeight: "360px",
                    overflowY: "auto",
                    paddingRight: "4px",
                  }}
                >
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "10px",
                        backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                        border: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.06)",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span style={{ fontSize: "12px", opacity: 0.5, width: "22px", textAlign: "right" }}>
                        #{idx + 1}
                      </span>

                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Input
                            size="small"
                            value={item.title}
                            onChange={(_, data) => handleUpdateTitle(item.id, data.value)}
                            disabled={isImporting}
                            placeholder="日记标题"
                            style={{ flex: 1, fontWeight: 600 }}
                          />
                          {item.hasHeadingTitle ? (
                            <Badge appearance="tint" color="brand" size="small">
                              H{item.headingLevel || 1} 标题
                            </Badge>
                          ) : (
                            <Badge appearance="tint" color="subtle" size="small">
                              文件名
                            </Badge>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.6, fontSize: "11px" }}>
                          <span>文件: {item.file.name}</span>
                          <span>·</span>
                          <span>约 {item.charCount} 字符</span>
                          {item.status === "uploading" && (
                            <span style={{ color: "#0078d4", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Spinner size="tiny" /> 导入中...
                            </span>
                          )}
                          {item.status === "success" && (
                            <span style={{ color: "#107c41", fontWeight: 600 }}>✅ 导入成功</span>
                          )}
                          {item.status === "error" && (
                            <span style={{ color: "#d13438", fontWeight: 600 }}>❌ {item.errorMsg || "失败"}</span>
                          )}
                        </div>
                      </div>

                      <Tooltip content="从本次导入中移除" relationship="label">
                        <Button
                          appearance="subtle"
                          size="small"
                          icon={<Delete20Regular />}
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isImporting}
                          aria-label="移除文件"
                        />
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </>
            )}
          </DialogContent>

          {/* Footer Actions */}
          <DialogActions style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", width: "100%" }}>
            <div>
              {items.length > 0 && !isImporting && (
                <Button appearance="subtle" onClick={handleClearAll}>
                  清空列表
                </Button>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <Button appearance="secondary" onClick={handleModalClose} disabled={isImporting}>
                {importNotice ? "完成" : "取消"}
              </Button>
              <Button
                appearance="primary"
                icon={isImporting ? <Spinner size="tiny" /> : <Sparkle20Regular />}
                onClick={handleStartImport}
                disabled={items.length === 0 || isImporting || isReadingFiles}
                style={{
                  background: "linear-gradient(135deg, #0078d4, #005a9e)",
                  fontWeight: 600,
                  borderRadius: "8px",
                }}
              >
                {isImporting
                  ? `正在导入 (${progressIndex}/${items.length})...`
                  : `开始导入 (${items.length} 篇)`}
              </Button>
            </div>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
