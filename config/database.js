'use strict';

/**
 * MySQL 连接池配置
 * ⚠️ 关键配置说明（防御 mysql2 已知 Bug）：
 *   - charset: 'utf8mb4'  → 防止 TEXT/LONGTEXT 字段返回 Buffer
 *   - timezone: '+08:00'  → 防止 DATETIME 时区偏移导致 Invalid Date
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:                   process.env.DB_HOST || '127.0.0.1',
  port:                   parseInt(process.env.DB_PORT) || 3306,
  user:                   process.env.DB_USER || 'root',
  password:               process.env.DB_PASSWORD || '',
  database:               process.env.DB_NAME || 'blog_dev',
  charset:                'utf8mb4',       // ⚠️ 防 TEXT 字段返回 Buffer 的关键配置
  timezone:               '+08:00',        // ⚠️ 防 DATETIME 时区偏移导致 Invalid Date
  waitForConnections:     true,
  connectionLimit:        5,               // 个人博客低并发足够
  queueLimit:             0,
  enableKeepAlive:        true,
  keepAliveInitialDelay:  0,
});

// 启动时测试连接，快速发现配置错误
// 仅在非测试环境执行（避免单元测试时触发真实 DB 连接）
if (process.env.NODE_ENV !== 'test') {
  pool.query('SELECT 1').then(() => {
    console.log('[db] MySQL 连接池就绪');
  }).catch((err) => {
    console.error('[db] MySQL 连接失败:', err.message);
    // 测试/初始化场景不强制退出，生产环境由 init-db 保证可用性
  });
}

module.exports = pool;
