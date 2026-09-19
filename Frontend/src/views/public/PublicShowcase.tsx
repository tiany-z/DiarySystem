import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Body1,
  Button,
  Caption1,
  Input,
  Tab,
  TabList,
  Spinner,
  Title2,
} from "@fluentui/react-components";
import {
  Add20Filled,
  ArrowSync20Regular,
  Filter20Regular,
  Search20Regular,
} from "@fluentui/react-icons";
import { diaryApi, DiaryItem } from "../../api/diary";
import { NoteCard } from "../../components/NoteCard";
import { NoteReaderModal } from "../../components/NoteReaderModal";
import { Win10AnimatedGrid } from "../../components/Win10AnimatedGrid";
import { getAllMoods } from "../../components/MoodBadge";
import { useAuth } from "../../context/AuthContext";
import { usePageCache } from "../../context/PageCacheContext";
import { useAppTheme } from "../../context/ThemeContext";

// 精选公开示例笔记库 (供初次访问时探索浏览)
const FEATURED_NOTES: DiaryItem[] = [
  {
    id: "public-01",
    title: "✨ 探索 Fluent 2 与现代化设计系统的美学",
    weather: "Sunny",
    mood: "Excited",
    created_at: "2026-09-12 10:00:00",
    content: `# 探索 Fluent 2 视觉与交互美学

微软 **Fluent 2** 是面向多平台统一设计语言的集大成者，它融合了亚克力玻璃拟态、平滑光影与精致圆角，提供了一整套基于**原子化 Design Tokens** 的交互体系。

## 为什么选择 Fluent 2？
1. **统一的设计语言**：无论在 Windows、Web 还是移动端，都保持着无缝一致的微软现代桌面质感；
2. **丰富的图标体系**：超过数万枚无缝适配的 Fluent System Icons，极度契合生产力工具；
3. **高对比与可访问性**：原生遵循 WCAG 2.1 AAA 级别标准，支持精准的深色模式平滑渐变切换。

> “优秀的设计不是给界面做加法，而是让每一个像素都服务于用户的思考与专注。”

### 示例代码高亮
\`\`\`typescript
import { FluentProvider, webDarkTheme, webLightTheme } from "@fluentui/react-components";

export function AppRoot({ isDark }: { isDark: boolean }) {
  return (
    <FluentProvider theme={isDark ? webDarkTheme : webLightTheme}>
      <MarkdownStudio />
    </FluentProvider>
  );
}
\`\`\`

---
欢迎开启拾光手记的灵感记录之旅！
`,
  },
  {
    id: "public-02",
    title: "🌿 周末晨间散步随想：在快节奏时代保持深度专注",
    weather: "Cloudy",
    mood: "Peaceful",
    created_at: "2026-09-11 08:30:00",
    content: `# 周末晨间散步随想

清晨七点的公园格外宁静。初秋微凉的晨风穿过林荫道，露珠在青草尖端轻轻颤动。

在信息洪流不断冲刷注意力的今天，拥有一个纯净、属于自己的**私人文字记录空间**显得尤为珍贵。

### 关于“慢思考”的三个习惯：
- **晨间复盘**：写下今天最核心的 3 件重要事件，而不是填满碎屑待办；
- **离线反思**：在没有社交媒体弹窗干扰的环境下梳理技术架构；
- **随想即记**：捕捉闪烁的灵感火花，并整理为成体系的 Markdown 笔记。

### 慢思考精力分配比例
\`\`\`mermaid
pie title 慢思考日程精力分配
    "晨读与深度思考" : 30
    "架构设计与编码" : 45
    "自然散步与反思" : 15
    "灵感归档整理" : 10
\`\`\`

| 时间阶段 | 推荐行动 | 预期心境 |
| :--- | :--- | :--- |
| 清晨 07:00 - 08:00 | 晨读与日记复盘 | 宁静清澈 🧘‍♂️ |
| 上午 09:00 - 12:00 | 深度代码架构设计 | 充沛专注 🚀 |
| 夜晚 21:00 - 22:00 | 自由灵感整理与归档 | 满足释然 🌙 |
`,
  },
  {
    id: "public-03",
    title: "⚡ 高性能微内核架构的设计思考：从契约驱动到 SQL AST",
    weather: "Rainy",
    mood: "Thinking",
    created_at: "2026-09-10 16:20:00",
    content: `# 高性能微内核架构的设计思考

传统 Node.js 后端常常充斥着冗长的控制器样板代码和黑盒 ORM 反射开销。通过引入**契约驱动架构 (Contract-Driven Design)** 与 **SQL AST (抽象语法树)** 预编译技术，系统取得了质的飞跃。

## 系统架构与数据流转流程图
\`\`\`mermaid
graph TD
    Client[💻 前端客户端] -->|1. 随笔读写请求| Gateway[⚡ 契约驱动网关]
    Gateway -->|2. JWT 严格鉴权| Kernel[核心业务微内核]
    Kernel -->|3. 查询二段式缓存| Cache[(🚀 内存高速缓存)]
    Cache -->|命中返回| Gateway
    Cache -->|未命中回源| DB[(🗄️ MySQL 聚簇索引)]
    DB -->|回填写入| Cache
\`\`\`

## 核心交互时序图
\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User as 👤 用户
    participant App as 💻 前端预览
    participant Server as ⚡ 后端核心
    participant DB as 🗄️ MySQL 数据库

    User->>App: 点击打开随笔预览
    App->>Server: 获取随笔详情 (GET /api/diaries/:id)
    Server->>DB: 聚簇索引快速回源
    DB-->>Server: 返回结构化数据
    Server-->>App: 200 OK 传输数据
    App-->>User: 渲染 Markdown 与 Mermaid 矢量图表
\`\`\`

## 关键架构创新点
1. **零运行时解析开销**：在服务启动阶段一次性完成 AST 向原生 MySQL 参数化 SQL 的编译；
2. **Saga 逆序撤销闭包**：在 CUD 写入前自动抓取行快照并生成 Undo 补偿函数；
3. **二段式批量缓存回源**：提取 ID 列表 -> Redis 批量读取 -> 缺失项 MySQL 批量聚簇索引回源。

\`\`\`sql
-- MySQL 批量参数化回源
SELECT id, user_id, title, weather, mood, created_at 
FROM diaries 
WHERE id IN (?, ?, ?) 
ORDER BY created_at DESC;
\`\`\`

这套优雅的工程实践，不仅让性能逼近原生极速，更为日后的高并发扩展打下了坚实基石。
`,
  },
  {
    id: "public-04",
    title: "☕ 咖啡、雨声与一本未读完的算法书",
    weather: "Thunder",
    mood: "Tired",
    created_at: "2026-09-09 20:15:00",
    content: `# 窗外的暴风雨与一杯手冲曼特宁

窗外电闪雷鸣，雨水密集地打在玻璃窗上，留下一道道蜿蜒的水迹。

室内暖黄色的台灯下，咖啡香气弥漫在书桌周围。正在翻阅《算法导论》中关于动态规划与贪心算法的章节。

> “很多时候，看似复杂的全局最优解，往往建立在每一个子结构的最优权衡之上。”

代码与生活，或许皆是如此。
`,
  },
];

export const PublicShowcase: React.FC = () => {
  const { isDark } = useAppTheme();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: routeNoteId } = useParams<{ id?: string }>();
  const activeNoteId = searchParams.get("note") || searchParams.get("id") || routeNoteId;

  const { hasPageLoaded, markPageLoaded, getCachedData, setCachedData } = usePageCache();
  const PAGE_KEY = "public_showcase";
  const alreadyLoaded = hasPageLoaded(PAGE_KEY);
  const cachedNotes = getCachedData<DiaryItem[]>(PAGE_KEY);

  const [notes, setNotes] = useState<DiaryItem[]>(cachedNotes || []);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(!alreadyLoaded || cachedNotes === null);
  const [shouldAnimate, setShouldAnimate] = useState<boolean>(!alreadyLoaded);
  
  const cachedSearch = getCachedData<string>("public_search_query") || "";
  const cachedMood = getCachedData<string>("public_selected_mood") || "all";
  const [searchQuery, setSearchQuery] = useState<string>(cachedSearch);
  const [selectedMood, setSelectedMood] = useState<string>(cachedMood);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCachedData("public_search_query", val);
  };

  const handleMoodSelect = (val: string) => {
    setSelectedMood(val);
    setCachedData("public_selected_mood", val);
  };

  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [readerDiary, setReaderDiary] = useState<DiaryItem | null>(null);
  const [customMoodVersion, setCustomMoodVersion] = useState(0);

  // 监听用户自定义心情库变动，保持分类标签实时同步
  useEffect(() => {
    const handleUpdate = () => setCustomMoodVersion((v) => v + 1);
    window.addEventListener("mood:custom_updated", handleUpdate);
    return () => window.removeEventListener("mood:custom_updated", handleUpdate);
  }, []);

  // 监听笔记更新或创建事件，静默重新同步公开列表，绝不重置用户的滚动位置与搜索输入
  useEffect(() => {
    const handleNotesUpdated = () => {
      fetchPublicNotes(true);
    };
    window.addEventListener("notes:updated", handleNotesUpdated);
    return () => window.removeEventListener("notes:updated", handleNotesUpdated);
  }, []);

  // 动态融合系统预设、用户本地自定义以及所有公开笔记中实际出现的分类
  const moodTabs = useMemo(() => {
    return getAllMoods(notes);
  }, [notes, customMoodVersion]);

  // 深度链接 / 复制粘贴 URL 自动加载指定公开笔记内容
  useEffect(() => {
    if (!activeNoteId) {
      setIsReaderOpen(false);
      const timer = setTimeout(() => {
        setReaderDiary(null);
      }, 350);
      return () => clearTimeout(timer);
    }

    if (readerDiary && readerDiary.id === activeNoteId) {
      setIsReaderOpen(true);
      return;
    }

    // 1. 如果当前公开列表已有该笔记，立刻快速呈现
    const found = notes.find((n) => n.id === activeNoteId);
    if (found) {
      setReaderDiary(found);
      setIsReaderOpen(true);
      return;
    }

    // 2. 若列表尚未就绪或属于直接通过链接直访的历史公开笔记，从后端获取详情
    let isCancelled = false;
    const loadDirectNote = async () => {
      try {
        const res = await diaryApi.detail(activeNoteId);
        if (!isCancelled && res.status === 1 && res.data) {
          setReaderDiary(res.data);
          setIsReaderOpen(true);
        }
      } catch (err) {
        console.warn("加载指定公开笔记失败:", err);
      }
    };

    loadDirectNote();
    return () => {
      isCancelled = true;
    };
  }, [activeNoteId, notes]);

  // 随阅读弹窗开关动态同步浏览器标签页 Title
  useEffect(() => {
    if (readerDiary && isReaderOpen) {
      document.title = `${readerDiary.title || "公开手记"} - 拾光手记`;
    } else {
      document.title = "拾光手记";
    }
  }, [readerDiary, isReaderOpen]);

  // 打开公开笔记阅读，并将笔记 ID 写入 URL，方便直接复制与分享链接
  const handleOpenNote = (note: DiaryItem) => {
    setReaderDiary(note);
    setIsReaderOpen(true);
    setSearchParams({ note: note.id }, { replace: false });
  };

  // 关闭公开笔记阅读，清空 URL 中的 note 参数恢复默认广场
  const handleCloseReader = () => {
    setIsReaderOpen(false);
    if (routeNoteId) {
      navigate("/", { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
    setTimeout(() => {
      setReaderDiary(null);
    }, 350);
  };

  // 从后端异步加载全部公开可见的日记（首次全屏居中加载并入场，后续切换静默更新）
  const fetchPublicNotes = async (isSilent: boolean = false) => {
    if (!isSilent) {
      setIsInitialLoading(true);
    }
    try {
      const res = await diaryApi.publicList();
      if (res.status === 1 && res.data) {
        setNotes(res.data);
        setCachedData(PAGE_KEY, res.data);
      } else if (!isSilent) {
        setNotes([]);
      }
    } catch {
      if (!isSilent) {
        setNotes([]);
      }
    } finally {
      if (!isSilent) {
        setIsInitialLoading(false);
        markPageLoaded(PAGE_KEY);
      }
    }
  };

  useEffect(() => {
    if (alreadyLoaded && cachedNotes !== null) {
      // 页面加载过之后：不显示加载动画和出现动画，后台静默调用数据更新直接展示
      setShouldAnimate(false);
      fetchPublicNotes(true);
    } else {
      // 首次加载：居中转圈，完成后动画显示
      fetchPublicNotes(false);
    }
  }, []);

  // 保证进入笔记广场及加载完成时，页面必须绝对滚动到顶部，杜绝任何向下滑动残留
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const main = document.querySelector(".app-main-content");
      if (main) main.scrollTop = 0;
    };
    scrollToTop();
    const raf = requestAnimationFrame(scrollToTop);
    const timer = setTimeout(scrollToTop, 60);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [isInitialLoading]);

  // 过滤笔记 (使用 useMemo 避免每次无关父组件更新导致数组引用频繁变更)
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchSearch =
        !searchQuery ||
        note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchMood =
        selectedMood === "all" || note.mood?.toLowerCase() === selectedMood.toLowerCase();
      return matchSearch && matchMood;
    });
  }, [notes, searchQuery, selectedMood]);

  if (isInitialLoading) {
    return (
      <div className="fluent-page-center-loader">
        <Spinner size="large" label="正在获取日记..." />
      </div>
    );
  }

  // 依据当前呈现的卡片数量动态决定底部空白滚动空间（卡片较少时彻底消除长空白，卡片多时提供自然的底部收口）
  const cardCount = filteredNotes.length;
  const dynamicBottomPadding =
    cardCount === 0 ? "20px" : cardCount <= 3 ? "24px" : cardCount <= 6 ? "36px" : "48px";

  return (
    <div
      className="public-page-container page-content-container"
      style={{
        width: "100%",
        maxWidth: "1280px",
        margin: "0 auto",
        paddingTop: "32px",
        paddingLeft: "24px",
        paddingRight: "24px",
        paddingBottom: dynamicBottomPadding,
        ['--page-bottom-padding' as any]: dynamicBottomPadding,
        boxSizing: "border-box",
        minWidth: 0,
        flex: "0 1 auto",
        minHeight: "auto",
      }}
    >
      {/* Top Header Bar */}
      <div
        className="win10-tile-rise win10-delay-1 page-header-bar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <Title2 style={{ fontWeight: 800, margin: 0 }}>笔记广场</Title2>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Button
            className="page-header-action-btn"
            appearance="secondary"
            icon={<ArrowSync20Regular />}
            onClick={() => fetchPublicNotes(false)}
            disabled={isInitialLoading}
            style={{
              borderRadius: "8px",
              fontWeight: 600,
            }}
            aria-label="刷新"
          >
            <span className="header-action-btn-text">刷新</span>
          </Button>

          <Button
            className="page-header-action-btn"
            appearance="primary"
            icon={<Add20Filled />}
            onClick={() => {
              if (!isAuthenticated) {
                navigate("/auth");
              } else {
                navigate("/workspace/new");
              }
            }}
            style={{
              backgroundColor: "#5B7B8D",
              borderRadius: "8px",
              fontWeight: 600,
            }}
            aria-label="写笔记"
          >
            <span className="header-action-btn-text">写笔记</span>
          </Button>
        </div>
      </div>

      {/* 顶部中央搜索框与分类标签 */}
      <div
        className="win10-tile-rise win10-delay-2"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          marginBottom: "32px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* 所有笔记中间顶部显示搜索框 */}
        <div
          className="responsive-search-box"
          style={{
            width: "100%",
            maxWidth: "520px",
            boxSizing: "border-box",
          }}
        >
          <Input
            className="win11-mica-input"
            contentBefore={<Search20Regular />}
            placeholder="搜索公开日记标题或正文内容..."
            value={searchQuery}
            onChange={(_, data) => handleSearchChange(data.value)}
            style={{
              width: "100%",
              borderRadius: "10px",
              height: "42px",
              fontSize: "14px",
            }}
          />
        </div>

        {/* 心情过滤分类标签 */}
        <div
          className="responsive-tablist-wrapper"
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            boxSizing: "border-box",
            overflowX: "auto",
          }}
        >
          <TabList
            size="large"
            selectedValue={selectedMood}
            onTabSelect={(_, data) => handleMoodSelect(String(data.value))}
          >
            <Tab value="all">全部</Tab>
            {moodTabs.map((m) => (
              <Tab key={m.id} value={m.id}>
                {m.label} {m.emoji || "✨"}
              </Tab>
            ))}
          </TabList>
        </div>
      </div>

      {/* 笔记网格列表 */}
      <div style={{ width: "100%", boxSizing: "border-box" }}>

        {/* Notes Grid */}
        {filteredNotes.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 0",
              opacity: 0.6,
              borderRadius: "16px",
              border: "1px dashed rgba(128, 128, 128, 0.2)",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <Filter20Regular style={{ fontSize: "36px", marginBottom: "8px" }} />
            <div>暂无公开日记</div>
          </div>
        ) : (
          <Win10AnimatedGrid
            items={filteredNotes}
            getKey={(note) => note.id}
            className="responsive-card-grid"
            gridStyle={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
              gap: "24px",
              width: "100%",
              boxSizing: "border-box",
            }}
            renderItem={(note) => (
              <NoteCard
                diary={note}
                showAuthor={true}
                onClick={() => handleOpenNote(note)}
              />
            )}
          />
        )}
      </div>

      {/* Reader Modal */}
      <NoteReaderModal
        diary={readerDiary}
        open={isReaderOpen}
        onClose={handleCloseReader}
        onEdit={(d) => {
          if (user && d.user_id === user.userId) {
            navigate(`/workspace/edit/${d.id}`);
          }
        }}
      />
    </div>
  );
};
