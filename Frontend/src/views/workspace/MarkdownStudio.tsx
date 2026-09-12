import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Divider,
  Field,
  Input,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarBody,
  Spinner,
  SpinButton,
  Text,
  Title3,
  Tooltip,
} from "@fluentui/react-components";
import {
  ArrowLeft20Regular,
  CheckmarkCircle20Regular,
  Code20Regular,
  Copy20Regular,
  Dismiss20Regular,
  DividerShort20Regular,
  Document20Regular,
  DocumentEdit20Regular,
  Eye20Regular,
  Folder20Regular,
  Globe20Regular,
  History20Regular,
  Image20Regular,
  Lightbulb20Regular,
  Link20Regular,
  LockClosed20Regular,
  MoreHorizontal20Regular,
  PanelLeft20Regular,
  Save20Regular,
  Table20Regular,
  TextAlignLeft20Regular,
  TextBold20Regular,
  TextBulletList20Regular,
  TextHeader120Regular,
  TextHeader220Regular,
  TextHeader320Regular,
  TextItalic20Regular,
  TextNumberListLtr20Regular,
  TextQuote20Regular,
  TextStrikethrough20Regular,
  TextUnderline20Regular,
  Warning20Regular,
} from "@fluentui/react-icons";
import { diaryApi } from "../../api/diary";
import { uploadApi } from "../../api/upload";
import { MarkdownViewer } from "../../components/MarkdownViewer";
import { MoodPicker } from "../../components/MoodBadge";
import { WeatherPicker } from "../../components/WeatherBadge";
import { useAppTheme } from "../../context/ThemeContext";
import { htmlToMarkdown, markdownToHtml } from "../../utils/markdownUtils";

export const MarkdownStudio: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const { isDark } = useAppTheme();
  const location = useLocation();

  // 文档核心状态
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [weather, setWeather] = useState<string>("Sunny");
  const [mood, setMood] = useState<string>("Happy");
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [createdAt, setCreatedAt] = useState<string>("");

  // 系统状态
  const [isLoading, setIsLoading] = useState<boolean>(!isNew);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 文档视图模式: "wysiwyg" (所见即所得文档画布 - 推荐默认), "sheet" (即时排版稿纸模式), "preview" (纯享演示阅读)
  const [editorMode, setEditorMode] = useState<"wysiwyg" | "sheet" | "preview">("wysiwyg");

  // 源码抽屉/弹窗状态
  const [sourceModalOpen, setSourceModalOpen] = useState<boolean>(false);
  const [rawSourceBuffer, setRawSourceBuffer] = useState<string>("");

  // 表格插入弹窗
  const [tableModalOpen, setTableModalOpen] = useState<boolean>(false);
  const [tableRows, setTableRows] = useState<number>(3);
  const [tableCols, setTableCols] = useState<number>(3);

  // 未保存提示弹窗 (居中 Fluent 2 模态对话框，替代顶部浏览器原生弹窗)
  const [showUnsavedModal, setShowUnsavedModal] = useState<boolean>(false);
  const [pendingNavPath, setPendingNavPath] = useState<string>("/workspace");
  const [unsavedModalError, setUnsavedModalError] = useState<string | null>(null);

  // 注册全局未保存拦截器，无缝拦截顶栏导航与退出行为
  useEffect(() => {
    if (isDirty) {
      window.__checkUnsavedBeforeNavigate = (targetPath: string) => {
        setPendingNavPath(targetPath);
        setUnsavedModalError(null);
        setShowUnsavedModal(true);
        return false;
      };
    } else {
      window.__checkUnsavedBeforeNavigate = null;
    }
    return () => {
      window.__checkUnsavedBeforeNavigate = null;
    };
  }, [isDirty]);

  // DOM 引用
  const wysiwygRef = useRef<HTMLDivElement>(null);
  const sheetTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const justSavedIdRef = useRef<string | null>(null);

  // 图片上传与尺寸调节状态
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [uploadSuccessNotice, setUploadSuccessNotice] = useState<boolean>(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [imgOverlayPos, setImgOverlayPos] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [isResizingImg, setIsResizingImg] = useState<boolean>(false);
  const [resizingSizeText, setResizingSizeText] = useState<string>("");

  // 页面离开未保存确认
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // 保证在文档编辑器界面下锁定页面级多余滚动，确保顶部栏与排版功能区 100% 牢牢吸顶固定
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  // 加载已有日记或初始化
  useEffect(() => {
    if (!isNew && id) {
      if (justSavedIdRef.current === id) {
        justSavedIdRef.current = null;
        return;
      }
      const loadDiary = async () => {
        setIsLoading(true);
        try {
          const res = await diaryApi.detail(id);
          if (res.status === 1 && res.data) {
            setTitle(res.data.title || "");
            const md = res.data.content || "";
            setContent(md);
            setWeather(res.data.weather || "Sunny");
            setMood(res.data.mood || "Happy");
            setIsPublic(res.data.is_public !== 0 && res.data.is_public !== false);
            setCreatedAt(res.data.created_at || "");

            // 填充富文档画布
            if (wysiwygRef.current) {
              wysiwygRef.current.innerHTML = markdownToHtml(md);
            }
          } else {
            setErrorMsg(res.content || "加载日记详情失败");
          }
        } catch (err: any) {
          setErrorMsg(`网络错误: ${err.message || String(err)}`);
        } finally {
          setIsLoading(false);
        }
      };
      loadDiary();
    } else if (isNew) {
      const state = location.state as any;
      const initialTitle = state?.templateTitle || "";
      const initialContent = state?.templateContent || "";
      const initialWeather = state?.weather || "Sunny";
      const initialMood = state?.mood || "Happy";
      const initialPublic = state?.is_public !== undefined ? (state.is_public !== 0 && state.is_public !== false) : true;

      setTitle(initialTitle);
      setContent(initialContent);
      setWeather(initialWeather);
      setMood(initialMood);
      setIsPublic(initialPublic);
      setCreatedAt(new Date().toLocaleString("zh-CN"));
      setIsDirty(!!initialContent);

      if (wysiwygRef.current) {
        wysiwygRef.current.innerHTML = markdownToHtml(initialContent);
      }
      setIsLoading(false);
    }
  }, [id, isNew, location.state]);

  // 当加载完成 (isLoading 变为 false) 或进入 WYSIWYG 模式时，将最新 content 同步进 innerHTML
  useEffect(() => {
    if (!isLoading && editorMode === "wysiwyg" && wysiwygRef.current) {
      const currentMdFromDom = htmlToMarkdown(wysiwygRef.current.innerHTML);
      if (currentMdFromDom.trim() !== content.trim()) {
        wysiwygRef.current.innerHTML = markdownToHtml(content);
      }
    }
  }, [isLoading, editorMode, id]);

  // 当处于 Markdown 源码稿纸模式时，自适应调整 textarea 高度以撑开背景卡片，杜绝底部内容溢出
  useEffect(() => {
    if (editorMode === "sheet" && sheetTextareaRef.current) {
      sheetTextareaRef.current.style.height = "auto";
      sheetTextareaRef.current.style.height = `${Math.max(sheetTextareaRef.current.scrollHeight, 480)}px`;
    }
  }, [content, editorMode]);

  // 文档字数与阅读耗时预估
  const stats = useMemo(() => {
    const chars = content.replace(/\s+/g, "").length;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const minutes = Math.max(1, Math.ceil(chars / 350));
    return { chars, words, minutes };
  }, [content]);

  // 处理富文档编辑内容变更
  const handleWysiwygInput = () => {
    if (!wysiwygRef.current) return;
    const md = htmlToMarkdown(wysiwygRef.current.innerHTML);
    setContent(md);
    setIsDirty(true);
  };

  // 处理待办事项选择框原生点击与图片选中
  const handleWysiwygClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" && (target as HTMLInputElement).type === "checkbox") {
      const cb = target as HTMLInputElement;
      if (cb.checked) {
        cb.setAttribute("checked", "true");
      } else {
        cb.removeAttribute("checked");
      }
      handleWysiwygInput();
    } else if (target.tagName === "IMG") {
      e.stopPropagation();
      selectImage(target as HTMLImageElement);
    } else {
      deselectImage();
    }
  };

  // 更新图片调节浮层的位置与画幅
  const updateImgOverlayPos = (img: HTMLImageElement) => {
    if (!sheetRef.current || !img.isConnected) return;
    const sheetRect = sheetRef.current.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    setImgOverlayPos({
      top: imgRect.top - sheetRect.top,
      left: imgRect.left - sheetRect.left,
      width: imgRect.width,
      height: imgRect.height,
    });
  };

  // 选中图片
  const selectImage = (img: HTMLImageElement) => {
    if (selectedImg && selectedImg !== img) {
      selectedImg.classList.remove("selected-editable-img");
    }
    img.classList.add("selected-editable-img");
    const savedW = img.getAttribute("data-width") || img.getAttribute("width");
    if (savedW && !img.style.width) {
      img.style.width = /^\d+$/.test(savedW) ? `${savedW}px` : savedW;
    }
    setSelectedImg(img);
    updateImgOverlayPos(img);
  };

  // 取消选中图片
  const deselectImage = () => {
    if (selectedImg) {
      selectedImg.classList.remove("selected-editable-img");
      setSelectedImg(null);
      setImgOverlayPos(null);
    }
  };

  // 监听窗口大小变化与滚动，保持图片浮层锚定
  useEffect(() => {
    if (!selectedImg) {
      setImgOverlayPos(null);
      return;
    }
    const handleUpdate = () => {
      if (selectedImg && selectedImg.isConnected) {
        updateImgOverlayPos(selectedImg);
      } else {
        deselectImage();
      }
    };
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);
    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [selectedImg]);

  // 按 Esc 键快速取消选中图片
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedImg) {
        deselectImage();
      }
    };
    window.addEventListener("keydown", handleKeyDownGlobal);
    return () => window.removeEventListener("keydown", handleKeyDownGlobal);
  }, [selectedImg]);

  // 切换编辑模式时自动取消选中
  useEffect(() => {
    deselectImage();
  }, [editorMode]);

  // 设置图片宽度预设
  const applyImageWidth = (preset: "25%" | "50%" | "75%" | "100%" | "auto") => {
    if (!selectedImg) return;
    if (preset === "auto") {
      selectedImg.style.width = "";
      selectedImg.style.maxWidth = "100%";
      selectedImg.removeAttribute("width");
      selectedImg.removeAttribute("data-width");
    } else {
      selectedImg.style.width = preset;
      selectedImg.style.maxWidth = "100%";
      selectedImg.setAttribute("width", preset);
      selectedImg.setAttribute("data-width", preset);
    }
    handleWysiwygInput();
    setIsDirty(true);
    setTimeout(() => {
      if (selectedImg) updateImgOverlayPos(selectedImg);
    }, 20);
  };

  // 设置图片对齐
  const applyImageAlign = (align: "left" | "center" | "right") => {
    if (!selectedImg) return;
    selectedImg.setAttribute("data-align", align);
    if (align === "center") {
      selectedImg.style.display = "block";
      selectedImg.style.marginLeft = "auto";
      selectedImg.style.marginRight = "auto";
    } else if (align === "right") {
      selectedImg.style.display = "block";
      selectedImg.style.marginLeft = "auto";
      selectedImg.style.marginRight = "0";
    } else {
      selectedImg.style.display = "block";
      selectedImg.style.marginLeft = "0";
      selectedImg.style.marginRight = "auto";
    }
    handleWysiwygInput();
    setIsDirty(true);
    setTimeout(() => {
      if (selectedImg) updateImgOverlayPos(selectedImg);
    }, 20);
  };

  // 删除当前选中的图片
  const handleDeleteSelectedImage = () => {
    if (!selectedImg) return;
    const parent = selectedImg.parentElement;
    selectedImg.remove();
    if (parent && parent.tagName === "P" && !parent.textContent?.trim() && !parent.children.length) {
      parent.remove();
    }
    setSelectedImg(null);
    setImgOverlayPos(null);
    handleWysiwygInput();
    setIsDirty(true);
  };

  // 鼠标拖拽四角拉伸图片尺寸
  const handleResizeMouseDown = (e: React.MouseEvent, direction: "se" | "sw") => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedImg || !wysiwygRef.current) return;

    const startX = e.clientX;
    const startWidth = selectedImg.offsetWidth;
    const containerWidth = wysiwygRef.current.clientWidth || 800;
    setIsResizingImg(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const deltaX = direction === "se" ? moveEvent.clientX - startX : startX - moveEvent.clientX;
      const newWidthPx = Math.max(80, Math.min(containerWidth, Math.round(startWidth + deltaX)));
      const percent = Math.round((newWidthPx / containerWidth) * 100);

      selectedImg.style.width = `${newWidthPx}px`;
      selectedImg.style.maxWidth = "100%";
      selectedImg.setAttribute("width", `${newWidthPx}`);
      selectedImg.setAttribute("data-width", `${newWidthPx}px`);
      setResizingSizeText(`${newWidthPx}px · ${percent}%`);
      updateImgOverlayPos(selectedImg);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setIsResizingImg(false);
      handleWysiwygInput();
      setIsDirty(true);
      if (selectedImg) {
        updateImgOverlayPos(selectedImg);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // 计算当前图片尺寸与对齐的预设激活项
  const currentPreset = useMemo(() => {
    if (!selectedImg) return "";
    const w = selectedImg.style.width || selectedImg.getAttribute("data-width") || selectedImg.getAttribute("width") || "";
    if (w === "25%" || w === "50%" || w === "75%" || w === "100%") return w;
    if (!w || w === "auto") return "auto";
    return "";
  }, [selectedImg, imgOverlayPos]);

  const currentAlign = useMemo(() => {
    if (!selectedImg) return "";
    return selectedImg.getAttribute("data-align") || "";
  }, [selectedImg, imgOverlayPos]);

  // 富文本格式化辅助指令
  const executeDocCommand = (command: string, value: string | undefined = undefined) => {
    if (editorMode !== "wysiwyg") {
      setEditorMode("wysiwyg");
    }
    setTimeout(() => {
      if (wysiwygRef.current) {
        wysiwygRef.current.focus();
      }
      document.execCommand(command, false, value);
      handleWysiwygInput();
    }, 10);
  };

  // 插入自定义 HTML 块 (如图片、表格、代码块、Callout)
  const insertCustomHtml = (htmlString: string) => {
    if (editorMode !== "wysiwyg") {
      setEditorMode("wysiwyg");
    }
    setTimeout(() => {
      if (!wysiwygRef.current) return;
      wysiwygRef.current.focus();

      const sel = window.getSelection();
      let inserted = false;
      if (sel && sel.rangeCount > 0 && wysiwygRef.current.contains(sel.anchorNode)) {
        try {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = htmlString;
          const frag = document.createDocumentFragment();
          let node;
          let lastNode = null;
          while ((node = tempDiv.firstChild)) {
            lastNode = frag.appendChild(node);
          }
          range.insertNode(frag);
          if (lastNode) {
            range.setStartAfter(lastNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
          inserted = true;
        } catch {
          inserted = false;
        }
      }

      if (!inserted) {
        // 如果未处于选区激活状态（例如点击文件选择框后失焦），可靠追加至文档末尾
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlString;
        while (tempDiv.firstChild) {
          wysiwygRef.current.appendChild(tempDiv.firstChild);
        }
      }

      handleWysiwygInput();
    }, 20);
  };

  // 核心：上传图片并插入当前文档
  const uploadAndInsertImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("请选择合法的图片格式 (JPG, PNG, GIF, WebP, SVG)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("图片文件过大，单张图片上限为 10MB");
      return;
    }

    setIsUploadingImage(true);
    setErrorMsg(null);

    try {
      const res = await uploadApi.uploadImage(file);
      if (res.status === 1 && res.data) {
        const imgUrl = res.data.url;
        const altText = file.name ? file.name.replace(/\.[^/.]+$/, "") : "图片";

        if (editorMode === "wysiwyg") {
          const imgHtml = `<p><img src="${imgUrl}" alt="${altText}" style="max-width: 100%; border-radius: 8px; margin: 12px 0; display: block;" /></p><p><br></p>`;
          insertCustomHtml(imgHtml);
        } else {
          if (sheetTextareaRef.current) {
            const ta = sheetTextareaRef.current;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const before = content.substring(0, start);
            const after = content.substring(end);
            const insertion = `\n![${altText}](${imgUrl})\n`;
            const newContent = before + insertion + after;
            setContent(newContent);
            setIsDirty(true);
            setTimeout(() => {
              ta.focus();
              ta.setSelectionRange(start + insertion.length, start + insertion.length);
            }, 10);
          } else {
            setContent((prev) => `${prev}\n\n![${altText}](${imgUrl})\n`);
            setIsDirty(true);
          }
        }
        setUploadSuccessNotice(true);
        setTimeout(() => setUploadSuccessNotice(false), 3000);
      } else {
        setErrorMsg(res.content || "图片上传失败");
      }
    } catch (err: any) {
      setErrorMsg(`上传图片异常: ${err.message || String(err)}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // 剪贴板直接粘贴图片 (Ctrl+V 截图或图片复制)
  const handlePaste = async (e: React.ClipboardEvent) => {
    if (e.clipboardData && e.clipboardData.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            await uploadAndInsertImage(file);
            return;
          }
        }
      }
    }
  };

  // 拖拽图片直接上传
  const handleDrop = async (e: React.DragEvent) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        e.preventDefault();
        await uploadAndInsertImage(file);
      }
    }
  };

  // 隐藏文件选择框触发上传
  const handleImageFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAndInsertImage(file);
      e.target.value = "";
    }
  };

  // 插入表格
  const handleInsertTable = () => {
    let tableHtml = "<table><thead><tr>";
    for (let c = 0; c < tableCols; c++) {
      tableHtml += `<th>列标 ${c + 1}</th>`;
    }
    tableHtml += "</tr></thead><tbody>";
    for (let r = 0; r < tableRows; r++) {
      tableHtml += "<tr>";
      for (let c = 0; c < tableCols; c++) {
        tableHtml += `<td>内容单元格</td>`;
      }
      tableHtml += "</tr>";
    }
    tableHtml += "</tbody></table><p><br></p>";
    insertCustomHtml(tableHtml);
    setTableModalOpen(false);
  };

  // 插入待办事项
  const handleInsertTodoList = () => {
    const todoHtml = `<ul><li style="list-style: none;"><input type="checkbox" /> 待办事项...</li></ul><p><br></p>`;
    insertCustomHtml(todoHtml);
  };

  // 插入重点提示卡片 (Callout)
  const handleInsertCallout = () => {
    const calloutHtml = `<div class="document-callout"><div>💡</div><div><strong>感悟提示：</strong>在此输入重点感悟或心得随想...</div></div><p><br></p>`;
    insertCustomHtml(calloutHtml);
  };

  // 插入代码卡片
  const handleInsertCodeCard = () => {
    const codeHtml = `<pre><code>// 请在此输入代码示例\nfunction createMoment() {\n  return "Focus & Clarity";\n}</code></pre><p><br></p>`;
    insertCustomHtml(codeHtml);
  };

  // 插入当前时间戳
  const handleInsertTimestamp = () => {
    const now = new Date();
    const timeStr = `**[${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}]** `;
    executeDocCommand("insertText", timeStr);
  };

  // 快捷键支持 (Ctrl+B / Ctrl+I / Ctrl+U / Ctrl+S)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      handleSave();
    }
  };

  // 保存日记
  const handleSave = async (customRedirect?: string | unknown): Promise<boolean> => {
    const redirectUrl = typeof customRedirect === "string" ? customRedirect : undefined;
    if (!title.trim()) {
      const msg = "日记标题不能为空，请在文档顶部输入标题";
      setErrorMsg(msg);
      setUnsavedModalError(msg);
      return false;
    }

    // 关键加固：在保存瞬间直接从当前编辑器 DOM 获取最新实时的 Markdown 内容，避免异步 React 状态延迟
    let latestContent = content;
    if (editorMode === "wysiwyg" && wysiwygRef.current) {
      const prevSelected = selectedImg;
      if (prevSelected) {
        prevSelected.classList.remove("selected-editable-img");
      }
      latestContent = htmlToMarkdown(wysiwygRef.current.innerHTML);
      if (prevSelected && prevSelected.isConnected) {
        prevSelected.classList.add("selected-editable-img");
      }
      setContent(latestContent);
    } else if (editorMode === "sheet" && sheetTextareaRef.current) {
      latestContent = sheetTextareaRef.current.value;
      setContent(latestContent);
    }

    setIsSaving(true);
    setErrorMsg(null);
    setUnsavedModalError(null);

    try {
      if (isNew) {
        const res = await diaryApi.create({
          title: title.trim(),
          content: latestContent,
          weather,
          mood,
          is_public: isPublic ? 1 : 0,
        });
        if (res.status === 1 && res.data) {
          setIsDirty(false);
          setSaveSuccessNotice(true);
          setTimeout(() => setSaveSuccessNotice(false), 3000);
          justSavedIdRef.current = res.data.id;
          if (redirectUrl) {
            navigate(redirectUrl);
          } else {
            navigate(`/workspace/edit/${res.data.id}`, { replace: true });
          }
          return true;
        } else {
          const err = res.content || "创建日记失败";
          setErrorMsg(err);
          setUnsavedModalError(err);
          return false;
        }
      } else {
        const res = await diaryApi.update({
          id: id!,
          title: title.trim(),
          content: latestContent,
          weather,
          mood,
          is_public: isPublic ? 1 : 0,
        });
        if (res.status === 1) {
          setIsDirty(false);
          setSaveSuccessNotice(true);
          setTimeout(() => setSaveSuccessNotice(false), 3000);
          if (redirectUrl) {
            navigate(redirectUrl);
          }
          return true;
        } else {
          const err = res.content || "更新日记失败";
          setErrorMsg(err);
          setUnsavedModalError(err);
          return false;
        }
      }
    } catch (err: any) {
      const errText = `保存异常: ${err.message || String(err)}`;
      setErrorMsg(errText);
      setUnsavedModalError(errText);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // 切换编辑模式前同步最新内容
  const handleSwitchMode = (mode: "wysiwyg" | "sheet" | "preview") => {
    if (editorMode === "wysiwyg" && wysiwygRef.current && mode !== "wysiwyg") {
      const md = htmlToMarkdown(wysiwygRef.current.innerHTML);
      setContent(md);
    } else if (editorMode === "sheet" && sheetTextareaRef.current && mode !== "sheet") {
      setContent(sheetTextareaRef.current.value);
    }
    setEditorMode(mode);
  };

  // 打开 Markdown 源码检视器
  const handleOpenSourceModal = () => {
    if (editorMode === "wysiwyg" && wysiwygRef.current) {
      const currentMd = htmlToMarkdown(wysiwygRef.current.innerHTML);
      setContent(currentMd);
      setRawSourceBuffer(currentMd);
    } else {
      setRawSourceBuffer(content);
    }
    setSourceModalOpen(true);
  };

  // 从源码检视器更新文档
  const handleApplySourceModal = () => {
    setContent(rawSourceBuffer);
    setIsDirty(true);
    if (wysiwygRef.current) {
      wysiwygRef.current.innerHTML = markdownToHtml(rawSourceBuffer);
    }
    setSourceModalOpen(false);
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "calc(100vh - var(--header-height, 64px))",
          gap: "16px",
        }}
      >
        <Spinner size="large" label="正在展开您的日记文档空间..." />
      </div>
    );
  }

  return (
    <div className="document-workspace">
      {/* Top Document Studio Navigation Bar (Fluent 2 现代顶栏 - 响应式适配与绝对吸顶) */}
      <div
        className="glass-panel studio-topbar"
        style={{
          position: "sticky",
          top: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 24px",
          height: "56px",
          boxSizing: "border-box",
          borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
          backgroundColor: isDark ? "rgba(32, 32, 38, 0.95)" : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          zIndex: 50,
          gap: "8px",
          flexShrink: 0,
        }}
      >
        {/* Left: Back to workspace */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <Tooltip content="返回笔记库" relationship="label">
            <Button
              appearance="subtle"
              icon={<ArrowLeft20Regular />}
              onClick={() => {
                if (isDirty) {
                  setPendingNavPath("/workspace");
                  setUnsavedModalError(null);
                  setShowUnsavedModal(true);
                  return;
                }
                navigate("/workspace");
              }}
              aria-label="返回笔记库"
            />
          </Tooltip>

          <Divider vertical className="desktop-only" style={{ height: "20px" }} />

          <Text
            weight="semibold"
            className="desktop-only"
            style={{
              fontSize: "14px",
              opacity: 0.85,
              maxWidth: "180px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {isNew ? "新建随笔" : title || "未命名文档"}
          </Text>
        </div>

        {/* Center: Document Mode Selector (图标化模式切换) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "2px",
            borderRadius: "8px",
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
            flexShrink: 0,
            gap: "2px",
          }}
        >
          <Tooltip content="文档编辑" relationship="label">
            <Button
              appearance={editorMode === "wysiwyg" ? "primary" : "subtle"}
              size="small"
              icon={<DocumentEdit20Regular />}
              onClick={() => handleSwitchMode("wysiwyg")}
              aria-label="文档编辑"
            />
          </Tooltip>
          <Tooltip content="稿纸排版模式" relationship="label">
            <Button
              appearance={editorMode === "sheet" ? "primary" : "subtle"}
              size="small"
              icon={<Document20Regular />}
              onClick={() => handleSwitchMode("sheet")}
              aria-label="稿纸排版"
            />
          </Tooltip>
          <Tooltip content="纯享阅读演示" relationship="label">
            <Button
              appearance={editorMode === "preview" ? "primary" : "subtle"}
              size="small"
              icon={<Eye20Regular />}
              onClick={() => handleSwitchMode("preview")}
              aria-label="纯享阅读"
            />
          </Tooltip>
        </div>

        {/* Right: Actions (Desktop) */}
        <div className="desktop-only" style={{ alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {/* View Raw Markdown Source */}
          <Tooltip content="检视 Markdown 源码" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<Code20Regular />}
              onClick={handleOpenSourceModal}
              aria-label="Markdown 源码"
            />
          </Tooltip>

          {/* Save Status Dot */}
          {saveSuccessNotice ? (
            <Tooltip content="已同步保存" relationship="label">
              <Badge
                appearance="tint"
                color="success"
                icon={<CheckmarkCircle20Regular style={{ fontSize: "16px" }} />}
                style={{ padding: "4px 8px", borderRadius: "999px" }}
              />
            </Tooltip>
          ) : isDirty ? (
            <Tooltip content="有修改未保存" relationship="label">
              <Badge
                appearance="tint"
                color="warning"
                style={{ padding: "4px 8px", borderRadius: "999px", fontSize: "12px", fontWeight: 700 }}
              >
                ●
              </Badge>
            </Tooltip>
          ) : (
            <Tooltip content="已就绪" relationship="label">
              <Badge
                appearance="tint"
                color="informative"
                style={{ padding: "4px 8px", borderRadius: "999px", fontSize: "12px" }}
              >
                ✓
              </Badge>
            </Tooltip>
          )}

          {/* Top Visibility Quick Toggle */}
          <Tooltip
            content={isPublic ? "公开笔记 (点击设为私密)" : "私密笔记 (点击公开到广场)"}
            relationship="label"
          >
            <Button
              appearance="subtle"
              size="small"
              icon={
                isPublic ? (
                  <Globe20Regular style={{ color: "#0078d4" }} />
                ) : (
                  <LockClosed20Regular style={{ color: "#8a8886" }} />
                )
              }
              onClick={() => {
                setIsPublic(!isPublic);
                setIsDirty(true);
              }}
              aria-label="切换可见性"
            >
              {isPublic ? "公开" : "私密"}
            </Button>
          </Tooltip>

          {/* Save Button */}
          <Tooltip content="保存" relationship="label">
            <Button
              appearance="primary"
              size="small"
              icon={<Save20Regular />}
              onClick={() => handleSave()}
              disabled={isSaving}
              aria-label="保存"
              style={{
                borderRadius: "8px",
                boxShadow: "0 2px 10px rgba(0, 120, 212, 0.25)",
              }}
            >
              {isSaving ? "..." : "保存"}
            </Button>
          </Tooltip>
        </div>

        {/* Right: Actions (Mobile <= 768px) */}
        <div className="mobile-only" style={{ alignItems: "center", gap: "6px", flexShrink: 0 }}>
          {/* Mobile More Options Menu */}
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button
                appearance="subtle"
                size="small"
                icon={<MoreHorizontal20Regular />}
                aria-label="更多操作"
              />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem
                  icon={<Image20Regular />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? "正在上传图片..." : "上传插入图片"}
                </MenuItem>
                <MenuItem
                  icon={isPublic ? <Globe20Regular /> : <LockClosed20Regular />}
                  onClick={() => {
                    setIsPublic(!isPublic);
                    setIsDirty(true);
                  }}
                >
                  {isPublic ? "设为私密笔记" : "设为公开笔记"}
                </MenuItem>
                <MenuItem icon={<Code20Regular />} onClick={handleOpenSourceModal}>
                  Markdown 源码检视
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>

          {/* Save Button (Mobile) */}
          <Button
            appearance="primary"
            size="small"
            icon={<Save20Regular />}
            onClick={() => handleSave()}
            disabled={isSaving}
            style={{
              fontWeight: 600,
              borderRadius: "8px",
            }}
          >
            {isSaving ? "..." : "保存"}
          </Button>
        </div>
      </div>

      {/* Modern Fluent 2 Document Ribbon (文档格式功能区 - 置顶吸顶与移动端滑动) */}
      {editorMode !== "preview" && (
        <div
          className="glass-panel studio-ribbon"
          style={{
            position: "sticky",
            top: "56px",
            display: "flex",
            alignItems: "center",
            padding: "6px 24px",
            borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.06)",
            backgroundColor: isDark ? "rgba(26, 26, 32, 0.95)" : "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(12px)",
            gap: "6px",
            overflowX: "auto",
            zIndex: 40,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
            flexShrink: 0,
          }}
        >
          {/* Headings & Blocks - 纯图标化 */}
          <Tooltip content="正文文本段落" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<TextAlignLeft20Regular />}
              onClick={() => executeDocCommand("formatBlock", "<p>")}
              aria-label="正文段落"
            />
          </Tooltip>
          <Tooltip content="一级标题" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<TextHeader120Regular />}
              onClick={() => executeDocCommand("formatBlock", "<h1>")}
              aria-label="一级标题"
            />
          </Tooltip>
          <Tooltip content="二级标题" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<TextHeader220Regular />}
              onClick={() => executeDocCommand("formatBlock", "<h2>")}
              aria-label="二级标题"
            />
          </Tooltip>
          <Tooltip content="三级标题" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<TextHeader320Regular />}
              onClick={() => executeDocCommand("formatBlock", "<h3>")}
              aria-label="三级标题"
            />
          </Tooltip>

          <Divider vertical style={{ height: "18px", margin: "0 4px" }} />

          {/* Inline Styles */}
          <Tooltip content="加粗" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<TextBold20Regular />}
              onClick={() => executeDocCommand("bold")}
              aria-label="加粗"
            />
          </Tooltip>
          <Tooltip content="斜体" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<TextItalic20Regular />}
              onClick={() => executeDocCommand("italic")}
              aria-label="斜体"
            />
          </Tooltip>
          <Tooltip content="下划线" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<TextUnderline20Regular />}
              onClick={() => executeDocCommand("underline")}
              aria-label="下划线"
            />
          </Tooltip>
          <Tooltip content="删除线" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<TextStrikethrough20Regular />}
              onClick={() => executeDocCommand("strikeThrough")}
              aria-label="删除线"
            />
          </Tooltip>

          <Divider vertical style={{ height: "18px", margin: "0 4px" }} />

          {/* Lists & Quotes */}
          <Tooltip content="无序列表" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<TextBulletList20Regular />}
              onClick={() => executeDocCommand("insertUnorderedList")}
              aria-label="无序列表"
            />
          </Tooltip>
          <Tooltip content="有序编号列表" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<TextNumberListLtr20Regular />}
              onClick={() => executeDocCommand("insertOrderedList")}
              aria-label="有序列表"
            />
          </Tooltip>
          <Tooltip content="待办清单" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<CheckmarkCircle20Regular />}
              onClick={handleInsertTodoList}
              aria-label="待办清单"
            />
          </Tooltip>
          <Tooltip content="引用段落" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<TextQuote20Regular />}
              onClick={() => executeDocCommand("formatBlock", "<blockquote>")}
              aria-label="引用"
            />
          </Tooltip>
          <Tooltip content="灵感提示卡片" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<Lightbulb20Regular />}
              onClick={handleInsertCallout}
              aria-label="灵感提示"
            />
          </Tooltip>

          <Divider vertical style={{ height: "18px", margin: "0 4px" }} />

          {/* Advanced Components */}
          <Tooltip content={isUploadingImage ? "正在上传图片..." : "上传并插入图片"} relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={isUploadingImage ? <Spinner size="tiny" /> : <Image20Regular />}
              disabled={isUploadingImage}
              onClick={() => fileInputRef.current?.click()}
              aria-label="上传图片"
            />
          </Tooltip>
          <Tooltip content="插入数据表格" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<Table20Regular />}
              onClick={() => setTableModalOpen(true)}
              aria-label="插入表格"
            />
          </Tooltip>
          <Tooltip content="插入代码卡片" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<Code20Regular />}
              onClick={handleInsertCodeCard}
              aria-label="代码卡片"
            />
          </Tooltip>
          <Tooltip content="插入分割线" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<DividerShort20Regular />}
              onClick={() => executeDocCommand("insertHorizontalRule")}
              aria-label="分割线"
            />
          </Tooltip>
          <Tooltip content="插入当前时间戳" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<History20Regular />}
              onClick={handleInsertTimestamp}
              aria-label="时间戳"
            />
          </Tooltip>
        </div>
      )}

      {/* Alerts */}
      {errorMsg && (
        <MessageBar intent="error" style={{ margin: "12px 24px 0 24px", flexShrink: 0 }}>
          <MessageBarBody>{errorMsg}</MessageBarBody>
        </MessageBar>
      )}
      {uploadSuccessNotice && (
        <MessageBar intent="success" style={{ margin: "12px 24px 0 24px", flexShrink: 0 }}>
          <MessageBarBody>图片已成功上传并插入文档！</MessageBarBody>
        </MessageBar>
      )}

      {/* Main Document Scroll Viewport (居中文档稿纸画布) */}
      <div className="document-scroll-viewport" onKeyDown={handleKeyDown}>
        <div ref={sheetRef} className="document-sheet">
          {/* Document Header: Title Input (巨幅无边框优雅文档大标题) */}
          <input
            className="document-title-input"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsDirty(true);
            }}
            placeholder="在此键入随笔或文档大标题..."
          />

          {/* Document Header: Meta Attributes Bar (天气、心境、字数、阅读时长) */}
          <div className="document-meta-row">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <WeatherPicker
                value={weather}
                onChange={(w) => {
                  setWeather(w);
                  setIsDirty(true);
                }}
              />

              <MoodPicker
                value={mood}
                onChange={(m) => {
                  setMood(m);
                  setIsDirty(true);
                }}
              />

              {/* Document Meta Row Visibility Toggle */}
              <Tooltip
                content={
                  isPublic
                    ? "公开日记：保存在公共广场，所有访客均可阅读浏览"
                    : "私密日记：仅您本人可见，绝不出现在公共广场"
                }
                relationship="label"
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsPublic(!isPublic);
                    setIsDirty(true);
                  }}
                  className="meta-capsule-chip"
                  style={{
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    border: isPublic
                      ? "1px solid rgba(0, 120, 212, 0.35)"
                      : isDark
                      ? "1px solid rgba(255, 255, 255, 0.14)"
                      : "1px solid rgba(0, 0, 0, 0.14)",
                    background: isPublic
                      ? isDark
                        ? "rgba(0, 120, 212, 0.2)"
                        : "rgba(0, 120, 212, 0.08)"
                      : isDark
                      ? "rgba(255, 255, 255, 0.06)"
                      : "rgba(0, 0, 0, 0.04)",
                    color: isPublic ? "#0078d4" : isDark ? "rgba(255, 255, 255, 0.75)" : "#605e5c",
                    borderRadius: "16px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  aria-label="切换笔记公开或私密状态"
                >
                  {isPublic ? (
                    <Globe20Regular style={{ fontSize: "14px", color: "#0078d4" }} />
                  ) : (
                    <LockClosed20Regular style={{ fontSize: "14px" }} />
                  )}
                  <span>{isPublic ? "公开可见" : "仅自己可见"}</span>
                </button>
              </Tooltip>

              {createdAt && (
                <span className="meta-capsule-chip">
                  📅 {createdAt}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Tooltip content={`总计 ${stats.chars} 字符`} relationship="label">
                <span className="meta-capsule-chip">📝 {stats.chars}</span>
              </Tooltip>
              <Tooltip content={`预计阅读 ${stats.minutes} 分钟`} relationship="label">
                <span className="meta-capsule-chip">⏱️ {stats.minutes}m</span>
              </Tooltip>
            </div>
          </div>

          {/* Mode 1: WYSIWYG Live Document Canvas (所见即所得文档编辑 - 推荐默认) */}
          {editorMode === "wysiwyg" && (
            <div
              ref={wysiwygRef}
              className="document-wysiwyg-content"
              contentEditable
              suppressContentEditableWarning
              onInput={handleWysiwygInput}
              onClick={handleWysiwygClick}
              onPaste={handlePaste}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              spellCheck={false}
            />
          )}

          {/* Mode 2: Typora-Style Document Sheet (单栏优雅 Markdown 稿纸排版) */}
          {editorMode === "sheet" && (
            <textarea
              ref={sheetTextareaRef}
              className="document-sheet-textarea"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setIsDirty(true);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.max(e.target.scrollHeight, 480)}px`;
              }}
              onPaste={handlePaste}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              placeholder="在此使用 Markdown 语法书写，具有舒适的行距与排版质感..."
            />
          )}

          {/* Mode 3: Clean Document Presentation (纯享阅读演示) */}
          {editorMode === "preview" && (
            <MarkdownViewer content={content} style={{ minHeight: "480px" }} />
          )}

          {/* Image Resizer Overlay (WYSIWYG 模式下图片可拖拽拉伸与快捷预设浮层) */}
          {selectedImg && imgOverlayPos && editorMode === "wysiwyg" && (
            <div
              className="image-selected-overlay-container"
              style={{
                position: "absolute",
                top: `${imgOverlayPos.top}px`,
                left: `${imgOverlayPos.left}px`,
                width: `${imgOverlayPos.width}px`,
                height: `${imgOverlayPos.height}px`,
                pointerEvents: "none",
                zIndex: 100,
              }}
            >
              {/* 高亮选框 */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  border: "2px solid #0078d4",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                  boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.4)",
                }}
              />

              {/* 浮动快捷排版工具栏 */}
              <div
                className="image-floating-toolbar"
                style={{
                  top: "-42px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  pointerEvents: "auto",
                  backgroundColor: isDark ? "rgba(28, 28, 35, 0.95)" : "rgba(255, 255, 255, 0.96)",
                  backdropFilter: "blur(20px)",
                  border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.08)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className={`image-toolbar-btn ${currentPreset === "25%" ? "active" : ""}`}
                  onClick={() => applyImageWidth("25%")}
                  title="25% 微缩尺寸"
                >
                  25%
                </button>
                <button
                  type="button"
                  className={`image-toolbar-btn ${currentPreset === "50%" ? "active" : ""}`}
                  onClick={() => applyImageWidth("50%")}
                  title="50% 半宽尺寸"
                >
                  50%
                </button>
                <button
                  type="button"
                  className={`image-toolbar-btn ${currentPreset === "75%" ? "active" : ""}`}
                  onClick={() => applyImageWidth("75%")}
                  title="75% 中宽尺寸"
                >
                  75%
                </button>
                <button
                  type="button"
                  className={`image-toolbar-btn ${currentPreset === "100%" ? "active" : ""}`}
                  onClick={() => applyImageWidth("100%")}
                  title="100% 全宽尺寸"
                >
                  100%
                </button>
                <button
                  type="button"
                  className={`image-toolbar-btn ${currentPreset === "auto" ? "active" : ""}`}
                  onClick={() => applyImageWidth("auto")}
                  title="原始自适应尺寸"
                >
                  自适应
                </button>

                <span style={{ width: "1px", height: "14px", backgroundColor: "rgba(128, 128, 128, 0.25)", margin: "0 3px" }} />

                <button
                  type="button"
                  className={`image-toolbar-btn ${currentAlign === "left" ? "active" : ""}`}
                  onClick={() => applyImageAlign("left")}
                  title="居左对齐"
                >
                  居左
                </button>
                <button
                  type="button"
                  className={`image-toolbar-btn ${currentAlign === "center" ? "active" : ""}`}
                  onClick={() => applyImageAlign("center")}
                  title="居中对齐"
                >
                  居中
                </button>
                <button
                  type="button"
                  className={`image-toolbar-btn ${currentAlign === "right" ? "active" : ""}`}
                  onClick={() => applyImageAlign("right")}
                  title="居右对齐"
                >
                  居右
                </button>

                <span style={{ width: "1px", height: "14px", backgroundColor: "rgba(128, 128, 128, 0.25)", margin: "0 3px" }} />

                <button
                  type="button"
                  className="image-toolbar-btn"
                  onClick={handleDeleteSelectedImage}
                  style={{ color: "#e74c3c" }}
                  title="删除图片"
                >
                  删除
                </button>
              </div>

              {/* 右下角拖拽拉伸控柄 */}
              <div
                className="image-resize-handle handle-se"
                style={{
                  bottom: "-7px",
                  right: "-7px",
                  pointerEvents: "auto",
                }}
                onMouseDown={(e) => handleResizeMouseDown(e, "se")}
                title="按住拖拽自由调节图片尺寸"
              />

              {/* 左下角拖拽拉伸控柄 */}
              <div
                className="image-resize-handle handle-sw"
                style={{
                  bottom: "-7px",
                  left: "-7px",
                  pointerEvents: "auto",
                }}
                onMouseDown={(e) => handleResizeMouseDown(e, "sw")}
                title="按住拖拽自由调节图片尺寸"
              />

              {/* 拖拽实时尺寸微胶囊指示器 */}
              {isResizingImg && (
                <div
                  className="image-resize-size-pill"
                  style={{
                    top: "50%",
                    left: "50%",
                  }}
                >
                  {resizingSizeText}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden Image File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        style={{ display: "none" }}
        onChange={handleImageFileInputChange}
      />

      {/* Table Insertion Modal */}
      <Dialog open={tableModalOpen} onOpenChange={(_, d) => setTableModalOpen(d.open)}>
        <DialogSurface
          backdrop={{
            style: {
              backdropFilter: "blur(12px) saturate(135%)",
              WebkitBackdropFilter: "blur(12px) saturate(135%)",
              backgroundColor: isDark ? "rgba(0, 0, 0, 0.55)" : "rgba(15, 23, 42, 0.4)",
            },
          }}
          style={{
            maxWidth: "440px",
            width: "90vw",
            borderRadius: "16px",
            padding: "24px",
            backgroundColor: isDark ? "rgba(28, 28, 35, 0.95)" : "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: isDark
              ? "0 28px 72px rgba(0, 0, 0, 0.65), 0 6px 24px rgba(0, 0, 0, 0.4)"
              : "0 24px 64px rgba(0, 0, 0, 0.22), 0 4px 18px rgba(0, 0, 0, 0.08)",
          }}
        >
          <DialogBody style={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <div className="dialog-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "16px" }}>
              <div className="dialog-header-title" style={{ flex: 1, minWidth: 0 }}>
                <DialogTitle style={{ padding: 0, margin: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Table20Regular style={{ color: "#0078d4" }} />
                    <Title3 style={{ fontWeight: 600, fontSize: "18px" }}>
                      插入表格
                    </Title3>
                  </div>
                </DialogTitle>
              </div>
              <Tooltip content="关闭" relationship="label">
                <Button
                  className="dialog-close-btn"
                  appearance="subtle"
                  icon={<Dismiss20Regular />}
                  onClick={() => setTableModalOpen(false)}
                  aria-label="关闭"
                  style={{ marginLeft: "auto", flexShrink: 0 }}
                />
              </Tooltip>
            </div>

            <DialogContent style={{ display: "flex", flexDirection: "column", gap: "18px", padding: 0 }}>
              {/* Quick Presets */}
              <div>
                <Caption1 style={{ opacity: 0.65, marginBottom: "8px", display: "block" }}>
                  常用规格
                </Caption1>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[
                    [3, 3],
                    [4, 3],
                    [5, 4],
                    [6, 4],
                  ].map(([r, c]) => {
                    const isSelected = tableRows === r && tableCols === c;
                    return (
                      <Button
                        key={`${r}x${c}`}
                        size="small"
                        appearance={isSelected ? "primary" : "secondary"}
                        onClick={() => {
                          setTableRows(r);
                          setTableCols(c);
                        }}
                      >
                        {r} 行 × {c} 列
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Rows & Columns */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <Field label="行数">
                  <SpinButton
                    value={tableRows}
                    min={1}
                    max={20}
                    step={1}
                    onChange={(_, data) => typeof data.value === "number" && setTableRows(data.value)}
                    style={{ width: "100%" }}
                  />
                </Field>
                <Field label="列数">
                  <SpinButton
                    value={tableCols}
                    min={1}
                    max={10}
                    step={1}
                    onChange={(_, data) => typeof data.value === "number" && setTableCols(data.value)}
                    style={{ width: "100%" }}
                  />
                </Field>
              </div>

              {/* Summary Caption */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Caption1 style={{ opacity: 0.65 }}>
                  包含 1 行表头 + {Math.max(1, tableRows - 1)} 行数据
                </Caption1>
                <Caption1 style={{ fontWeight: 600, color: "#0078d4" }}>
                  共 {tableRows * tableCols} 个单元格
                </Caption1>
              </div>
            </DialogContent>

            {/* Footer Actions - 原生 Fluent 2 按钮，无多余线条 */}
            <DialogActions style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px", padding: 0 }}>
              <Button appearance="secondary" onClick={() => setTableModalOpen(false)}>
                取消
              </Button>
              <Button appearance="primary" onClick={handleInsertTable}>
                插入表格
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Markdown Source Inspector Dialog (源码检视弹窗) */}
      <Dialog open={sourceModalOpen} onOpenChange={(_, d) => setSourceModalOpen(d.open)}>
        <DialogSurface
          backdrop={{
            style: {
              backdropFilter: "blur(12px) saturate(135%)",
              WebkitBackdropFilter: "blur(12px) saturate(135%)",
              backgroundColor: isDark ? "rgba(0, 0, 0, 0.55)" : "rgba(15, 23, 42, 0.4)",
            },
          }}
          style={{
            maxWidth: "840px",
            width: "92vw",
            borderRadius: "16px",
            padding: "24px",
            backgroundColor: isDark ? "rgba(28, 28, 35, 0.95)" : "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: isDark
              ? "0 28px 72px rgba(0, 0, 0, 0.65), 0 6px 24px rgba(0, 0, 0, 0.4)"
              : "0 24px 64px rgba(0, 0, 0, 0.22), 0 4px 18px rgba(0, 0, 0, 0.08)",
          }}
        >
          <DialogBody style={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <div className="dialog-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "16px" }}>
              <div className="dialog-header-title" style={{ flex: 1, minWidth: 0 }}>
                <DialogTitle style={{ padding: 0, margin: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Code20Regular style={{ color: "#0078d4" }} />
                    <Title3 style={{ fontWeight: 600, fontSize: "18px" }}>
                      Markdown 源码
                    </Title3>
                    <Caption1 style={{ opacity: 0.7, marginLeft: "8px" }}>
                      {rawSourceBuffer.length} 字符 · {rawSourceBuffer.split("\n").length} 行
                    </Caption1>
                  </div>
                </DialogTitle>
              </div>
              <Tooltip content="关闭" relationship="label">
                <Button
                  className="dialog-close-btn"
                  appearance="subtle"
                  icon={<Dismiss20Regular />}
                  onClick={() => setSourceModalOpen(false)}
                  aria-label="关闭"
                  style={{ marginLeft: "auto", flexShrink: 0 }}
                />
              </Tooltip>
            </div>

            <DialogContent style={{ display: "flex", flexDirection: "column", gap: "12px", padding: 0 }}>
              <textarea
                value={rawSourceBuffer}
                onChange={(e) => setRawSourceBuffer(e.target.value)}
                spellCheck={false}
                style={{
                  width: "100%",
                  height: "380px",
                  borderRadius: "8px",
                  padding: "16px",
                  fontFamily: "'Fira Code', Consolas, Monaco, monospace",
                  fontSize: "13px",
                  lineHeight: "1.65",
                  backgroundColor: isDark ? "rgba(18, 18, 24, 0.95)" : "rgba(248, 250, 252, 0.95)",
                  color: isDark ? "#f4f4f5" : "#0f172a",
                  border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
                  resize: "vertical",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </DialogContent>

            {/* Footer Actions - 原生 Fluent 2 按钮，无多余线条 */}
            <DialogActions style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", padding: 0 }}>
              <Button
                appearance="subtle"
                icon={<Copy20Regular />}
                onClick={() => {
                  navigator.clipboard.writeText(rawSourceBuffer);
                  setCopiedNotice(true);
                  setTimeout(() => setCopiedNotice(false), 2000);
                }}
              >
                {copiedNotice ? "已复制！" : "复制源码"}
              </Button>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button appearance="secondary" onClick={() => setSourceModalOpen(false)}>
                  取消
                </Button>
                <Button appearance="primary" onClick={handleApplySourceModal}>
                  应用修改
                </Button>
              </div>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Unsaved Changes Confirmation Modal (中间弹窗) */}
      <Dialog
        open={showUnsavedModal}
        onOpenChange={(_, data) => {
          if (!data.open) {
            setShowUnsavedModal(false);
          }
        }}
      >
        <DialogSurface
          backdrop={{
            style: {
              backdropFilter: "blur(12px) saturate(135%)",
              WebkitBackdropFilter: "blur(12px) saturate(135%)",
              backgroundColor: isDark ? "rgba(0, 0, 0, 0.55)" : "rgba(15, 23, 42, 0.4)",
            },
          }}
          style={{
            maxWidth: "460px",
            width: "90vw",
            borderRadius: "16px",
            padding: "24px",
            backgroundColor: isDark ? "rgba(28, 28, 35, 0.95)" : "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: isDark
              ? "0 28px 72px rgba(0, 0, 0, 0.65), 0 6px 24px rgba(0, 0, 0, 0.4)"
              : "0 24px 64px rgba(0, 0, 0, 0.22), 0 4px 18px rgba(0, 0, 0, 0.08)",
          }}
        >
          <DialogBody style={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <div className="dialog-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "16px" }}>
              <div className="dialog-header-title" style={{ flex: 1, minWidth: 0 }}>
                <DialogTitle style={{ padding: 0, margin: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Warning20Regular style={{ color: "#d97706" }} />
                    <Title3 style={{ fontWeight: 600, fontSize: "18px" }}>
                      笔记尚未保存
                    </Title3>
                  </div>
                </DialogTitle>
              </div>
              <Tooltip content="关闭" relationship="label">
                <Button
                  className="dialog-close-btn"
                  appearance="subtle"
                  icon={<Dismiss20Regular />}
                  onClick={() => setShowUnsavedModal(false)}
                  aria-label="关闭"
                  style={{ marginLeft: "auto", flexShrink: 0 }}
                />
              </Tooltip>
            </div>

            <DialogContent style={{ display: "flex", flexDirection: "column", gap: "14px", padding: 0 }}>
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "8px",
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "14px",
                    color: isDark ? "#f4f4f5" : "#0f172a",
                    marginBottom: "4px",
                    wordBreak: "break-word",
                  }}
                >
                  {title.trim() || (isNew ? "新建随笔" : "未命名文档")}
                </div>
                <Caption1 style={{ opacity: 0.65 }}>
                  当前随笔存在尚未保存的改动。若直接退出，未保存的编辑内容将会丢失。
                </Caption1>
              </div>

              {unsavedModalError && (
                <Caption1 style={{ color: isDark ? "#f87171" : "#dc2626", fontSize: "12.5px" }}>
                  {unsavedModalError}
                </Caption1>
              )}
            </DialogContent>

            <DialogActions style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
              <Button appearance="secondary" onClick={() => setShowUnsavedModal(false)}>
                继续编辑
              </Button>
              <Button
                appearance="subtle"
                style={{ color: isDark ? "#f87171" : "#dc2626" }}
                onClick={() => {
                  setIsDirty(false);
                  setShowUnsavedModal(false);
                  navigate(pendingNavPath || "/workspace");
                }}
              >
                放弃修改并退出
              </Button>
              <Button
                appearance="primary"
                disabled={isSaving}
                icon={isSaving ? <Spinner size="tiny" /> : undefined}
                onClick={async () => {
                  if (!title.trim()) {
                    setUnsavedModalError("日记标题不能为空，请先在正文上方输入日记标题");
                    return;
                  }
                  const success = await handleSave(pendingNavPath || "/workspace");
                  if (success) {
                    setShowUnsavedModal(false);
                  }
                }}
              >
                保存并退出
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default MarkdownStudio;
