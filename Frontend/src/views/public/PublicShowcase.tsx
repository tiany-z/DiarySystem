import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Badge,
  Body1,
  Button,
  Caption1,
  Input,
  LargeTitle,
  Subtitle1,
  Tab,
  TabList,
  Title2,
  Spinner,
} from "@fluentui/react-components";
import {
  Add20Filled,
  BookCompass24Regular,
  Filter20Regular,
  Folder20Regular,
  Search20Regular,
  Sparkle24Filled,
} from "@fluentui/react-icons";
import { diaryApi, DiaryItem } from "../../api/diary";
import { NoteCard } from "../../components/NoteCard";
import { NoteReaderModal } from "../../components/NoteReaderModal";
import { useAuth } from "../../context/AuthContext";
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

微软 **Fluent 2** 是面向多平台统一设计语言的集大成者，它不仅融合了亚克力玻璃拟态（Acrylic）、平滑光影（Elevation）与精致圆角，更提供了一整套基于**原子化 Design Tokens** 的交互体系。

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

  const [notes, setNotes] = useState<DiaryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("all");
  const [readerDiary, setReaderDiary] = useState<DiaryItem | null>(null);

  // 深度链接 / 复制粘贴 URL 自动加载指定公开笔记内容
  useEffect(() => {
    if (!activeNoteId) {
      setReaderDiary(null);
      return;
    }

    if (readerDiary && readerDiary.id === activeNoteId) {
      return;
    }

    // 1. 如果当前公开列表已有该笔记，立刻快速呈现
    const found = notes.find((n) => n.id === activeNoteId);
    if (found) {
      setReaderDiary(found);
      return;
    }

    // 2. 若列表尚未就绪或属于直接通过链接直访的历史公开笔记，从后端获取详情
    let isCancelled = false;
    const loadDirectNote = async () => {
      try {
        const res = await diaryApi.detail(activeNoteId);
        if (!isCancelled && res.status === 1 && res.data) {
          setReaderDiary(res.data);
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
    if (readerDiary) {
      document.title = `${readerDiary.title || "公开手记"} - 拾光手记`;
    } else {
      document.title = "拾光手记 - 记录灵感随笔与心境沉淀";
    }
  }, [readerDiary]);

  // 打开公开笔记阅读，并将笔记 ID 写入 URL，方便直接复制与分享链接
  const handleOpenNote = (note: DiaryItem) => {
    setReaderDiary(note);
    setSearchParams({ note: note.id }, { replace: false });
  };

  // 关闭公开笔记阅读，清空 URL 中的 note 参数恢复默认广场
  const handleCloseReader = () => {
    setReaderDiary(null);
    if (routeNoteId) {
      navigate("/", { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  // 从后端异步加载全部公开可见的日记 (严格来自数据库中公开可见的笔记)
  useEffect(() => {
    const fetchPublicNotes = async () => {
      setIsLoading(true);
      try {
        const res = await diaryApi.publicList();
        if (res.status === 1 && res.data) {
          setNotes(res.data);
        } else {
          setNotes([]);
        }
      } catch {
        setNotes([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPublicNotes();
  }, []);

  // 过滤笔记
  const filteredNotes = notes.filter((note) => {
    const matchSearch =
      !searchQuery ||
      note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchMood =
      selectedMood === "all" || note.mood?.toLowerCase() === selectedMood.toLowerCase();
    return matchSearch && matchMood;
  });

  return (
    <div
      className="public-page-container"
      style={{
        width: "100%",
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "32px 24px 80px 24px",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      {/* Hero Welcome Banner (明亮、通透、高质感 Fluent 2 视觉) */}
      <div
        className="hero-welcome-banner"
        style={{
          width: "100%",
          boxSizing: "border-box",
          borderRadius: "24px",
          padding: "52px 48px",
          marginBottom: "44px",
          background: isDark
            ? "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(20, 20, 26, 0.8) 100%)"
            : "linear-gradient(135deg, #eef6ff 0%, #f0f7ff 45%, #faf5ff 100%)",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 120, 212, 0.16)",
          boxShadow: isDark
            ? "0 16px 48px rgba(0, 0, 0, 0.45)"
            : "0 16px 48px rgba(0, 120, 212, 0.08)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: "760px", position: "relative", zIndex: 2 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
            <Badge
              appearance="tint"
              color="brand"
              icon={<Sparkle24Filled style={{ color: "#0078d4", fontSize: "16px" }} />}
              style={{
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "999px",
              }}
            >
              灵感随笔
            </Badge>
          </div>

          <LargeTitle className="hero-gradient-title">
            于秩序之中，静听思维的回响
          </LargeTitle>

          <Subtitle1 className="hero-subtitle" style={{ opacity: 0.85, lineHeight: 1.6, marginBottom: "24px", display: "block", fontSize: "15px" }}>
            摒弃冗余与杂音，以纯粹的极简美学，安放独属于你的灵感火花与心境沉淀。
          </Subtitle1>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {isAuthenticated ? (
              <>
                <Button
                  appearance="primary"
                  icon={<Folder20Regular />}
                  onClick={() => navigate("/workspace")}
                  style={{
                    background: "linear-gradient(135deg, #0078d4, #005a9e)",
                    borderRadius: "8px",
                    fontWeight: 600,
                  }}
                >
                  笔记库
                </Button>
                <Button
                  appearance="secondary"
                  icon={<Add20Filled />}
                  onClick={() => navigate("/workspace/new")}
                  style={{ borderRadius: "8px" }}
                >
                  写日记
                </Button>
              </>
            ) : (
              <Button
                appearance="primary"
                icon={<Add20Filled />}
                onClick={() => navigate("/auth")}
                style={{
                  background: "linear-gradient(135deg, #0078d4, #005a9e)",
                  borderRadius: "8px",
                  fontWeight: 600,
                }}
              >
                开启记录
              </Button>
            )}

            <Button
              appearance="subtle"
              icon={<BookCompass24Regular />}
              onClick={() => {
                const el = document.getElementById("explore-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              style={{ borderRadius: "8px" }}
            >
              浏览广场
            </Button>
          </div>
        </div>
      </div>

      {/* Explore Section */}
      <div id="explore-section" style={{ width: "100%", boxSizing: "border-box" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "20px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <Title2 style={{ fontWeight: 800 }}>公开广场</Title2>
            <Caption1 style={{ opacity: 0.65 }}>共 {filteredNotes.length} 篇</Caption1>
          </div>

          {/* Search Input */}
          <div className="responsive-search-box" style={{ width: "280px" }}>
            <Input
              contentBefore={<Search20Regular />}
              placeholder="搜索..."
              value={searchQuery}
              onChange={(_, data) => setSearchQuery(data.value)}
              style={{ width: "100%", borderRadius: "8px" }}
            />
          </div>
        </div>

        {/* Mood Filter Tabs */}
        <div className="responsive-tablist-wrapper" style={{ marginBottom: "24px", width: "100%", boxSizing: "border-box" }}>
          <TabList
            size="large"
            selectedValue={selectedMood}
            onTabSelect={(_, data) => setSelectedMood(String(data.value))}
          >
            <Tab value="all">全部</Tab>
            <Tab value="Happy">欢喜 ✨</Tab>
            <Tab value="Peaceful">宁静 🌿</Tab>
            <Tab value="Excited">充沛 🔥</Tab>
            <Tab value="Thinking">沉思 💡</Tab>
            <Tab value="Tired">倦怠 🌙</Tab>
          </TabList>
        </div>

        {/* Notes Grid */}
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "80px 0" }}>
            <Spinner label="正在加载广场公开日记..." size="large" />
          </div>
        ) : filteredNotes.length === 0 ? (
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
          <div
            className="responsive-card-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
              gap: "24px",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                diary={note}
                onClick={() => handleOpenNote(note)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reader Modal */}
      <NoteReaderModal
        diary={readerDiary}
        open={!!readerDiary}
        onClose={handleCloseReader}
        onEdit={(d) => {
          if (!isAuthenticated) {
            // 保存未登录用户点击的模板，登录后无缝恢复进入编辑器
            sessionStorage.setItem(
              "pending_template",
              JSON.stringify({
                templateTitle: `基于「${d.title}」的随想记录`,
                templateContent: d.content,
                weather: d.weather,
                mood: d.mood,
              })
            );
            navigate("/auth");
            return;
          }
          if (user && d.user_id === user.userId) {
            navigate(`/workspace/edit/${d.id}`);
          } else {
            navigate("/workspace/new", {
              state: {
                templateTitle: `基于「${d.title}」的随想记录`,
                templateContent: d.content,
                weather: d.weather,
                mood: d.mood,
              },
            });
          }
        }}
      />
    </div>
  );
};
