'use strict';

/**
 * Article Model
 *
 * 封装所有文章相关的数据库操作，提供统一的 CRUD 接口。
 *
 * ⚠️ mysql2 类型安全说明：
 *   - safeString()：防御 TEXT/LONGTEXT 字段在 mysql2 某些版本中返回 Buffer
 *   - formatDate()：防御 DATETIME 字段返回 Date 对象 / 字符串 / undefined 不一致
 *   - LIMIT/OFFSET 参数必须为 Number 类型（parseInt 强制转换）
 *   - status 字段使用 VARCHAR(20)（已规避 ENUM Prepared Statement Bug）
 */

const pool = require('../config/database');

/** 合法的文章状态值 */
const VALID_STATUSES = ['published', 'draft', 'deleted'];

/**
 * 安全地将 mysql2 返回的字段值转为字符串。
 * 防御 TEXT/LONGTEXT 字段在 mysql2 某些版本中返回 Buffer 的 Bug。
 * @param {Buffer|string|null|undefined} value
 * @returns {string}
 */
function safeString(value) {
  if (value === null || value === undefined) return '';
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  return String(value);
}

/**
 * 安全地将 mysql2 返回的 DATETIME 字段格式化为 'YYYY-MM-DD' 字符串。
 * 防御 mysql2 在不同配置下返回 Date 对象、字符串或 undefined 的不一致行为。
 * @param {Date|string|null|undefined} value
 * @returns {string} 格式：'YYYY-MM-DD'，或空字符串（无效值时）
 */
function formatDate(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

/**
 * 将数据库原始行数据规范化，确保字段类型安全。
 * @param {object} row
 * @returns {object}
 */
function normalizeRow(row) {
  if (!row) return null;
  return {
    id:         row.id,
    title:      safeString(row.title),
    content:    safeString(row.content),
    tags:       safeString(row.tags),
    status:     safeString(row.status),
    created_at: formatDate(row.created_at),
    updated_at: formatDate(row.updated_at),
  };
}

const Article = {
  /**
   * 查询已发布文章列表（分页，不含正文）
   * @param {number} page  页码（从 1 开始）
   * @param {number} pageSize  每页条数（默认 10）
   * @returns {Promise<{rows: object[], total: number}>}
   */
  async listPublished(page = 1, pageSize = 10) {
    // ⚠️ LIMIT/OFFSET 必须为 Number
    const limit  = parseInt(pageSize) || 10;
    const offset = (parseInt(page) - 1) * limit;

    const [rows] = await pool.execute(
      `SELECT id, title, tags, status, created_at, updated_at
       FROM articles
       WHERE status = 'published'
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[countRow]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM articles WHERE status = 'published'`
    );

    return {
      rows:  rows.map(normalizeRow),
      total: countRow.total,
    };
  },

  /**
   * 根据 ID 查询文章详情（仅已发布）
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async findPublishedById(id) {
    const [rows] = await pool.execute(
      `SELECT id, title, content, tags, status, created_at, updated_at
       FROM articles
       WHERE id = ? AND status = 'published'`,
      [parseInt(id)]
    );
    return rows.length ? normalizeRow(rows[0]) : null;
  },

  /**
   * 后台文章列表（含草稿，不含已删除）
   * @param {number} page
   * @param {number} pageSize
   * @returns {Promise<{rows: object[], total: number}>}
   */
  async listAll(page = 1, pageSize = 20) {
    const limit  = parseInt(pageSize) || 20;
    const offset = (parseInt(page) - 1) * limit;

    const [rows] = await pool.execute(
      `SELECT id, title, tags, status, created_at, updated_at
       FROM articles
       WHERE status != 'deleted'
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[countRow]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM articles WHERE status != 'deleted'`
    );

    return {
      rows:  rows.map(normalizeRow),
      total: countRow.total,
    };
  },

  /**
   * 根据 ID 查询文章（后台使用，含草稿）
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT id, title, content, tags, status, created_at, updated_at
       FROM articles
       WHERE id = ? AND status != 'deleted'`,
      [parseInt(id)]
    );
    return rows.length ? normalizeRow(rows[0]) : null;
  },

  /**
   * 创建新文章
   * @param {object} data  { title, content, tags, status }
   * @returns {Promise<{id: number}>}
   */
  async create({ title, content, tags = '', status = 'draft' }) {
    if (!VALID_STATUSES.includes(status)) {
      throw new Error(`非法文章状态: ${status}`);
    }
    const [result] = await pool.execute(
      `INSERT INTO articles (title, content, tags, status)
       VALUES (?, ?, ?, ?)`,
      [String(title), String(content), String(tags), String(status)]
    );
    return { id: result.insertId };
  },

  /**
   * 更新文章
   * @param {number} id
   * @param {object} data  { title, content, tags, status }
   * @returns {Promise<{affectedRows: number}>}
   */
  async update(id, { title, content, tags, status }) {
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      throw new Error(`非法文章状态: ${status}`);
    }
    const [result] = await pool.execute(
      `UPDATE articles
       SET title = ?, content = ?, tags = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status != 'deleted'`,
      [String(title), String(content), String(tags), String(status), parseInt(id)]
    );
    return { affectedRows: result.affectedRows };
  },

  /**
   * 软删除文章（status 设为 'deleted'）
   * @param {number} id
   * @returns {Promise<{affectedRows: number}>}
   */
  async softDelete(id) {
    const [result] = await pool.execute(
      `UPDATE articles
       SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status != 'deleted'`,
      [parseInt(id)]
    );
    return { affectedRows: result.affectedRows };
  },
};

// 导出工具函数供测试使用
Article._safeString = safeString;
Article._formatDate = formatDate;

module.exports = Article;
