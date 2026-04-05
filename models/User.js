'use strict';

/**
 * User Model
 *
 * 封装管理员用户的数据库操作（单用户系统，仅存储登录凭证）。
 * 个人简介数据不在此 Model 中，由 config/profile.js 静态维护。
 *
 * ⚠️ mysql2 类型安全说明：
 *   - safeString()：防御字符串字段在某些 mysql2 版本中返回 Buffer
 *   - formatDate()：防御 DATETIME 字段类型不一致
 */

const pool   = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * 安全地将 mysql2 返回的字段值转为字符串。
 * @param {Buffer|string|null|undefined} value
 * @returns {string}
 */
function safeString(value) {
  if (value === null || value === undefined) return '';
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  return String(value);
}

/**
 * 安全地格式化 DATETIME 字段。
 * @param {Date|string|null|undefined} value
 * @returns {string}
 */
function formatDate(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/**
 * 将数据库原始行规范化（不暴露 password_hash）
 * @param {object} row
 * @returns {object}
 */
function normalizeRow(row) {
  if (!row) return null;
  return {
    id:         row.id,
    username:   safeString(row.username),
    created_at: formatDate(row.created_at),
  };
}

const User = {
  /**
   * 根据用户名查询用户（含 password_hash，用于登录验证）
   * @param {string} username
   * @returns {Promise<object|null>}
   */
  async findByUsername(username) {
    const [rows] = await pool.execute(
      `SELECT id, username, password_hash, created_at
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [String(username)]
    );
    if (!rows.length) return null;
    const row = rows[0];
    return {
      id:            row.id,
      username:      safeString(row.username),
      password_hash: safeString(row.password_hash),
      created_at:    formatDate(row.created_at),
    };
  },

  /**
   * 根据 ID 查询用户（不含 password_hash，用于 Session 恢复）
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT id, username, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [parseInt(id)]
    );
    return rows.length ? normalizeRow(rows[0]) : null;
  },

  /**
   * 验证登录凭证
   * @param {string} username
   * @param {string} plainPassword
   * @returns {Promise<object|null>}  验证成功返回用户对象（不含密码），失败返回 null
   */
  async verifyPassword(username, plainPassword) {
    const user = await User.findByUsername(username);
    if (!user) return null;
    const matched = await bcrypt.compare(plainPassword, user.password_hash);
    if (!matched) return null;
    return normalizeRow(user);
  },
};

module.exports = User;
