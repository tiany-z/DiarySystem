import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  ArrowAutofitWidth20Regular,
  ArrowLeft20Regular,
  ArrowRedo20Regular,
  ArrowUndo20Regular,
  ArrowUpload20Regular,
  BranchFork20Regular,
  CheckmarkCircle20Regular,
  Code20Regular,
  Copy20Regular,
  DataPie20Regular,
  Dismiss20Regular,
  DividerShort20Regular,
  Document20Regular,
  DocumentEdit20Regular,
  Eye20Regular,
  Flowchart20Regular,
  Folder20Regular,
  FullScreenMaximize20Regular,
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
  TextHeader420Regular,
  TextHeader520Regular,
  TextHeader620Regular,
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
import { parseMarkdownFile } from "../../components/MarkdownImportModal";
import { useAppDialogMotion } from "../../utils/dialogMotion";
import { formatDate } from "../../components/NoteCard";
import { renderMermaidDiagrams } from "../../utils/markdownDiagrams";
import { ImageLightboxModal } from "../../components/ImageLightboxModal";

export const MarkdownStudio: React.FC = () => {
  const { id: routeId } = useParams<{ id: string }>();
  const [activeId, setActiveId] = useState<string | undefined>(routeId);
  const isNew = !activeId;
  const navigate = useNavigate();
  const { isDark } = useAppTheme();
  const location = useLocation();
  const { surfaceMotion, backdropMotion, isMobile } = useAppDialogMotion();

  useEffect(() => {
    setActiveId(routeId);
  }, [routeId]);

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

  // 编辑器画布宽度模式: "default" (880px), "wider" (1240px), "full" (100% 全宽)
  type EditorWidthMode = "default" | "wider" | "full";
  const [editorWidthMode, setEditorWidthMode] = useState<EditorWidthMode>(() => {
    return (localStorage.getItem("diary_editor_width_mode") as EditorWidthMode) || "default";
  });
  const handleSwitchWidthMode = (mode: EditorWidthMode) => {
    setEditorWidthMode(mode);
    localStorage.setItem("diary_editor_width_mode", mode);
  };

  // 全网页全屏灯箱放大状态 (包含图表与图片)
  const [fullscreenSvg, setFullscreenSvg] = useState<string | null>(null);
  const [fullscreenImg, setFullscreenImg] = useState<{ src: string; alt: string } | null>(null);

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

  // 全屏灯箱开启时监听 Esc 键快速关闭
  useEffect(() => {
    if (!fullscreenSvg && !fullscreenImg) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFullscreenSvg(null);
        setFullscreenImg(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreenSvg, fullscreenImg]);

  // DOM 引用
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const wysiwygRef = useRef<HTMLDivElement>(null);
  const sheetTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importLocalMdRef = useRef<HTMLInputElement>(null);
  const justSavedIdRef = useRef<string | null>(null);

  // 本地 Markdown 文件快速导入当前编辑器
  const handleImportLocalMd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseMarkdownFile(file, text);
      setTitle(parsed.title);
      const newContent = parsed.hasHeadingTitle
        ? parsed.bodyContent || parsed.fullContent
        : parsed.fullContent;
      setContent(newContent);
      setIsDirty(true);
      if (wysiwygRef.current) {
        wysiwygRef.current.innerHTML = markdownToHtml(newContent);
      }
      setSaveSuccessNotice(false);
    } catch (err: any) {
      setErrorMsg(`导入 Markdown 文件失败: ${err.message || String(err)}`);
    } finally {
      e.target.value = "";
    }
  };

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

  // 已删除图片的可撤回状态管理
  interface DeletedImageRecord {
    element: HTMLImageElement;
    parent: HTMLElement;
    nextSibling: Node | null;
    removedParentP?: HTMLElement | null;
  }
  const [lastDeletedImage, setLastDeletedImage] = useState<DeletedImageRecord | null>(null);
  const [showDeletedToast, setShowDeletedToast] = useState<boolean>(false);
  const deletedToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  // 同时必须在挂载瞬间立即重置视口与文档滚动条至 (0,0)，彻底解决移动端从列表页面进入编辑器时继承滚动偏移导致顶部栏移出视口的问题
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    // 微任务确认归零，杜绝潜在的路由转场位移残留
    const rafId = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });

    return () => {
      cancelAnimationFrame(rafId);
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [activeId]);

  // 加载已有日记或初始化
  useEffect(() => {
    if (routeId) {
      if (justSavedIdRef.current === routeId) {
        justSavedIdRef.current = null;
        return;
      }
      const loadDiary = async () => {
        setIsLoading(true);
        try {
          const res = await diaryApi.detail(routeId);
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
    } else {
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
  }, [routeId, location.state]);

  // 当加载完成 (isLoading 变为 false) 或进入 WYSIWYG 模式时，将最新 content 同步进 innerHTML
  useEffect(() => {
    if (!isLoading && editorMode === "wysiwyg" && wysiwygRef.current) {
      const currentMdFromDom = htmlToMarkdown(wysiwygRef.current.innerHTML);
      if (currentMdFromDom.trim() !== content.trim()) {
        wysiwygRef.current.innerHTML = markdownToHtml(content);
      }
    }
  }, [isLoading, editorMode, routeId]);

  // 标题输入框根据文字多行自动自适应高度，杜绝单行横向溢出
  useEffect(() => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = "auto";
      titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
    }
  }, [title]);

  // 当处于 Markdown 源码稿纸模式时，自适应调整 textarea 高度以撑开背景卡片，杜绝底部内容溢出
  useEffect(() => {
    if (editorMode === "sheet" && sheetTextareaRef.current) {
      sheetTextareaRef.current.style.height = "auto";
      sheetTextareaRef.current.style.height = `${Math.max(sheetTextareaRef.current.scrollHeight, 480)}px`;
    }
  }, [content, editorMode]);

  // 所见即所得模式下调度 Mermaid 矢量图表渲染引擎 (支持图表/代码/双显三模态)
  useEffect(() => {
    if (!isLoading && editorMode === "wysiwyg" && wysiwygRef.current) {
      renderMermaidDiagrams(wysiwygRef.current, isDark, (svg) => setFullscreenSvg(svg));
    }
  }, [isLoading, editorMode, isDark, content]);

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

  // 检查某个块级元素是否为空（无任何有效文本且无图片/公式/绘图）
  const isBlockEmpty = (block: HTMLElement): boolean => {
    // 1. 代码块容器或 pre
    if (block.classList.contains("code-block-wrapper") || block.tagName === "PRE") {
      const code = block.querySelector("code");
      return !code || !code.textContent?.trim();
    }
    // 2. Mermaid 矢量图容器
    if (block.classList.contains("mermaid-diagram-container")) {
      const rawCode = block.getAttribute("data-mermaid");
      return !rawCode || !rawCode.trim();
    }
    // 3. KaTeX 公式块
    if (block.classList.contains("katex-block")) {
      const tex = block.getAttribute("data-tex");
      return !tex || !tex.trim();
    }
    // 4. 重点提示 Callout
    if (block.classList.contains("document-callout")) {
      const contentDiv = block.querySelector("div:last-child");
      const text = (contentDiv || block).textContent || "";
      const cleanText = text.replace(/💡|感悟提示：/g, "").replace(/[\u200B\u00A0\s]/g, "");
      return cleanText.length === 0;
    }
    // 5. 若包含插图/Canvas/SVG，不视为空
    if (block.querySelector("img, canvas, svg:not(.mermaid-loading-spinner)")) {
      return false;
    }
    // 6. 普通块过滤零宽空格与空白字符
    const text = block.textContent?.replace(/[\u200B\u00A0\s\r\n]/g, "") || "";
    return text.length === 0;
  };

  // 寻找指定节点内最深层的最后一个文本节点（避开工具条和按钮）
  const findDeepestLastTextNode = (node: Node): { node: Node; offset: number } | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return { node, offset: (node as Text).length };
    }
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const child = node.childNodes[i];
      if (child instanceof HTMLElement) {
        if (
          child.classList.contains("code-block-header") ||
          child.classList.contains("mermaid-diagram-toolbar") ||
          child.classList.contains("image-resizer-handle")
        ) {
          continue;
        }
      }
      const res = findDeepestLastTextNode(child);
      if (res) return res;
    }
    return null;
  };

  // 将光标定位至目标块内部文本的最末尾
  const setCursorAtEndOfBlock = (targetBlock: HTMLElement) => {
    let target: HTMLElement = targetBlock;
    if (targetBlock.classList.contains("code-block-wrapper")) {
      const code = targetBlock.querySelector("code");
      if (code) target = code;
    } else if (targetBlock.classList.contains("document-callout")) {
      const content = targetBlock.querySelector("div:last-child");
      if (content instanceof HTMLElement) target = content;
    }

    targetBlock.focus();
    const sel = window.getSelection();
    if (!sel) return;

    const pos = findDeepestLastTextNode(target);
    const newRange = document.createRange();
    if (pos) {
      newRange.setStart(pos.node, pos.offset);
      newRange.collapse(true);
    } else {
      newRange.selectNodeContents(target);
      newRange.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(newRange);
  };

  // 将光标定位至目标块的最开头
  const setCursorAtStartOfBlock = (targetBlock: HTMLElement) => {
    let target: HTMLElement = targetBlock;
    if (targetBlock.classList.contains("code-block-wrapper")) {
      const code = targetBlock.querySelector("code");
      if (code) target = code;
    } else if (targetBlock.classList.contains("document-callout")) {
      const content = targetBlock.querySelector("div:last-child");
      if (content instanceof HTMLElement) target = content;
    }

    targetBlock.focus();
    const sel = window.getSelection();
    if (!sel) return;

    const newRange = document.createRange();
    newRange.selectNodeContents(target);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  };

  // 判定当前光标是否处于目标块的起始位置
  const isCursorAtStartOfBlock = (block: HTMLElement, range: Range): boolean => {
    try {
      let target: HTMLElement = block;
      if (block.classList.contains("code-block-wrapper")) {
        const code = block.querySelector("code");
        if (code) target = code;
      } else if (block.classList.contains("document-callout")) {
        const content = block.querySelector("div:last-child");
        if (content instanceof HTMLElement) target = content;
      }

      const preRange = document.createRange();
      preRange.setStart(target, 0);
      preRange.setEnd(range.startContainer, range.startOffset);
      const textBefore = preRange.toString().replace(/[\u200B\u00A0\r\n]/g, "");
      const fragment = preRange.cloneContents();
      if (fragment.querySelector("img, svg, canvas, hr, table, input")) {
        return false;
      }
      return textBefore.length === 0;
    } catch {
      return false;
    }
  };

  // 获取挂载在根容器下的顶级块元素
  const getTopLevelBlock = (node: Node | null, root: HTMLElement): HTMLElement | null => {
    let curr: Node | null = node;
    while (curr && curr.parentNode !== root) {
      curr = curr.parentNode;
    }
    return curr instanceof HTMLElement ? curr : null;
  };

  // WYSIWYG 编辑器核心 Backspace 智能块删除与光标回退逻辑
  const handleWysiwygKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Backspace") return;

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !wysiwygRef.current) return;
    const range = sel.getRangeAt(0);

    // 仅接管折叠光标（未圈选高亮文本时），圈选删除仍交由原生安全处理
    if (!range.collapsed) return;

    const root = wysiwygRef.current;
    const anchor = sel.anchorNode;
    if (!anchor || !root.contains(anchor)) return;

    // 找到当前所在的最近语义块级元素与顶级块元素
    const nearestBlock = (
      anchor instanceof HTMLElement ? anchor : anchor.parentElement
    )?.closest(
      "p, h1, h2, h3, h4, h5, h6, li, blockquote, .document-callout, .code-block-wrapper, .mermaid-diagram-container, .katex-block, table, pre"
    ) as HTMLElement | null;

    const topBlock = getTopLevelBlock(anchor, root);
    const currentBlock = nearestBlock || topBlock;
    if (!currentBlock) return;

    // 场景 B: 用户在块内删除，一直按 Backspace 直到块内已无任何文本内容
    if (isBlockEmpty(currentBlock)) {
      e.preventDefault();
      e.stopPropagation();

      // 确定块删除之前的前一个元素
      let prevBlock = currentBlock.previousElementSibling as HTMLElement | null;

      // 特殊情况：如果是 li 且没有前一个 li，则向上寻找 ul/ol 的前一个元素
      if (currentBlock.tagName === "LI" && !prevBlock) {
        const listParent = currentBlock.closest("ul, ol");
        if (listParent) {
          prevBlock = listParent.previousElementSibling as HTMLElement | null;
        }
      }

      // 彻底清除当前空块
      const parentContainer = currentBlock.parentElement;
      currentBlock.remove();

      // 如果是列表且列表项全部清空了，一并移除父级 ul/ol
      if (
        parentContainer &&
        (parentContainer.tagName === "UL" || parentContainer.tagName === "OL") &&
        parentContainer.children.length === 0
      ) {
        parentContainer.remove();
      }

      // 光标走到块删除之前的位置开始往前删除
      if (prevBlock && root.contains(prevBlock)) {
        setCursorAtEndOfBlock(prevBlock);
      } else {
        // 若前面无任何块，确保编辑器根部保留一个干净的空段落
        if (!root.firstElementChild) {
          const p = document.createElement("p");
          p.innerHTML = "<br>";
          root.appendChild(p);
          setCursorAtEndOfBlock(p);
        } else {
          setCursorAtEndOfBlock(root.firstElementChild as HTMLElement);
        }
      }

      handleWysiwygInput();
      return;
    }

    // 场景 A: 光标处于当前块的最开头位置，检查前面紧邻的块
    if (isCursorAtStartOfBlock(currentBlock, range)) {
      let prevBlock = currentBlock.previousElementSibling as HTMLElement | null;
      if (currentBlock.tagName === "LI" && !prevBlock) {
        const listParent = currentBlock.closest("ul, ol");
        if (listParent) {
          prevBlock = listParent.previousElementSibling as HTMLElement | null;
        }
      }

      if (prevBlock && root.contains(prevBlock)) {
        e.preventDefault();
        e.stopPropagation();

        // 子场景 A1: 如果前面的块没有内容，则直接把前面的块删掉
        if (isBlockEmpty(prevBlock)) {
          prevBlock.remove();
          setCursorAtStartOfBlock(currentBlock);
          handleWysiwygInput();
          return;
        }

        // 子场景 A2: 如果前面的块有内容，则进入前面块的内部文本后面开始删除
        // 如果当前行是多余空段落，则先行移除当前空行
        if (currentBlock.tagName === "P" && isBlockEmpty(currentBlock)) {
          currentBlock.remove();
        }

        // 进入前方块内部文本的末尾
        setCursorAtEndOfBlock(prevBlock);
        handleWysiwygInput();
        return;
      }
    }
  };

  // 双击图片直接唤起全网页高清灯箱
  const handleWysiwygDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      e.stopPropagation();
      const img = target as HTMLImageElement;
      setFullscreenImg({ src: img.src, alt: img.alt || "随笔插图" });
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

  // 按 Esc 键取消图片选中；按 Backspace / Delete 快捷删除选中的图片；Ctrl+Z 优先撤销图片删除
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (selectedImg) {
        if (e.key === "Escape") {
          e.preventDefault();
          deselectImage();
          return;
        }
        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          handleDeleteSelectedImage();
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        if (lastDeletedImage && editorMode === "wysiwyg") {
          e.preventDefault();
          handleUndo();
          return;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDownGlobal);
    return () => window.removeEventListener("keydown", handleKeyDownGlobal);
  }, [selectedImg, lastDeletedImage, editorMode]);

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

  // 删除当前选中的图片（记录撤回信息，支持 Undo 恢复原位置与样式）
  const handleDeleteSelectedImage = () => {
    if (!selectedImg) return;
    const parent = selectedImg.parentElement;
    const nextSibling = selectedImg.nextSibling;
    let removedParentP: HTMLElement | null = null;

    const imgToSave = selectedImg;
    imgToSave.classList.remove("selected-editable-img");

    selectedImg.remove();
    if (parent && parent.tagName === "P" && !parent.textContent?.trim() && !parent.children.length) {
      removedParentP = parent;
      parent.remove();
    }

    setLastDeletedImage({
      element: imgToSave,
      parent: parent || (wysiwygRef.current as HTMLElement),
      nextSibling,
      removedParentP,
    });
    setShowDeletedToast(true);
    if (deletedToastTimerRef.current) clearTimeout(deletedToastTimerRef.current);
    deletedToastTimerRef.current = setTimeout(() => {
      setShowDeletedToast(false);
    }, 6000);

    setSelectedImg(null);
    setImgOverlayPos(null);
    handleWysiwygInput();
    setIsDirty(true);
  };

  // 撤销操作（优先撤回被删除的图片，无待撤回图片时调用原生撤销）
  const handleUndo = () => {
    if (lastDeletedImage && editorMode === "wysiwyg") {
      const { element, parent, nextSibling, removedParentP } = lastDeletedImage;
      if (removedParentP) {
        removedParentP.appendChild(element);
        if (wysiwygRef.current) {
          wysiwygRef.current.appendChild(removedParentP);
        }
      } else if (parent && wysiwygRef.current?.contains(parent)) {
        if (nextSibling && parent.contains(nextSibling)) {
          parent.insertBefore(element, nextSibling);
        } else {
          parent.appendChild(element);
        }
      } else if (wysiwygRef.current) {
        wysiwygRef.current.appendChild(element);
      }
      setLastDeletedImage(null);
      setShowDeletedToast(false);
      handleWysiwygInput();
      setIsDirty(true);
      setTimeout(() => {
        selectImage(element);
      }, 50);
      return;
    }

    if (editorMode === "wysiwyg") {
      if (wysiwygRef.current) {
        wysiwygRef.current.focus();
      }
      document.execCommand("undo", false);
      handleWysiwygInput();
    } else if (editorMode === "sheet") {
      if (sheetTextareaRef.current) {
        sheetTextareaRef.current.focus();
      }
      document.execCommand("undo", false);
    }
  };

  // 重做操作
  const handleRedo = () => {
    if (editorMode === "wysiwyg") {
      if (wysiwygRef.current) {
        wysiwygRef.current.focus();
      }
      document.execCommand("redo", false);
      handleWysiwygInput();
    } else if (editorMode === "sheet") {
      if (sheetTextareaRef.current) {
        sheetTextareaRef.current.focus();
      }
      document.execCommand("redo", false);
    }
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

  // 稿纸模式下的 Markdown 语法包裹处理
  const applySheetWrap = (beforeText: string, afterText: string = beforeText, defaultPlaceholder: string = "") => {
    if (!sheetTextareaRef.current) return;
    const ta = sheetTextareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;
    const selected = val.substring(start, end);
    const targetText = selected || defaultPlaceholder;
    const replacement = `${beforeText}${targetText}${afterText}`;
    const nextVal = val.substring(0, start) + replacement + val.substring(end);
    setContent(nextVal);
    setIsDirty(true);
    setTimeout(() => {
      ta.focus();
      if (!selected && defaultPlaceholder) {
        ta.setSelectionRange(start + beforeText.length, start + beforeText.length + defaultPlaceholder.length);
      } else {
        ta.setSelectionRange(start + replacement.length, start + replacement.length);
      }
    }, 10);
  };

  // 稿纸模式下的行前缀语法（标题、引用、列表）
  const applySheetLinePrefix = (prefix: string, stripExistingPrefixRegex?: RegExp) => {
    if (!sheetTextareaRef.current) return;
    const ta = sheetTextareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;

    const lineStart = val.lastIndexOf("\n", start - 1) + 1;
    let lineEnd = val.indexOf("\n", end);
    if (lineEnd === -1) lineEnd = val.length;

    const selectedLines = val.substring(lineStart, lineEnd);
    const lines = selectedLines.split("\n");
    const newLines = lines.map((line, idx) => {
      let cleaned = line;
      if (stripExistingPrefixRegex) {
        cleaned = cleaned.replace(stripExistingPrefixRegex, "");
      }
      if (prefix === "1. ") {
        return `${idx + 1}. ${cleaned}`;
      }
      return `${prefix}${cleaned}`;
    });

    const replacement = newLines.join("\n");
    const nextVal = val.substring(0, lineStart) + replacement + val.substring(lineEnd);
    setContent(nextVal);
    setIsDirty(true);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(lineStart, lineStart + replacement.length);
    }, 10);
  };

  // 富文本与 Markdown 稿纸双模态格式化辅助指令
  const executeDocCommand = (command: string, value: string | undefined = undefined) => {
    if (editorMode === "sheet") {
      if (command === "bold") {
        applySheetWrap("**", "**", "加粗文本");
      } else if (command === "italic") {
        applySheetWrap("*", "*", "斜体文本");
      } else if (command === "underline") {
        applySheetWrap("<u>", "</u>", "下划线文本");
      } else if (command === "strikeThrough") {
        applySheetWrap("~~", "~~", "删除线文本");
      } else if (command === "insertUnorderedList") {
        applySheetLinePrefix("- ", /^[-*+]\s+/);
      } else if (command === "insertOrderedList") {
        applySheetLinePrefix("1. ", /^\d+\.\s+/);
      } else if (command === "formatBlock") {
        const val = value?.toLowerCase() || "";
        if (val.includes("h1")) {
          applySheetLinePrefix("# ", /^#{1,6}\s+/);
        } else if (val.includes("h2")) {
          applySheetLinePrefix("## ", /^#{1,6}\s+/);
        } else if (val.includes("h3")) {
          applySheetLinePrefix("### ", /^#{1,6}\s+/);
        } else if (val.includes("h4")) {
          applySheetLinePrefix("#### ", /^#{1,6}\s+/);
        } else if (val.includes("h5")) {
          applySheetLinePrefix("##### ", /^#{1,6}\s+/);
        } else if (val.includes("h6")) {
          applySheetLinePrefix("###### ", /^#{1,6}\s+/);
        } else if (val.includes("blockquote")) {
          applySheetLinePrefix("> ", /^>\s+/);
        } else if (val.includes("p")) {
          applySheetLinePrefix("", /^#{1,6}\s+|^>\s+|^[-*+]\s+|^\d+\.\s+/);
        }
      } else if (command === "undo") {
        handleUndo();
      } else if (command === "redo") {
        handleRedo();
      }
      return;
    }

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
      setErrorMsg("请选择合法的图片格式");
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

  // 插入表格（支持富文本与稿纸 Markdown 源码双模态）
  const handleInsertTable = () => {
    if (editorMode === "sheet" && sheetTextareaRef.current) {
      const ta = sheetTextareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;

      let mdTable = "\n\n";
      mdTable += "| " + Array.from({ length: tableCols }, (_, i) => `表头 ${i + 1}`).join(" | ") + " |\n";
      mdTable += "| " + Array.from({ length: tableCols }, () => "---").join(" | ") + " |\n";
      for (let r = 0; r < Math.max(1, tableRows - 1); r++) {
        mdTable += "| " + Array.from({ length: tableCols }, (_, i) => `单元格 ${r + 1}-${i + 1}`).join(" | ") + " |\n";
      }
      mdTable += "\n";

      const nextVal = val.substring(0, start) + mdTable + val.substring(end);
      setContent(nextVal);
      setIsDirty(true);
      setTableModalOpen(false);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + mdTable.length, start + mdTable.length);
      }, 10);
      return;
    }

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
    if (editorMode === "sheet" && sheetTextareaRef.current) {
      applySheetWrap("\n- [ ] ", "\n", "待办事项内容");
      return;
    }
    const todoHtml = `<ul><li style="list-style: none;"><input type="checkbox" /> 待办事项...</li></ul><p><br></p>`;
    insertCustomHtml(todoHtml);
  };

  // 插入重点提示卡片 (Callout)
  const handleInsertCallout = () => {
    if (editorMode === "sheet" && sheetTextareaRef.current) {
      applySheetWrap("\n> 💡 **感悟提示：** ", "\n\n", "在此输入重点感悟或心得随想...");
      return;
    }
    const calloutHtml = `<div class="document-callout"><div>💡</div><div><strong>感悟提示：</strong>在此输入重点感悟或心得随想...</div></div><p><br></p>`;
    insertCustomHtml(calloutHtml);
  };

  // 插入代码卡片
  const handleInsertCodeCard = () => {
    if (editorMode === "sheet" && sheetTextareaRef.current) {
      applySheetWrap("\n```javascript\n// 请在此输入代码示例\nfunction createMoment() {\n  return \"Focus & Clarity\";\n}\n", "\n```\n\n");
      return;
    }
    const codeHtml = `<pre><code>// 请在此输入代码示例\nfunction createMoment() {\n  return "Focus & Clarity";\n}</code></pre><p><br></p>`;
    insertCustomHtml(codeHtml);
  };

  // 插入 Mermaid 代码矢量图表
  const handleInsertMermaid = (chartType: "flowchart" | "sequence" | "pie" | "gantt") => {
    let mermaidCode = "";
    if (chartType === "flowchart") {
      mermaidCode = `graph TD\n    A[开始灵感] --> B{方案可行性评估}\n    B -->|通过| C[编写代码与实现]\n    B -->|待优化| D[深度反思与调整]\n    C --> E[交付并沉淀手记]\n    D --> B`;
    } else if (chartType === "sequence") {
      mermaidCode = `sequenceDiagram\n    autonumber\n    actor 用户 as 👤 用户\n    participant 前端 as 💻 前端界面\n    participant 服务 as ⚡ 后端核心\n    participant 数据库 as 🗄️ MySQL\n\n    用户->>前端: 编写日记并提交保存\n    前端->>服务: POST /api/diaries (JWT 鉴权)\n    服务->>数据库: 写入 diaries 记录\n    数据库-->>服务: 返回成功\n    服务-->>前端: 200 OK\n    前端-->>用户: 呈现保存成功提示`;
    } else if (chartType === "pie") {
      mermaidCode = `pie title 今日精力与专注分布\n    "深度编码" : 45\n    "技术复盘与写作" : 25\n    "架构设计" : 15\n    "生活与漫步" : 15`;
    } else if (chartType === "gantt") {
      mermaidCode = `gantt\n    title 项目开发与写作节奏规划\n    dateFormat YYYY-MM-DD\n    section 核心开发\n    架构设计与演进 :done, des1, 2026-09-10, 2026-09-12\n    图表渲染与预览 :active, des2, 2026-09-13, 2026-09-15\n    section 沉淀与发布\n    撰写系统设计手记 : 2026-09-16, 3d`;
    }

    if (editorMode === "sheet" && sheetTextareaRef.current) {
      const textarea = sheetTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const prev = textarea.value;
      const snippet = `\n\n\`\`\`mermaid\n${mermaidCode}\n\`\`\`\n\n`;
      const next = prev.slice(0, start) + snippet + prev.slice(end);
      setContent(next);
      setRawSourceBuffer(next);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + snippet.length, start + snippet.length);
      }, 50);
      return;
    }

    const encoded = encodeURIComponent(mermaidCode.trim());
    const mermaidHtml = `<div class="mermaid-diagram-container" data-mermaid="${encoded}"><div class="mermaid-loading-state"><span class="mermaid-loading-spinner"></span>正在绘制图表...</div></div><p><br></p>`;
    insertCustomHtml(mermaidHtml);
    setTimeout(() => {
      if (wysiwygRef.current) {
        renderMermaidDiagrams(wysiwygRef.current, isDark, (svg) => setFullscreenSvg(svg));
      }
    }, 60);
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
          const newId = String(res.data.id);
          setActiveId(newId);
          setIsDirty(false);
          setSaveSuccessNotice(true);
          setTimeout(() => setSaveSuccessNotice(false), 3000);
          justSavedIdRef.current = newId;
          if (redirectUrl) {
            navigate(redirectUrl);
          } else {
            // 使用 replaceState 更新浏览器地址栏，不触发 React Router 路由重载和页面进入动画，保持滚动位置
            window.history.replaceState(null, "", `/workspace/edit/${newId}`);
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
          id: (activeId || routeId)!,
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
      <div className="fluent-page-center-loader">
        <Spinner size="large" label="正在加载文档..." />
      </div>
    );
  }

  return (
    <div className="document-workspace">
      {/* Top Document Studio Navigation Bar (Fluent 2 现代顶栏 - 响应式适配与绝对吸顶) */}
      <div
        className="glass-panel studio-topbar win10-tile-rise win10-delay-1"
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: "0 1 auto" }}>
          <Tooltip content="返回笔记" relationship="label">
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
              aria-label="返回笔记"
            />
          </Tooltip>

          <Divider vertical className="desktop-only" style={{ height: "20px" }} />

          <Text
            weight="semibold"
            className="desktop-only"
            style={{
              fontSize: "14px",
              opacity: 0.85,
              minWidth: 0,
              maxWidth: "clamp(200px, 38vw, 680px)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={title.trim() || (isNew ? "新建笔记" : "未命名")}
          >
            {title.trim() || (isNew ? "新建笔记" : "未命名")}
          </Text>
        </div>

        {/* Right: Mode controls & Actions (Desktop & Mobile, 整体靠右对齐) */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto", flexShrink: 0 }}>
          {/* Document Mode Selector (编辑/稿纸/预览) & 画布宽度调整 (Desktop) */}
          <div className="desktop-only" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "2px",
                borderRadius: "8px",
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
                border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
                gap: "2px",
              }}
            >
              <Tooltip content="编辑" relationship="label">
                <Button
                  appearance={editorMode === "wysiwyg" ? "primary" : "subtle"}
                  size="small"
                  icon={<DocumentEdit20Regular />}
                  onClick={() => handleSwitchMode("wysiwyg")}
                  aria-label="编辑"
                />
              </Tooltip>
              <Tooltip content="稿纸" relationship="label">
                <Button
                  appearance={editorMode === "sheet" ? "primary" : "subtle"}
                  size="small"
                  icon={<Document20Regular />}
                  onClick={() => handleSwitchMode("sheet")}
                  aria-label="稿纸"
                />
              </Tooltip>
              <Tooltip content="预览" relationship="label">
                <Button
                  appearance={editorMode === "preview" ? "primary" : "subtle"}
                  size="small"
                  icon={<Eye20Regular />}
                  onClick={() => handleSwitchMode("preview")}
                  aria-label="预览"
                />
              </Tooltip>
            </div>

            {/* Width Mode Selector (标准/宽屏/全宽三档切换) */}
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <Tooltip content="画布宽度调整" relationship="label">
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<ArrowAutofitWidth20Regular />}
                    aria-label="调整画布宽度"
                  />
                </Tooltip>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem
                    icon={editorWidthMode === "default" ? <CheckmarkCircle20Regular style={{ color: "#5B7B8D" }} /> : undefined}
                    onClick={() => handleSwitchWidthMode("default")}
                  >
                    标准宽度
                  </MenuItem>
                  <MenuItem
                    icon={editorWidthMode === "wider" ? <CheckmarkCircle20Regular style={{ color: "#5B7B8D" }} /> : undefined}
                    onClick={() => handleSwitchWidthMode("wider")}
                  >
                    宽屏模式
                  </MenuItem>
                  <MenuItem
                    icon={editorWidthMode === "full" ? <CheckmarkCircle20Regular style={{ color: "#5B7B8D" }} /> : undefined}
                    onClick={() => handleSwitchWidthMode("full")}
                  >
                    全宽铺满
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>

            <Divider vertical style={{ height: "20px", margin: "0 2px" }} />
          </div>

          {/* Actions (Desktop) */}
          <div className="desktop-only" style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            {/* Import Local Markdown File */}
            <input
              type="file"
              ref={importLocalMdRef}
              accept=".md,.markdown,text/markdown,text/plain"
              style={{ display: "none" }}
              onChange={handleImportLocalMd}
            />
            <Tooltip content="导入 Markdown" relationship="label">
              <Button
                appearance="subtle"
                size="small"
                icon={<ArrowUpload20Regular />}
                onClick={() => importLocalMdRef.current?.click()}
                aria-label="导入"
              />
            </Tooltip>

            {/* View Raw Markdown Source */}
            <Tooltip content="Markdown 源码" relationship="label">
              <Button
                appearance="subtle"
                size="small"
                icon={<Code20Regular />}
                onClick={handleOpenSourceModal}
                aria-label="源码"
              />
            </Tooltip>

            {/* Top Visibility Quick Toggle */}
            <Tooltip
              content={isPublic ? "公开" : "私密"}
              relationship="label"
            >
              <Button
                appearance="subtle"
                size="small"
                icon={
                  isPublic ? (
                    <Globe20Regular style={{ color: "#5B7B8D" }} />
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

            {/* Save Button with Unsaved Dot Indicator */}
            <div className="save-btn-container">
              <Tooltip content={isSaving ? "正在保存..." : isDirty ? "有修改未保存，点击保存" : "保存"} relationship="label">
                <Button
                  appearance="primary"
                  size="small"
                  icon={isSaving ? undefined : <Save20Regular />}
                  onClick={() => handleSave()}
                  disabled={isSaving}
                  aria-label="保存"
                  style={{
                    borderRadius: "8px",
                    boxShadow: "0 2px 10px rgba(91, 123, 141, 0.28)",
                    flexShrink: 0,
                    minWidth: isSaving ? "64px" : "68px",
                    height: "32px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isSaving ? (
                    <Spinner size="tiny" style={{ margin: "0 auto" }} />
                  ) : (
                    <span className="desktop-save-btn-text">保存</span>
                  )}
                </Button>
              </Tooltip>
              {isDirty && !isSaving && (
                <span className="save-btn-dirty-dot" title="有修改未保存" />
              )}
            </div>
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
                  {isUploadingImage ? "正在上传..." : "上传图片"}
                </MenuItem>
                <MenuItem
                  icon={isPublic ? <Globe20Regular /> : <LockClosed20Regular />}
                  onClick={() => {
                    setIsPublic(!isPublic);
                    setIsDirty(true);
                  }}
                >
                  {isPublic ? "设为私密" : "设为公开"}
                </MenuItem>
                <MenuItem icon={<Code20Regular />} onClick={handleOpenSourceModal}>
                  Markdown 源码
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>

          {/* Save Button (Mobile) */}
          <div className="save-btn-container">
            <Tooltip content={isSaving ? "正在保存..." : isDirty ? "有修改未保存，点击保存" : "保存"} relationship="label">
              <Button
                appearance="primary"
                size="small"
                icon={isSaving ? undefined : <Save20Regular />}
                onClick={() => handleSave()}
                disabled={isSaving}
                aria-label="保存"
                style={{
                  borderRadius: "8px",
                  flexShrink: 0,
                  width: "32px",
                  height: "32px",
                  minWidth: "32px",
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(91, 123, 141, 0.28)",
                }}
              >
                {isSaving ? <Spinner size="tiny" style={{ margin: "0 auto" }} /> : null}
              </Button>
            </Tooltip>
            {isDirty && !isSaving && (
              <span className="save-btn-dirty-dot" title="有修改未保存" />
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Modern Fluent 2 Document Ribbon (文档格式功能区 - 置顶吸顶与移动端滑动) */}
      {editorMode !== "preview" && (
        <div
          className="glass-panel studio-ribbon win10-tile-rise win10-delay-2"
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
          {/* 撤销与重做 */}
          <Tooltip content="撤销" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowUndo20Regular />}
              onClick={handleUndo}
              aria-label="撤销"
            />
          </Tooltip>
          <Tooltip content="重做" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowRedo20Regular />}
              onClick={handleRedo}
              aria-label="重做"
            />
          </Tooltip>

          <Divider vertical style={{ height: "18px", margin: "0 4px" }} />

          {/* Headings & Blocks - 纯图标化 H1~H6 全量支持 */}
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
          <Tooltip content="四级标题" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<TextHeader420Regular />}
              onClick={() => executeDocCommand("formatBlock", "<h4>")}
              aria-label="四级标题"
            />
          </Tooltip>
          <Tooltip content="五级标题" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<TextHeader520Regular />}
              onClick={() => executeDocCommand("formatBlock", "<h5>")}
              aria-label="五级标题"
            />
          </Tooltip>
          <Tooltip content="六级标题" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<TextHeader620Regular />}
              onClick={() => executeDocCommand("formatBlock", "<h6>")}
              aria-label="六级标题"
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
          {/* 插入代码图表 (Mermaid) 下拉菜单 */}
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Tooltip content="插入图表" relationship="label">
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<Flowchart20Regular />}
                  aria-label="插入图表"
                />
              </Tooltip>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem
                  icon={<Flowchart20Regular />}
                  onClick={() => handleInsertMermaid("flowchart")}
                >
                  流程图
                </MenuItem>
                <MenuItem
                  icon={<BranchFork20Regular />}
                  onClick={() => handleInsertMermaid("sequence")}
                >
                  时序图
                </MenuItem>
                <MenuItem
                  icon={<DataPie20Regular />}
                  onClick={() => handleInsertMermaid("pie")}
                >
                  饼图
                </MenuItem>
                <MenuItem
                  icon={<History20Regular />}
                  onClick={() => handleInsertMermaid("gantt")}
                >
                  甘特图
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
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
        <div ref={sheetRef} className={`document-sheet sheet-width-${editorWidthMode} win10-tile-rise win10-delay-3`}>
          {/* Document Header: Title Input (巨幅无边框优雅多行自适应大标题，按 Enter 键聚焦正文) */}
          <textarea
            ref={titleTextareaRef}
            className="document-title-input"
            rows={1}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsDirty(true);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (editorMode === "wysiwyg" && wysiwygRef.current) {
                  wysiwygRef.current.focus();
                } else if (editorMode === "sheet" && sheetTextareaRef.current) {
                  sheetTextareaRef.current.focus();
                }
              }
            }}
            placeholder="在此键入随笔或文档大标题..."
          />

          {/* Document Header: Meta Attributes Bar (仅在桌面端正文顶部显示，移动端移至固定底部栏) */}
          <div className="document-meta-row desktop-only">
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
                      ? "1px solid rgba(91, 123, 141, 0.35)"
                      : isDark
                      ? "1px solid rgba(255, 255, 255, 0.14)"
                      : "1px solid rgba(0, 0, 0, 0.14)",
                    background: isPublic
                      ? isDark
                        ? "rgba(91, 123, 141, 0.22)"
                        : "rgba(91, 123, 141, 0.1)"
                      : isDark
                      ? "rgba(255, 255, 255, 0.06)"
                      : "rgba(0, 0, 0, 0.04)",
                    color: isPublic ? (isDark ? "#8EAEC0" : "#5B7B8D") : isDark ? "rgba(255, 255, 255, 0.75)" : "#605e5c",
                    borderRadius: "16px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  aria-label="切换笔记公开或私密状态"
                >
                  {isPublic ? (
                    <Globe20Regular style={{ fontSize: "14px", color: isDark ? "#8EAEC0" : "#5B7B8D" }} />
                  ) : (
                    <LockClosed20Regular style={{ fontSize: "14px" }} />
                  )}
                  <span>{isPublic ? "公开可见" : "仅自己可见"}</span>
                </button>
              </Tooltip>

              {createdAt && (
                <span className="meta-capsule-chip">
                  📅 {formatDate(createdAt)}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Tooltip content={`总计 ${stats.chars} 字符`} relationship="label">
                <span className="meta-capsule-chip">📝 {stats.chars}</span>
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
              onDoubleClick={handleWysiwygDoubleClick}
              onKeyDown={handleWysiwygKeyDown}
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
                  border: "2px solid #5B7B8D",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                  boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.4)",
                }}
              />

              {/* 浮动快捷排版工具栏 (两行布局：第一行百分比，第二行其他文字按钮) */}
              <div
                className="image-floating-toolbar"
                style={{
                  bottom: "calc(100% + 8px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  pointerEvents: "auto",
                  backgroundColor: isDark ? "rgba(28, 28, 35, 0.96)" : "rgba(255, 255, 255, 0.98)",
                  backdropFilter: "blur(20px)",
                  border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.08)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* 第一行：百分比尺寸选项 */}
                <div className="image-toolbar-row">
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
                </div>

                {/* 第二行：其他文字按钮 (对齐与操作) */}
                <div className="image-toolbar-row">
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

                  <span className="image-toolbar-divider" />

                  <button
                    type="button"
                    className="image-toolbar-btn"
                    onClick={() => {
                      if (selectedImg) {
                        setFullscreenImg({ src: selectedImg.src, alt: selectedImg.alt || "随笔插图" });
                      }
                    }}
                    title="全屏放大查看"
                  >
                    放大
                  </button>

                  <button
                    type="button"
                    className="image-toolbar-btn image-toolbar-btn-delete"
                    onClick={handleDeleteSelectedImage}
                    title="删除图片"
                  >
                    删除
                  </button>
                </div>
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
      <Dialog
        open={tableModalOpen}
        onOpenChange={(_, d) => setTableModalOpen(d.open)}
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
            maxWidth: isMobile ? "100vw" : "440px",
            minWidth: isMobile ? "100vw" : undefined,
            width: isMobile ? "100vw" : "90vw",
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
            border: isMobile ? "none" : (isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)"),
            boxShadow: isMobile
              ? "none"
              : (isDark
                ? "0 28px 72px rgba(0, 0, 0, 0.65), 0 6px 24px rgba(0, 0, 0, 0.4)"
                : "0 24px 64px rgba(0, 0, 0, 0.22), 0 4px 18px rgba(0, 0, 0, 0.08)"),
          }}
        >
          <DialogBody style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden", width: "100%" }}>
            {/* Header - 固定顶部 */}
            <header className="dialog-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "16px", flexShrink: 0 }}>
              <div className="dialog-header-title" style={{ flex: 1, minWidth: 0 }}>
                <DialogTitle style={{ padding: 0, margin: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Table20Regular style={{ color: "#5B7B8D" }} />
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
            </header>

            <DialogContent style={{ display: "flex", flexDirection: "column", gap: "18px", padding: 0, flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
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
                <Caption1 style={{ fontWeight: 600, color: "#5B7B8D" }}>
                  共 {tableRows * tableCols} 个单元格
                </Caption1>
              </div>
            </DialogContent>

            {/* Footer Actions - 固定底部 */}
            <footer className="dialog-footer-row" style={{ flexShrink: 0, width: "100%" }}>
              <DialogActions style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px", padding: 0, flexShrink: 0 }}>
                <Button appearance="secondary" onClick={() => setTableModalOpen(false)}>
                  取消
                </Button>
                <Button
                  appearance="primary"
                  onClick={handleInsertTable}
                  style={{
                    backgroundColor: "#5B7B8D",
                    fontWeight: 600,
                  }}
                >
                  确定
                </Button>
              </DialogActions>
            </footer>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Markdown Source Inspector Dialog (源码检视弹窗) */}
      <Dialog
        open={sourceModalOpen}
        onOpenChange={(_, d) => setSourceModalOpen(d.open)}
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
            maxWidth: isMobile ? "100vw" : "840px",
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
            border: isMobile ? "none" : (isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)"),
            boxShadow: isMobile
              ? "none"
              : (isDark
                ? "0 28px 72px rgba(0, 0, 0, 0.65), 0 6px 24px rgba(0, 0, 0, 0.4)"
                : "0 24px 64px rgba(0, 0, 0, 0.22), 0 4px 18px rgba(0, 0, 0, 0.08)"),
          }}
        >
          <DialogBody style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden", width: "100%" }}>
            {/* Header - 固定顶部 */}
            <header className="dialog-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "16px", flexShrink: 0 }}>
              <div className="dialog-header-title" style={{ flex: 1, minWidth: 0 }}>
                <DialogTitle style={{ padding: 0, margin: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Code20Regular style={{ color: "#5B7B8D" }} />
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
            </header>

            <DialogContent style={{ display: "flex", flexDirection: "column", gap: "12px", padding: 0, flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
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

            {/* Footer Actions - 固定底部 */}
            <footer className="dialog-footer-row" style={{ flexShrink: 0, width: "100%" }}>
              <DialogActions style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", padding: 0, flexShrink: 0 }}>
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
                  <Button
                    appearance="primary"
                    onClick={handleApplySourceModal}
                    style={{
                      backgroundColor: "#5B7B8D",
                      fontWeight: 600,
                    }}
                  >
                    确定
                  </Button>
                </div>
              </DialogActions>
            </footer>
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
            maxWidth: isMobile ? "100vw" : "460px",
            minWidth: isMobile ? "100vw" : undefined,
            width: isMobile ? "100vw" : "90vw",
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
            border: isMobile ? "none" : (isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)"),
            boxShadow: isMobile
              ? "none"
              : (isDark
                ? "0 28px 72px rgba(0, 0, 0, 0.65), 0 6px 24px rgba(0, 0, 0, 0.4)"
                : "0 24px 64px rgba(0, 0, 0, 0.22), 0 4px 18px rgba(0, 0, 0, 0.08)"),
          }}
        >
          <DialogBody style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden", width: "100%" }}>
            {/* Header - 固定顶部 */}
            <header className="dialog-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "16px", flexShrink: 0 }}>
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
            </header>

            <DialogContent style={{ display: "flex", flexDirection: "column", gap: "14px", padding: 0, flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
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

            {/* Footer Actions - 固定底部 */}
            <footer className="dialog-footer-row" style={{ flexShrink: 0, width: "100%" }}>
              <DialogActions style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px", flexWrap: "wrap", flexShrink: 0 }}>
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
                  style={{
                    backgroundColor: "#5B7B8D",
                    fontWeight: 600,
                  }}
                >
                  保存并退出
                </Button>
              </DialogActions>
            </footer>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Mobile Sticky Bottom Status Bar (移动端/窄屏模式固定底部栏) */}
      <footer className="studio-mobile-bottom-bar mobile-only">
        {/* 左下角：天气和心情胶囊（去掉边框） */}
        <div className="studio-bottom-left" style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}>
          <WeatherPicker
            value={weather}
            onChange={(w) => {
              setWeather(w);
              setIsDirty(true);
            }}
            borderless
            size="small"
          />
          <MoodPicker
            value={mood}
            onChange={(m) => {
              setMood(m);
              setIsDirty(true);
            }}
            borderless
            size="small"
          />
        </div>

        {/* 右下角：时间、是否公开、总字数（已阅读时间已去除） */}
        <div className="studio-bottom-right" style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 }}>
          {/* 时间 */}
          <span
            className="studio-bottom-date"
            style={{
              fontSize: "11px",
              opacity: 0.65,
              fontWeight: 500,
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            📅 {createdAt ? formatDate(createdAt) : formatDate(new Date().toISOString())}
          </span>

          {/* 是否公开 */}
          <button
            type="button"
            onClick={() => {
              setIsPublic(!isPublic);
              setIsDirty(true);
            }}
            style={{
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              border: isPublic
                ? "1px solid rgba(91, 123, 141, 0.35)"
                : isDark
                ? "1px solid rgba(255, 255, 255, 0.14)"
                : "1px solid rgba(0, 0, 0, 0.12)",
              background: isPublic
                ? isDark
                  ? "rgba(91, 123, 141, 0.22)"
                  : "rgba(91, 123, 141, 0.1)"
                : isDark
                ? "rgba(255, 255, 255, 0.06)"
                : "rgba(0, 0, 0, 0.04)",
              color: isPublic ? (isDark ? "#8EAEC0" : "#5B7B8D") : isDark ? "rgba(255, 255, 255, 0.75)" : "#605e5c",
              borderRadius: "12px",
              padding: "2px 7px",
              fontSize: "11px",
              fontWeight: 600,
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              whiteSpace: "nowrap",
            }}
            aria-label="切换公开状态"
          >
            {isPublic ? (
              <Globe20Regular style={{ fontSize: "13px", color: isDark ? "#8EAEC0" : "#5B7B8D" }} />
            ) : (
              <LockClosed20Regular style={{ fontSize: "13px" }} />
            )}
            <span>{isPublic ? "公开" : "私密"}</span>
          </button>

          {/* 总字数 */}
          <span
            style={{
              fontSize: "11px",
              opacity: 0.8,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            📝 {stats.chars}
          </span>
        </div>
      </footer>

      {/* 全网页全屏高清灯箱：支持 Ctrl+滚轮无污染缩放与鼠标拖拽平移 */}
      <ImageLightboxModal
        open={Boolean(fullscreenSvg || fullscreenImg)}
        onClose={() => {
          setFullscreenSvg(null);
          setFullscreenImg(null);
        }}
        imageSrc={fullscreenImg?.src}
        imageAlt={fullscreenImg?.alt}
        svgHtml={fullscreenSvg}
      />

      {/* 删除图片快捷撤销浮条 */}
      {showDeletedToast && lastDeletedImage && (
        <div className="image-undo-toast">
          <span style={{ fontSize: "13px" }}>已删除选中的图片</span>
          <Button
            appearance="primary"
            size="small"
            icon={<ArrowUndo20Regular />}
            onClick={handleUndo}
            style={{
              backgroundColor: "#5B7B8D",
              borderRadius: "6px",
              height: "28px",
              padding: "0 12px",
            }}
          >
            撤回
          </Button>
          <Button
            appearance="subtle"
            size="small"
            icon={<Dismiss20Regular style={{ color: "#ffffff" }} />}
            onClick={() => setShowDeletedToast(false)}
            style={{ minWidth: "24px", padding: "0 4px" }}
          />
        </div>
      )}
    </div>
  );
};

export default MarkdownStudio;
