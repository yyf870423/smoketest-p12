'use strict';

/**
 * 数据库初始化脚本
 *
 * 用途：首次部署时执行，创建数据库表结构并写入默认管理员账号。
 * 执行方式：npm run init-db
 *
 * ⚠️ 注意事项：
 *   - 仅在 DB_NAME 数据库中建表，不会删除已有数据
 *   - 默认管理员密码从环境变量 ADMIN_PASSWORD 读取（默认 admin123）
 *   - 使用 VARCHAR(20) 而非 ENUM，规避 mysql2 Prepared Statement 的 ENUM 解析 Bug
 */

require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'blog_dev',
  charset:  'utf8mb4',
  timezone: '+08:00',
};

const SQL_CREATE_ARTICLES = `
CREATE TABLE IF NOT EXISTS articles (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  title       VARCHAR(255)   NOT NULL COMMENT '文章标题',
  content     LONGTEXT       NOT NULL COMMENT '文章正文（Markdown / 纯文本）',
  tags        VARCHAR(500)   NOT NULL DEFAULT '' COMMENT '逗号分隔的标签字符串',
  status      VARCHAR(20)    NOT NULL DEFAULT 'draft' COMMENT 'published | draft | deleted',
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='文章表';
`.trim();

const SQL_CREATE_USERS = `
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  username      VARCHAR(50)   NOT NULL UNIQUE COMMENT '管理员用户名',
  password_hash VARCHAR(100)  NOT NULL COMMENT 'bcrypt 哈希',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='管理员用户表';
`.trim();

async function main() {
  let conn;
  try {
    console.log('[init-db] 连接数据库...');
    conn = await mysql.createConnection(dbConfig);

    console.log('[init-db] 创建 articles 表...');
    await conn.execute(SQL_CREATE_ARTICLES);
    console.log('[init-db] articles 表就绪');

    console.log('[init-db] 创建 users 表...');
    await conn.execute(SQL_CREATE_USERS);
    console.log('[init-db] users 表就绪');

    // 检查是否已有管理员账号
    const [rows] = await conn.execute('SELECT COUNT(*) AS cnt FROM users');
    const count = rows[0].cnt;

    if (count === 0) {
      const adminUser     = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const hash          = await bcrypt.hash(adminPassword, 10);

      await conn.execute(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        [adminUser, hash]
      );
      console.log(`[init-db] 已创建默认管理员账号: ${adminUser}`);
      console.log('[init-db] ⚠️  请在生产环境中立即修改默认密码！');
    } else {
      console.log('[init-db] 管理员账号已存在，跳过创建');
    }

    console.log('[init-db] 初始化完成 ✓');
  } catch (err) {
    console.error('[init-db] 初始化失败:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

main();
