import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 优先查找 Backend/.env，以及当前工作目录下的 .env
const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'Backend/.env')
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DB || 'diary_system',
  connectTimeout: parseInt(process.env.MYSQL_CONNECT_TIMEOUT || '10000', 10),
  charset: process.env.MYSQL_CHARSET || 'utf8mb4'
};

async function initTables() {
  console.log(`🔌 正在连接 MySQL 服务端 [${dbConfig.host}:${dbConfig.port}] 用户: ${dbConfig.user}...`);

  // 1. 先连接 MySQL 服务端实例，确保目标数据库存在
  const rootConn = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    connectTimeout: dbConfig.connectTimeout,
  });

  await rootConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  console.log(`✅ 数据库 [${dbConfig.database}] 核验/创建成功`);
  await rootConn.end();

  // 2. 连接到具体数据库，初始化业务表结构
  const conn = await mysql.createConnection({
    ...dbConfig
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(64) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      nickname VARCHAR(64),
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✅ Table users created or exists.');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS diaries (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content LONGTEXT,
      weather VARCHAR(32) DEFAULT 'Sunny',
      mood VARCHAR(32) DEFAULT 'Happy',
      is_public TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_user_created (user_id, created_at DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✅ Table diaries created or exists.');

  await conn.end();
  console.log('🎉 数据库表结构自愈初始化完成！');
}

initTables().catch((err) => {
  console.error('❌ 初始化数据库表结构失败:', err.message || err);
  process.exit(1);
});
