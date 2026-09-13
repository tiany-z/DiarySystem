import i18next from "i18next";
export let logLanguage = "zh";
export let i18nLanguage = "zh";
export function setLogLanguage(lang) {
    logLanguage = lang;
    i18nLanguage = lang;
}
export const i18nPromise = i18next.init({
    lng: "zh",
    fallbackLng: "zh",
    resources: {
        zh: {
            translation: {
                "为保证高并发系统的性能，因此只能进行单表查询": "为保证高并发系统的性能，因此只能进行单表查询",
                "检测到危险SQL关键字，已拦截: {{keyword}}": "检测到危险SQL关键字，已拦截: {{keyword}}",
                "SQL片段超出最大长度限制（1000个字符）": "SQL片段超出最大长度限制（1000个字符）",
                "whereGroup 中的比较运算符(组)位置错误": "whereGroup 中的比较运算符(组)位置错误",
                "whereGroup 中的逻辑运算符位置错误": "whereGroup 中的逻辑运算符位置错误",
                "limitNode limit类型错误": "limitNode limit类型错误",
                "插入操作只能针对一个表": "插入操作只能针对一个表",
                "存在重复的列名": "存在重复的列名",
                "更新和删除操作必须且只能指定 ID 进行": "更新和删除操作必须且只能指定 ID 进行",
                "数据库连接池未初始化": "数据库连接池未初始化",
                "Redis客户端未初始化": "Redis客户端未初始化",
                "行锁获取超时或被拒绝": "行锁获取超时或被拒绝",
                "WS重连超时(N秒)发送失败": "WS重连超时(N秒)发送失败"
            }
        },
        en: {
            translation: {
                "为保证高并发系统的性能，因此只能进行单表查询": "Single table query only for high concurrency performance",
                "检测到危险SQL关键字，已拦截: {{keyword}}": "Dangerous SQL keyword detected and blocked: {{keyword}}",
                "SQL片段超出最大长度限制（1000个字符）": "SQL fragment exceeds maximum length of 1000 characters",
                "whereGroup 中的比较运算符(组)位置错误": "Invalid compare operator location in whereGroup",
                "whereGroup 中的逻辑运算符位置错误": "Invalid logical operator location in whereGroup",
                "limitNode limit类型错误": "Invalid limit type in limitNode",
                "插入操作只能针对一个表": "Insert operation must target a single table",
                "存在重复的列名": "Duplicate column names detected",
                "更新和删除操作必须且只能指定 ID 进行": "Update and delete operations must specify exact ID",
                "数据库连接池未初始化": "Database pool not initialized",
                "Redis客户端未初始化": "Redis client not initialized",
                "行锁获取超时或被拒绝": "Row lock acquisition timed out or rejected",
                "WS重连超时(N秒)发送失败": "WebSocket reconnect grace period timed out"
            }
        }
    }
});
export default i18next;
//# sourceMappingURL=index.js.map