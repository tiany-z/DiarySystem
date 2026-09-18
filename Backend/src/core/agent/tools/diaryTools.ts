import { executeQuery } from "../../db/mysql.js";
import { getKV, setKV, delKV } from "../../cache/memoryCache.js";
import { RowLockManager } from "../../lock/rowLockManager.js";
import { genUUID } from "../../crypto/uuid.js";
import { tryCatchErrorToString } from "../../flow/result.js";
import {
  AgentToolDefinition,
  AgentToolExecutor,
  AgentToolResult,
} from "./types.js";

// =========================================================================
// 1. search_diaries (多维度模糊/精确日记搜索)
// =========================================================================
export const searchDiariesTool: AgentToolDefinition = {
  type: "function",
  function: {
    name: "search_diaries",
    description:
      "多维度检索用户的私有日记库。支持按关键词、起止日期、心情类型、天气特征进行组合筛选，返回匹配日记的基本摘要列表。",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "搜索关键词，会在日记标题与正文中进行模糊匹配",
        },
        startDate: {
          type: "string",
          description: "起始日期，格式 YYYY-MM-DD",
        },
        endDate: {
          type: "string",
          description: "截止日期，格式 YYYY-MM-DD",
        },
        mood: {
          type: "string",
          description: "心情筛选，如: Happy, Calm, Sad, Angry, Excited, Tired, Relaxed",
        },
        weather: {
          type: "string",
          description: "天气筛选，如: Sunny, Cloudy, Rainy, Snowy, Windy",
        },
        limit: {
          type: "integer",
          description: "返回最大结果数量，默认 10，最大上限 50",
        },
      },
    },
  },
};

export const searchDiariesExecutor: AgentToolExecutor = async (
  args,
  context
): Promise<AgentToolResult> => {
  try {
    const { query, startDate, endDate, mood, weather, limit = 10 } = args || {};
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const whereClauses: string[] = ["user_id = ?", "deleted_at IS NULL"];
    const params: any[] = [context.userId];

    if (query && typeof query === "string" && query.trim()) {
      whereClauses.push("(title LIKE ? OR content LIKE ?)");
      const q = `%${query.trim()}%`;
      params.push(q, q);
    }

    if (startDate && typeof startDate === "string" && startDate.trim()) {
      whereClauses.push("created_at >= ?");
      params.push(`${startDate.trim()} 00:00:00`);
    }

    if (endDate && typeof endDate === "string" && endDate.trim()) {
      whereClauses.push("created_at <= ?");
      params.push(`${endDate.trim()} 23:59:59`);
    }

    if (mood && typeof mood === "string" && mood.trim()) {
      whereClauses.push("mood = ?");
      params.push(mood.trim());
    }

    if (weather && typeof weather === "string" && weather.trim()) {
      whereClauses.push("weather = ?");
      params.push(weather.trim());
    }

    const sql = `
      SELECT id, title, content, weather, mood, is_public, created_at, updated_at
      FROM diaries
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT ?;
    `;
    params.push(safeLimit);

    const queryRes = await executeQuery<any>(sql, params);
    if (queryRes.status === 0) {
      return {
        success: false,
        error: `搜索日记失败: ${queryRes.content}`,
        summary: "日记检索失败",
      };
    }

    const rawRows = queryRes.data || [];
    const diaries = rawRows.map((row: any) => {
      const fullText = row.content || "";
      // 提取前 150 字符摘要，去除多余空白
      const snippet =
        fullText.replace(/[\r\n\t]+/g, " ").slice(0, 150) +
        (fullText.length > 150 ? "..." : "");
      return {
        id: row.id,
        title: row.title,
        createdAt: row.created_at,
        weather: row.weather,
        mood: row.mood,
        isPublic: row.is_public === 1,
        charCount: fullText.length,
        snippet,
      };
    });

    return {
      success: true,
      data: {
        totalMatches: diaries.length,
        diaries,
      },
      summary: `已检索到 ${diaries.length} 篇匹配日记`,
    };
  } catch (err) {
    return {
      success: false,
      error: `search_diaries 异常: ${tryCatchErrorToString(err)}`,
      summary: "日记检索异常",
    };
  }
};

// =========================================================================
// 2. locate_diary_content (段落级关键词精准定位与上下文抽取)
// =========================================================================
export const locateDiaryContentTool: AgentToolDefinition = {
  type: "function",
  function: {
    name: "locate_diary_content",
    description:
      "精准扫描日记正文，提取包含关键词的具体段落、行号及前后 120 字符上下文切片。当用户回忆具体细节但不知道在具体哪篇日记时极其有用。",
    parameters: {
      type: "object",
      properties: {
        keyword: {
          type: "string",
          description: "必须提供的定位关键词或短语",
        },
        diaryId: {
          type: "string",
          description:
            "可选的日记 ID。若指定则仅在该篇日记内定位，若不指定则全局扫描该用户的所有未删除日记",
        },
        maxMatches: {
          type: "integer",
          description: "最大返回匹配片段数，默认 5，最大 20",
        },
      },
      required: ["keyword"],
    },
  },
};

export const locateDiaryContentExecutor: AgentToolExecutor = async (
  args,
  context
): Promise<AgentToolResult> => {
  try {
    const { keyword, diaryId, maxMatches = 5 } = args || {};
    if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
      return {
        success: false,
        error: "必须提供定位关键词 (keyword)",
        summary: "定位失败：缺少关键词",
      };
    }

    const targetKeyword = keyword.trim();
    const safeMaxMatches = Math.min(Math.max(Number(maxMatches) || 5, 1), 20);

    const whereClauses: string[] = ["user_id = ?", "deleted_at IS NULL"];
    const params: any[] = [context.userId];

    if (diaryId && typeof diaryId === "string" && diaryId.trim()) {
      whereClauses.push("id = ?");
      params.push(diaryId.trim());
    } else {
      // 全局搜索正文包含关键词的记录
      whereClauses.push("content LIKE ?");
      params.push(`%${targetKeyword}%`);
    }

    const sql = `
      SELECT id, title, content, created_at
      FROM diaries
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT 30;
    `;

    const queryRes = await executeQuery<any>(sql, params);
    if (queryRes.status === 0) {
      return {
        success: false,
        error: `扫描日记正文失败: ${queryRes.content}`,
        summary: "段落定位失败",
      };
    }

    const rows = queryRes.data || [];
    const locations: Array<{
      diaryId: string;
      diaryTitle: string;
      createdAt: string;
      lineNumber: number;
      lineText: string;
      contextSnippet: string;
    }> = [];

    const CONTEXT_RADIUS = 120;

    for (const row of rows) {
      if (locations.length >= safeMaxMatches) break;
      const content = row.content || "";
      if (!content.includes(targetKeyword)) continue;

      let currentOffset = 0;
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (locations.length >= safeMaxMatches) break;
        const line = lines[i];
        const lineKeywordIdx = line.indexOf(targetKeyword);
        if (lineKeywordIdx !== -1) {
          const charIndex = currentOffset + lineKeywordIdx;
          const start = Math.max(0, charIndex - CONTEXT_RADIUS);
          const end = Math.min(content.length, charIndex + targetKeyword.length + CONTEXT_RADIUS);
          const snippetText = content.slice(start, end);
          const highlightedSnippet = snippetText.replace(
            targetKeyword,
            `【${targetKeyword}】`
          );

          locations.push({
            diaryId: row.id,
            diaryTitle: row.title,
            createdAt: row.created_at,
            lineNumber: i + 1,
            lineText: line.trim(),
            contextSnippet: (start > 0 ? "..." : "") + highlightedSnippet + (end < content.length ? "..." : ""),
          });
        }
        currentOffset += line.length + 1; // 加上换行符偏移
      }
    }

    return {
      success: true,
      data: {
        keyword: targetKeyword,
        matchedCount: locations.length,
        locations,
      },
      summary: `已在日记中精确定位到 ${locations.length} 处关于 "${targetKeyword}" 的段落`,
    };
  } catch (err) {
    return {
      success: false,
      error: `locate_diary_content 异常: ${tryCatchErrorToString(err)}`,
      summary: "段落定位异常",
    };
  }
};

// =========================================================================
// 3. read_diary_detail (日记全文深度精读)
// =========================================================================
export const readDiaryDetailTool: AgentToolDefinition = {
  type: "function",
  function: {
    name: "read_diary_detail",
    description:
      "根据日记 ID 深度读取单篇日记的完整 Markdown 内容、天气、心情、创建时间与公开状态。用于长文分析、提炼总结或文本润色。",
    parameters: {
      type: "object",
      properties: {
        diaryId: {
          type: "string",
          description: "目标日记的唯一 ID",
        },
      },
      required: ["diaryId"],
    },
  },
};

export const readDiaryDetailExecutor: AgentToolExecutor = async (
  args,
  context
): Promise<AgentToolResult> => {
  try {
    const { diaryId } = args || {};
    if (!diaryId || typeof diaryId !== "string" || !diaryId.trim()) {
      return {
        success: false,
        error: "缺少目标日记 ID (diaryId)",
        summary: "读取失败：缺少日记 ID",
      };
    }

    const cleanId = diaryId.trim();

    // 1. 尝试从内存缓存命中
    const cachedRes = await getKV<any>("diaries", cleanId);
    if (cachedRes.status === 1 && cachedRes.data) {
      const cached = cachedRes.data;
      if (cached.user_id === context.userId && !cached.deleted_at) {
        return {
          success: true,
          data: {
            id: cached.id,
            title: cached.title,
            content: cached.content || "",
            weather: cached.weather,
            mood: cached.mood,
            isPublic: cached.is_public === 1,
            createdAt: cached.created_at,
            updatedAt: cached.updated_at,
            charCount: (cached.content || "").length,
          },
          summary: `已读取日记《${cached.title}》全文 (${(cached.content || "").length} 字)`,
        };
      }
    }

    // 2. 回源 MySQL 读取并严格校验归属权
    const sql = `
      SELECT id, user_id, title, content, weather, mood, is_public, created_at, updated_at, deleted_at
      FROM diaries
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
      LIMIT 1;
    `;
    const dbRes = await executeQuery<any>(sql, [cleanId, context.userId]);

    if (dbRes.status === 0) {
      return {
        success: false,
        error: `查询日记详情失败: ${dbRes.content}`,
        summary: "读取日记详情失败",
      };
    }

    const row = dbRes.data?.[0];
    if (!row) {
      return {
        success: false,
        error: `日记不存在或已被删除 (ID: ${cleanId})`,
        summary: "目标日记不存在或无权访问",
      };
    }

    // 回填缓存
    await setKV("diaries", cleanId, row);

    return {
      success: true,
      data: {
        id: row.id,
        title: row.title,
        content: row.content || "",
        weather: row.weather,
        mood: row.mood,
        isPublic: row.is_public === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        charCount: (row.content || "").length,
      },
      summary: `已读取日记《${row.title}》全文 (${(row.content || "").length} 字)`,
    };
  } catch (err) {
    return {
      success: false,
      error: `read_diary_detail 异常: ${tryCatchErrorToString(err)}`,
      summary: "读取日记异常",
    };
  }
};

// =========================================================================
// 4. get_diary_timeline_stats (日记生命周期与心理画像统计)
// =========================================================================
export const getDiaryTimelineStatsTool: AgentToolDefinition = {
  type: "function",
  function: {
    name: "get_diary_timeline_stats",
    description:
      "聚合统计用户的日记生命周期数据。包含篇数总计、字数统计、心情频次与心理晴雨表分布、天气占比以及高频创作时段。",
    parameters: {
      type: "object",
      properties: {
        timeRange: {
          type: "string",
          enum: ["all", "this_week", "this_month", "recent_30_days", "this_year"],
          description: "时间跨度范围，默认为 all (全量历史)",
        },
      },
    },
  },
};

export const getDiaryTimelineStatsExecutor: AgentToolExecutor = async (
  args,
  context
): Promise<AgentToolResult> => {
  try {
    const { timeRange = "all" } = args || {};

    let timeFilter = "";
    if (timeRange === "this_week") {
      timeFilter = "AND created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)";
    } else if (timeRange === "this_month") {
      timeFilter = "AND created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')";
    } else if (timeRange === "recent_30_days") {
      timeFilter = "AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
    } else if (timeRange === "this_year") {
      timeFilter = "AND created_at >= DATE_FORMAT(CURDATE(), '%Y-01-01')";
    }

    // 1. 篇数与字数总览
    const summarySql = `
      SELECT 
        COUNT(*) as totalNotes,
        COALESCE(SUM(CHAR_LENGTH(content)), 0) as totalChars,
        COALESCE(ROUND(AVG(CHAR_LENGTH(content)), 0), 0) as avgChars,
        MIN(created_at) as earliestNoteAt,
        MAX(created_at) as latestNoteAt
      FROM diaries
      WHERE user_id = ? AND deleted_at IS NULL ${timeFilter};
    `;
    const summaryRes = await executeQuery<any>(summarySql, [context.userId]);

    const summaryData = summaryRes.data?.[0] || {
      totalNotes: 0,
      totalChars: 0,
      avgChars: 0,
      earliestNoteAt: null,
      latestNoteAt: null,
    };

    const totalNotes = Number(summaryData.totalNotes) || 0;

    // 2. 心情分布聚合
    const moodSql = `
      SELECT mood, COUNT(*) as count
      FROM diaries
      WHERE user_id = ? AND deleted_at IS NULL ${timeFilter}
      GROUP BY mood
      ORDER BY count DESC;
    `;
    const moodRes = await executeQuery<any>(moodSql, [context.userId]);
    const moodDistribution = (moodRes.data || []).map((m: any) => ({
      mood: m.mood || "未知",
      count: Number(m.count),
      percentage: totalNotes > 0 ? `${((Number(m.count) / totalNotes) * 100).toFixed(1)}%` : "0%",
    }));

    // 3. 天气分布聚合
    const weatherSql = `
      SELECT weather, COUNT(*) as count
      FROM diaries
      WHERE user_id = ? AND deleted_at IS NULL ${timeFilter}
      GROUP BY weather
      ORDER BY count DESC;
    `;
    const weatherRes = await executeQuery<any>(weatherSql, [context.userId]);
    const weatherDistribution = (weatherRes.data || []).map((w: any) => ({
      weather: w.weather || "未知",
      count: Number(w.count),
      percentage: totalNotes > 0 ? `${((Number(w.count) / totalNotes) * 100).toFixed(1)}%` : "0%",
    }));

    // 4. 创作时段分布
    const hourSql = `
      SELECT HOUR(created_at) as writeHour, COUNT(*) as count
      FROM diaries
      WHERE user_id = ? AND deleted_at IS NULL ${timeFilter}
      GROUP BY writeHour;
    `;
    const hourRes = await executeQuery<any>(hourSql, [context.userId]);

    let morning = 0; // 5-9点
    let daytime = 0; // 9-18点
    let evening = 0; // 18-23点
    let night = 0; // 23-5点

    for (const h of hourRes.data || []) {
      const hour = Number(h.writeHour);
      const cnt = Number(h.count);
      if (hour >= 5 && hour < 9) morning += cnt;
      else if (hour >= 9 && hour < 18) daytime += cnt;
      else if (hour >= 18 && hour < 23) evening += cnt;
      else night += cnt;
    }

    const dominantMood = moodDistribution[0]?.mood || "平静";

    // 计算最高频创作时段 (Peak Writing Period)
    const periods = [
      { name: "清晨 (05:00 - 09:00)", count: morning },
      { name: "日间 (09:00 - 18:00)", count: daytime },
      { name: "晚间 (18:00 - 23:00)", count: evening },
      { name: "深夜 (23:00 - 05:00)", count: night },
    ];
    periods.sort((a, b) => b.count - a.count);
    const topPeriod = periods[0];
    const peakWritingPeriod =
      totalNotes > 0 && topPeriod && topPeriod.count > 0
        ? `${topPeriod.name} 占 ${((topPeriod.count / totalNotes) * 100).toFixed(0)}%`
        : "创作时段分布均匀";

    return {
      success: true,
      data: {
        timeRange,
        summary: {
          totalNotes,
          totalChars: Number(summaryData.totalChars) || 0,
          avgChars: Number(summaryData.avgChars) || 0,
          earliest: summaryData.earliestNoteAt,
          latest: summaryData.latestNoteAt,
          earliestNoteAt: summaryData.earliestNoteAt,
          latestNoteAt: summaryData.latestNoteAt,
        },
        moodDistribution,
        weatherDistribution,
        peakWritingPeriod,
        writingPeriodStats: {
          morning: `${morning} 篇 (清晨 05:00-09:00)`,
          daytime: `${daytime} 篇 (日间 09:00-18:00)`,
          evening: `${evening} 篇 (晚间 18:00-23:00)`,
          night: `${night} 篇 (深夜 23:00-05:00)`,
        },
        dominantMood,
      },
      summary: `已聚合完成时间范围 [${timeRange}] 内共 ${totalNotes} 篇日记的生命周期与心理画像统计`,
    };
  } catch (err) {
    return {
      success: false,
      error: `get_diary_timeline_stats 异常: ${tryCatchErrorToString(err)}`,
      summary: "日记统计分析异常",
    };
  }
};

// =========================================================================
// 5. create_diary (智能创建新日记)
// =========================================================================
export const createDiaryTool: AgentToolDefinition = {
  type: "function",
  function: {
    name: "create_diary",
    description:
      "在用户的私有日记库中直接起草并创建一篇新日记。保存后用户可在笔记列表中即时查阅和编辑。",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "日记标题",
        },
        content: {
          type: "string",
          description: "日记完整的 Markdown 正文",
        },
        weather: {
          type: "string",
          description: "天气，如 Sunny, Rainy, Cloudy 等，默认 Sunny",
        },
        mood: {
          type: "string",
          description: "心情，如 Happy, Calm, Relaxed 等，默认 Happy",
        },
        isPublic: {
          type: "boolean",
          description: "是否设为公开日记 (true/false)，默认为 false (私密日记)",
        },
      },
      required: ["title", "content"],
    },
  },
};

export const createDiaryExecutor: AgentToolExecutor = async (
  args,
  context
): Promise<AgentToolResult> => {
  try {
    const { title, content, weather = "Sunny", mood = "Happy", isPublic = false } = args || {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return {
        success: false,
        error: "日记标题不能为空",
        summary: "创建失败：缺少标题",
      };
    }

    if (!content || typeof content !== "string") {
      return {
        success: false,
        error: "日记正文内容不能为空",
        summary: "创建失败：缺少正文",
      };
    }

    const newId = genUUID();
    const cleanTitle = title.trim();
    const cleanContent = content;
    const finalIsPublic = isPublic ? 1 : 0;
    const now = new Date();

    const insertSql = `
      INSERT INTO diaries (id, user_id, title, content, weather, mood, is_public, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const insertRes = await executeQuery(insertSql, [
      newId,
      context.userId,
      cleanTitle,
      cleanContent,
      weather,
      mood,
      finalIsPublic,
      now,
      now,
    ]);

    if (insertRes.status === 0) {
      return {
        success: false,
        error: `写入日记记录失败: ${insertRes.content}`,
        summary: "创建日记失败",
      };
    }

    // 缓存预热
    const diaryRecord = {
      id: newId,
      user_id: context.userId,
      title: cleanTitle,
      content: cleanContent,
      weather,
      mood,
      is_public: finalIsPublic,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    await setKV("diaries", newId, diaryRecord);

    // 注册 Saga 逆向补偿闭包
    const undoFn = async () => {
      await executeQuery("DELETE FROM diaries WHERE id = ?", [newId]).catch(() => {});
      await delKV("diaries", newId).catch(() => {});
    };
    if (context.withdrawStack) {
      context.withdrawStack.push(undoFn);
    }

    return {
      success: true,
      data: {
        id: newId,
        diaryId: newId,
        title: cleanTitle,
        charCount: cleanContent.length,
        createdAt: now.toISOString(),
        message: "新日记已成功创建并保存到私有库",
      },
      summary: `已成功创建日记《${cleanTitle}》(${cleanContent.length} 字)`,
    };
  } catch (err) {
    return {
      success: false,
      error: `create_diary 异常: ${tryCatchErrorToString(err)}`,
      summary: "创建日记异常",
    };
  }
};

// =========================================================================
// 6. update_diary (日记润色、修正与追加)
// =========================================================================
export const updateDiaryTool: AgentToolDefinition = {
  type: "function",
  function: {
    name: "update_diary",
    description:
      "对用户已有的指定日记进行内容更新、润色或在文末追加内容。具备并发行锁与数据回滚保护。",
    parameters: {
      type: "object",
      properties: {
        diaryId: {
          type: "string",
          description: "要更新的目标日记 ID",
        },
        title: {
          type: "string",
          description: "可选的新标题，若不提供则保留原标题",
        },
        content: {
          type: "string",
          description: "可选的全量新正文。若提供则全量覆盖旧正文",
        },
        appendContent: {
          type: "string",
          description: "可选的文末追加内容。若提供将在现有正文末尾空两行后自动追加",
        },
        weather: {
          type: "string",
          description: "可选的新天气",
        },
        mood: {
          type: "string",
          description: "可选的新心情",
        },
      },
      required: ["diaryId"],
    },
  },
};

export const updateDiaryExecutor: AgentToolExecutor = async (
  args,
  context
): Promise<AgentToolResult> => {
  const { diaryId, title, content, appendContent, weather, mood } = args || {};

  if (!diaryId || typeof diaryId !== "string" || !diaryId.trim()) {
    return {
      success: false,
      error: "缺少目标日记 ID (diaryId)",
      summary: "更新失败：缺少日记 ID",
    };
  }

  const cleanId = diaryId.trim();

  // 1. 申请行级排他锁保护
  const lockAcq = await RowLockManager.acquireRowLock(
    "diaries",
    cleanId,
    "UPDATE",
    context.requestId,
    10000
  );

  if (lockAcq.status === 0) {
    return {
      success: false,
      error: `获取日记行锁失败: ${lockAcq.content}`,
      summary: "更新日记失败：存在并发操作冲突",
    };
  }

  try {
    // 2. 抓取旧快照并核验所有权
    const selectRes = await executeQuery<any>(
      "SELECT * FROM diaries WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1;",
      [cleanId, context.userId]
    );

    const oldRow = selectRes.data?.[0];
    if (!oldRow) {
      await RowLockManager.releaseRowLock("diaries", cleanId, context.requestId, false);
      return {
        success: false,
        error: `日记不存在或无权修改 (ID: ${cleanId})`,
        summary: "更新日记失败：目标记录不存在",
      };
    }

    // 3. 计算新值
    const newTitle = title !== undefined && typeof title === "string" && title.trim()
      ? title.trim()
      : oldRow.title;

    let newContent = oldRow.content || "";
    if (args?.append === true && content !== undefined && typeof content === "string") {
      newContent = newContent ? `${newContent}\n\n${content.trim()}` : content.trim();
    } else if (content !== undefined && typeof content === "string") {
      newContent = content;
    } else if (appendContent && typeof appendContent === "string" && appendContent.trim()) {
      newContent = newContent ? `${newContent}\n\n${appendContent.trim()}` : appendContent.trim();
    }

    const newWeather = weather !== undefined ? weather : oldRow.weather;
    const newMood = mood !== undefined ? mood : oldRow.mood;
    const now = new Date();

    // 4. 执行更新
    const updateSql = `
      UPDATE diaries
      SET title = ?, content = ?, weather = ?, mood = ?, updated_at = ?
      WHERE id = ? AND user_id = ?;
    `;
    const updateRes = await executeQuery(updateSql, [
      newTitle,
      newContent,
      newWeather,
      newMood,
      now,
      cleanId,
      context.userId,
    ]);

    if (updateRes.status === 0) {
      await RowLockManager.releaseRowLock("diaries", cleanId, context.requestId, false);
      return {
        success: false,
        error: `更新日记 SQL 执行失败: ${updateRes.content}`,
        summary: "更新日记失败",
      };
    }

    // 5. 驱逐缓存
    await delKV("diaries", cleanId);

    // 6. 注册 Saga 撤销闭包 (若后续异常可回滚至旧快照)
    const undoFn = async () => {
      await executeQuery(
        "UPDATE diaries SET title = ?, content = ?, weather = ?, mood = ?, updated_at = ? WHERE id = ?",
        [oldRow.title, oldRow.content, oldRow.weather, oldRow.mood, oldRow.updated_at, cleanId]
      ).catch(() => {});
      await setKV("diaries", cleanId, oldRow).catch(() => {});
    };
    if (context.withdrawStack) {
      context.withdrawStack.push(undoFn);
    }

    // 7. 释放行锁
    await RowLockManager.releaseRowLock("diaries", cleanId, context.requestId, true);

    const updatedFields: string[] = [];
    if (newTitle !== oldRow.title) updatedFields.push("title");
    if (newContent !== oldRow.content) updatedFields.push("content");
    if (newWeather !== oldRow.weather) updatedFields.push("weather");
    if (newMood !== oldRow.mood) updatedFields.push("mood");
    updatedFields.push("updatedAt");

    return {
      success: true,
      data: {
        id: cleanId,
        diaryId: cleanId,
        title: newTitle,
        updatedFields,
        charCount: newContent.length,
        newCharCount: newContent.length,
        updatedAt: now.toISOString(),
        message: "日记已成功更新",
      },
      summary: `已成功更新日记《${newTitle}》(${newContent.length} 字)`,
    };
  } catch (err) {
    await RowLockManager.releaseRowLock("diaries", cleanId, context.requestId, false);
    return {
      success: false,
      error: `update_diary 异常: ${tryCatchErrorToString(err)}`,
      summary: "更新日记异常",
    };
  }
};

// =========================================================================
// 7. delete_diary (删除日记 - 强制二次确认安全防线)
// =========================================================================
export const deleteDiaryTool: AgentToolDefinition = {
  type: "function",
  function: {
    name: "delete_diary",
    description:
      "删除指定的日记。属于不可逆的破坏性操作，强制要求用户已明确给出删除指示且参数 confirmed 必须为 true。",
    parameters: {
      type: "object",
      properties: {
        diaryId: {
          type: "string",
          description: "要删除的日记 ID",
        },
        confirmed: {
          type: "boolean",
          description:
            "是否已获得用户明确的二次确认指令。必须为 true 才会执行真实删除",
        },
      },
      required: ["diaryId", "confirmed"],
    },
  },
};

export const deleteDiaryExecutor: AgentToolExecutor = async (
  args,
  context
): Promise<AgentToolResult> => {
  try {
    const { diaryId, confirmed } = args || {};

    if (!diaryId || typeof diaryId !== "string" || !diaryId.trim()) {
      return {
        success: false,
        error: "缺少目标日记 ID (diaryId)",
        summary: "删除失败：缺少日记 ID",
      };
    }

    const cleanId = diaryId.trim();

    // 安全防御红线：必须携带 confirmed: true
    if (confirmed !== true) {
      return {
        success: false,
        error: "SAFETY_CONFIRMATION_REQUIRED",
        summary: "需要用户二次确认",
        data: {
          message:
            "⚠️ 警告：删除日记属于不可逆的破坏性操作。请向用户明确确认：‘确认要永久删除这篇日记吗？’，待用户确认后再传入 confirmed: true 执行删除。",
        },
      };
    }

    // 1. 申请行级排他锁保护
    const lockAcq = await RowLockManager.acquireRowLock(
      "diaries",
      cleanId,
      "DELETE",
      context.requestId,
      10000
    );

    if (lockAcq.status === 0) {
      return {
        success: false,
        error: `获取日记行锁失败: ${lockAcq.content}`,
        summary: "删除日记失败：存在并发操作冲突",
      };
    }

    try {
      // 2. 核验归属权
      const selectRes = await executeQuery<any>(
        "SELECT id, title FROM diaries WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1;",
        [cleanId, context.userId]
      );

      const targetRow = selectRes.data?.[0];
      if (!targetRow) {
        await RowLockManager.releaseRowLock("diaries", cleanId, context.requestId, false);
        return {
          success: false,
          error: `日记不存在或已被删除 (ID: ${cleanId})`,
          summary: "删除失败：日记不存在或无权操作",
        };
      }

      // 3. 执行软删除 (保留审计痕迹)
      const deleteSql = "UPDATE diaries SET deleted_at = NOW() WHERE id = ? AND user_id = ?;";
      const deleteRes = await executeQuery(deleteSql, [cleanId, context.userId]);

      if (deleteRes.status === 0) {
        await RowLockManager.releaseRowLock("diaries", cleanId, context.requestId, false);
        return {
          success: false,
          error: `软删除 SQL 执行失败: ${deleteRes.content}`,
          summary: "删除日记失败",
        };
      }

      // 4. 驱逐缓存
      await delKV("diaries", cleanId);

      // 5. 绑定撤销闭包
      const undoFn = async () => {
        await executeQuery(
          "UPDATE diaries SET deleted_at = NULL WHERE id = ? AND user_id = ?",
          [cleanId, context.userId]
        ).catch(() => {});
        await setKV("diaries", cleanId, targetRow).catch(() => {});
      };
      if (context.withdrawStack) {
        context.withdrawStack.push(undoFn);
      }

      // 6. 释放行锁
      await RowLockManager.releaseRowLock("diaries", cleanId, context.requestId, true);

      return {
        success: true,
        data: {
          id: cleanId,
          diaryId: cleanId,
          title: targetRow.title,
          message: `日记《${targetRow.title}》已成功删除`,
        },
        summary: `已成功删除日记《${targetRow.title}》`,
      };
    } catch (err) {
      await RowLockManager.releaseRowLock("diaries", cleanId, context.requestId, false);
      throw err;
    }
  } catch (err) {
    return {
      success: false,
      error: `delete_diary 异常: ${tryCatchErrorToString(err)}`,
      summary: "删除日记异常",
    };
  }
};

// =========================================================================
// 8. get_recent_diaries (获取最近日记列表与摘要)
// =========================================================================
export const getRecentDiariesTool: AgentToolDefinition = {
  type: "function",
  function: {
    name: "get_recent_diaries",
    description:
      "获取用户最近创作的日记列表与内容摘要。当用户询问“我最近写了什么”、“看看我近期的日记”、“最近生活怎么样”或刚打招呼需要了解近况时，应优先调用此工具快速感知最新动态。",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "获取的日记篇数，默认 5，范围 1~20",
        },
      },
    },
  },
};

export const getRecentDiariesExecutor: AgentToolExecutor = async (
  args,
  context
): Promise<AgentToolResult> => {
  try {
    const limit = Math.min(Math.max(Number(args?.limit) || 5, 1), 20);
    const sql = `
      SELECT id, title, content, weather, mood, is_public, created_at, updated_at
      FROM diaries
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ?;
    `;
    const res = await executeQuery<any>(sql, [context.userId, limit]);
    if (res.status === 0) {
      return {
        success: false,
        error: `获取最近日记失败: ${res.content}`,
        summary: "获取最近日记失败",
      };
    }

    const rows = res.data || [];
    const diaries = rows.map((row: any) => {
      const fullText = row.content || "";
      const snippet =
        fullText.replace(/[\r\n\t]+/g, " ").slice(0, 180) +
        (fullText.length > 180 ? "..." : "");
      return {
        id: row.id,
        title: row.title || "无标题手记",
        createdAt: row.created_at,
        weather: row.weather,
        mood: row.mood,
        charCount: fullText.length,
        snippet,
      };
    });

    return {
      success: true,
      data: {
        total: diaries.length,
        diaries,
      },
      summary: `已调取最近 ${diaries.length} 篇日记`,
    };
  } catch (err) {
    return {
      success: false,
      error: `get_recent_diaries 异常: ${tryCatchErrorToString(err)}`,
      summary: "获取最近日记异常",
    };
  }
};

// =========================================================================
// 9. get_diaries_by_date (按具体自然日提取日记全文)
// =========================================================================
export const getDiariesByDateTool: AgentToolDefinition = {
  type: "function",
  function: {
    name: "get_diaries_by_date",
    description:
      "精确提取指定自然日期（如 2026-09-17）内记录的所有日记全文与元数据。当用户询问“我昨天写了什么”、“X月X日那天发生了什么”时调用。",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "目标日期，格式为 YYYY-MM-DD (例如 2026-09-18)",
        },
      },
      required: ["date"],
    },
  },
};

export const getDiariesByDateExecutor: AgentToolExecutor = async (
  args,
  context
): Promise<AgentToolResult> => {
  try {
    const rawDate = (args?.date || "").trim();
    if (!rawDate) {
      return {
        success: false,
        error: "缺少目标日期 (date)",
        summary: "查询失败：未指定日期",
      };
    }

    // 简单校验 YYYY-MM-DD 格式
    const match = rawDate.match(/^\d{4}-\d{2}-\d{2}$/);
    if (!match) {
      return {
        success: false,
        error: `日期格式不规范: [${rawDate}]，请使用 YYYY-MM-DD 格式`,
        summary: "日期格式错误",
      };
    }

    const startOfDay = `${rawDate} 00:00:00`;
    const endOfDay = `${rawDate} 23:59:59`;

    const sql = `
      SELECT id, title, content, weather, mood, is_public, created_at, updated_at
      FROM diaries
      WHERE user_id = ? AND deleted_at IS NULL AND created_at >= ? AND created_at <= ?
      ORDER BY created_at ASC;
    `;
    const res = await executeQuery<any>(sql, [context.userId, startOfDay, endOfDay]);
    if (res.status === 0) {
      return {
        success: false,
        error: `查询 ${rawDate} 日记失败: ${res.content}`,
        summary: "提取日期手记失败",
      };
    }

    const rows = res.data || [];
    const diaries = rows.map((row: any) => ({
      id: row.id,
      title: row.title || "无标题手记",
      content: row.content || "",
      weather: row.weather,
      mood: row.mood,
      createdAt: row.created_at,
    }));

    return {
      success: true,
      data: {
        date: rawDate,
        count: diaries.length,
        diaries,
      },
      summary:
        diaries.length > 0
          ? `找到 ${rawDate} 当天记录的 ${diaries.length} 篇日记`
          : `${rawDate} 当天未记录日记`,
    };
  } catch (err) {
    return {
      success: false,
      error: `get_diaries_by_date 异常: ${tryCatchErrorToString(err)}`,
      summary: "查询日期日记异常",
    };
  }
};

// =========================================================================
// 10. analyze_mood_trends (周期情绪晴雨表与心理轨迹分析)
// =========================================================================
export const analyzeMoodTrendsTool: AgentToolDefinition = {
  type: "function",
  function: {
    name: "analyze_mood_trends",
    description:
      "按时间轴深度分析用户的心情波动趋势、积极与消极情绪比例以及情绪转变节点。用于生成心理晴雨表周报或月报。",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "integer",
          description: "回溯的天数跨度，默认 30 天，范围 7~365 天",
        },
      },
    },
  },
};

export const analyzeMoodTrendsExecutor: AgentToolExecutor = async (
  args,
  context
): Promise<AgentToolResult> => {
  try {
    const days = Math.min(Math.max(Number(args?.days) || 30, 7), 365);
    const sql = `
      SELECT id, title, mood, weather, created_at, CHAR_LENGTH(content) as charCount
      FROM diaries
      WHERE user_id = ? AND deleted_at IS NULL AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY created_at ASC;
    `;
    const res = await executeQuery<any>(sql, [context.userId, days]);
    if (res.status === 0) {
      return {
        success: false,
        error: `分析心情走势失败: ${res.content}`,
        summary: "情绪分析失败",
      };
    }

    const rows = res.data || [];
    const moodCounts: Record<string, number> = {};
    const timeline: Array<{ date: string; title: string; mood: string; weather: string }> = [];

    for (const row of rows) {
      const mood = row.mood || "Calm";
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      timeline.push({
        date: String(row.created_at).slice(0, 10),
        title: row.title || "无标题",
        mood,
        weather: row.weather || "未知",
      });
    }

    const total = rows.length;
    const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
    const dominantMood = sortedMoods[0]?.[0] || "平静";

    return {
      success: true,
      data: {
        windowDays: days,
        totalEntries: total,
        dominantMood,
        moodCounts,
        timeline,
      },
      summary:
        total > 0
          ? `已分析近 ${days} 天共 ${total} 篇手记的情绪轨迹，主导心情为「${dominantMood}」`
          : `近 ${days} 天暂无手记记录`,
    };
  } catch (err) {
    return {
      success: false,
      error: `analyze_mood_trends 异常: ${tryCatchErrorToString(err)}`,
      summary: "心情走势分析异常",
    };
  }
};

// =========================================================================
// 统一聚合导出
// =========================================================================
export const diaryTools: AgentToolDefinition[] = [
  searchDiariesTool,
  locateDiaryContentTool,
  readDiaryDetailTool,
  getDiaryTimelineStatsTool,
  getRecentDiariesTool,
  getDiariesByDateTool,
  analyzeMoodTrendsTool,
  createDiaryTool,
  updateDiaryTool,
  deleteDiaryTool,
];

export const diaryExecutors: Record<string, AgentToolExecutor> = {
  search_diaries: searchDiariesExecutor,
  locate_diary_content: locateDiaryContentExecutor,
  read_diary_detail: readDiaryDetailExecutor,
  get_diary_timeline_stats: getDiaryTimelineStatsExecutor,
  get_recent_diaries: getRecentDiariesExecutor,
  get_diaries_by_date: getDiariesByDateExecutor,
  analyze_mood_trends: analyzeMoodTrendsExecutor,
  create_diary: createDiaryExecutor,
  update_diary: updateDiaryExecutor,
  delete_diary: deleteDiaryExecutor,
};
