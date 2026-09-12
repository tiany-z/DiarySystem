import mysql from 'mysql2/promise';

async function seed() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'diary_system'
  });

  const [users] = await conn.query("SELECT id FROM users WHERE username = 'demo_user'");
  if (!users || users.length === 0) {
    console.log('No demo_user found');
    await conn.end();
    return;
  }
  const userId = users[0].id;

  const demoNotes = [
    {
      id: 'demo-diary-01',
      user_id: userId,
      title: '✨ 探索 Fluent 2 与现代化设计系统的美学',
      weather: 'Sunny',
      mood: 'Excited',
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
欢迎开启您的 DiarySystem 随想记录之旅！
`
    },
    {
      id: 'demo-diary-02',
      user_id: userId,
      title: '🌿 周末晨间散步随想：在快节奏时代保持深度专注',
      weather: 'Cloudy',
      mood: 'Peaceful',
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
`
    },
    {
      id: 'demo-diary-03',
      user_id: userId,
      title: '⚡ 高性能微内核架构的设计思考：从契约驱动到 SQL AST',
      weather: 'Rainy',
      mood: 'Thinking',
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
`
    },
    {
      id: 'demo-diary-04',
      user_id: userId,
      title: '☕ 咖啡、雨声与一本未读完的算法书',
      weather: 'Thunder',
      mood: 'Tired',
      content: `# 窗外的暴风雨与一杯手冲曼特宁

窗外电闪雷鸣，雨水密集地打在玻璃窗上，留下一道道蜿蜒的水迹。

室内暖黄色的台灯下，咖啡香气弥漫在书桌周围。正在翻阅《算法导论》中关于动态规划与贪心算法的章节。

> “很多时候，看似复杂的全局最优解，往往建立在每一个子结构的最优权衡之上。”

代码与生活，或许皆是如此。
`
    }
  ];

  for (const n of demoNotes) {
    await conn.query(
      "INSERT INTO diaries (id, user_id, title, content, weather, mood) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content)",
      [n.id, n.user_id, n.title, n.content, n.weather, n.mood]
    );
  }

  console.log('✅ Demo diaries seeded into MySQL successfully!');
  await conn.end();
}

seed().catch(console.error);
