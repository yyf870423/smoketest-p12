'use strict';

/**
 * 数据层单元测试
 *
 * 使用 Jest Mock 模拟 MySQL 连接池，测试 Model 层逻辑。
 * 测试重点：
 *   1. safeString / formatDate 工具函数（mysql2 类型安全防御）
 *   2. Article / User Model 的数据处理逻辑
 *   3. LIMIT/OFFSET 参数类型转换
 *   4. 非法 status 校验
 */

// ===== Mock mysql2/promise（避免真实 DB 连接）=====
jest.mock('../config/database', () => {
  const mockPool = {
    execute: jest.fn(),
    query:   jest.fn(),
  };
  return mockPool;
});

// ===== Mock bcryptjs =====
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash:    jest.fn(),
}));

const pool   = require('../config/database');
const bcrypt = require('bcryptjs');
const Article = require('../models/Article');
const User    = require('../models/User');

// ===== 工具函数测试 =====
describe('Article._safeString()', () => {
  test('普通字符串直接返回', () => {
    expect(Article._safeString('hello')).toBe('hello');
  });

  test('Buffer 转为 UTF-8 字符串', () => {
    const buf = Buffer.from('中文内容', 'utf8');
    expect(Article._safeString(buf)).toBe('中文内容');
  });

  test('null 返回空字符串', () => {
    expect(Article._safeString(null)).toBe('');
  });

  test('undefined 返回空字符串', () => {
    expect(Article._safeString(undefined)).toBe('');
  });

  test('数字转为字符串', () => {
    expect(Article._safeString(42)).toBe('42');
  });
});

describe('Article._formatDate()', () => {
  test('Date 对象格式化为 YYYY-MM-DD', () => {
    const d = new Date('2026-04-06T12:00:00Z');
    expect(Article._formatDate(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('ISO 字符串格式化为 YYYY-MM-DD', () => {
    expect(Article._formatDate('2026-04-06T00:00:00.000Z')).toBe('2026-04-06');
  });

  test('null 返回空字符串', () => {
    expect(Article._formatDate(null)).toBe('');
  });

  test('undefined 返回空字符串', () => {
    expect(Article._formatDate(undefined)).toBe('');
  });

  test('无效字符串返回空字符串', () => {
    expect(Article._formatDate('not-a-date')).toBe('');
  });
});

// ===== Article Model 测试 =====
describe('Article.listPublished()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('正常分页查询', async () => {
    const fakeRows = [
      { id: 1, title: '测试文章', tags: 'Node.js', status: 'published',
        created_at: new Date('2026-04-01'), updated_at: new Date('2026-04-01') },
    ];
    pool.execute
      .mockResolvedValueOnce([fakeRows])          // 第一次调用：列表
      .mockResolvedValueOnce([[{ total: 1 }]]);   // 第二次调用：count

    const result = await Article.listPublished(1, 10);

    expect(result.rows).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.rows[0].title).toBe('测试文章');
  });

  test('LIMIT/OFFSET 参数为 Number 类型', async () => {
    pool.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    await Article.listPublished('2', '10'); // 传入字符串，应被转换

    const firstCall = pool.execute.mock.calls[0];
    const [limit, offset] = firstCall[1];
    expect(typeof limit).toBe('number');
    expect(typeof offset).toBe('number');
    expect(limit).toBe(10);
    expect(offset).toBe(10); // (2-1)*10 = 10
  });

  test('TEXT 字段为 Buffer 时自动转字符串', async () => {
    const fakeRows = [
      { id: 1, title: Buffer.from('Buffer标题', 'utf8'), tags: '', status: 'published',
        created_at: new Date(), updated_at: new Date() },
    ];
    pool.execute
      .mockResolvedValueOnce([fakeRows])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const result = await Article.listPublished(1, 10);
    expect(result.rows[0].title).toBe('Buffer标题');
  });
});

describe('Article.findPublishedById()', () => {
  beforeEach(() => jest.clearAllMocks());

  test('找到文章时返回规范化对象', async () => {
    pool.execute.mockResolvedValueOnce([[
      { id: 1, title: '文章', content: '内容', tags: '', status: 'published',
        created_at: new Date('2026-04-01'), updated_at: new Date('2026-04-01') },
    ]]);
    const article = await Article.findPublishedById(1);
    expect(article).not.toBeNull();
    expect(article.id).toBe(1);
  });

  test('未找到时返回 null', async () => {
    pool.execute.mockResolvedValueOnce([[]]);
    const article = await Article.findPublishedById(999);
    expect(article).toBeNull();
  });
});

describe('Article.create()', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功创建文章并返回 insertId', async () => {
    pool.execute.mockResolvedValueOnce([{ insertId: 5 }]);
    const result = await Article.create({
      title: '新文章', content: '内容', tags: 'Node.js', status: 'draft',
    });
    expect(result.id).toBe(5);
  });

  test('非法 status 抛出错误', async () => {
    await expect(Article.create({
      title: '标题', content: '内容', tags: '', status: 'invalid',
    })).rejects.toThrow('非法文章状态');
  });
});

describe('Article.update()', () => {
  beforeEach(() => jest.clearAllMocks());

  test('更新成功返回 affectedRows', async () => {
    pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const result = await Article.update(1, {
      title: '新标题', content: '新内容', tags: '', status: 'published',
    });
    expect(result.affectedRows).toBe(1);
  });

  test('非法 status 抛出错误', async () => {
    await expect(Article.update(1, {
      title: '标题', content: '内容', tags: '', status: 'bad',
    })).rejects.toThrow('非法文章状态');
  });
});

describe('Article.softDelete()', () => {
  beforeEach(() => jest.clearAllMocks());

  test('软删除成功', async () => {
    pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const result = await Article.softDelete(1);
    expect(result.affectedRows).toBe(1);
  });
});

// ===== User Model 测试 =====
describe('User.findByUsername()', () => {
  beforeEach(() => jest.clearAllMocks());

  test('找到用户时返回含 password_hash 的对象', async () => {
    pool.execute.mockResolvedValueOnce([[
      { id: 1, username: 'admin', password_hash: '$2b$10$xxx', created_at: new Date() },
    ]]);
    const user = await User.findByUsername('admin');
    expect(user).not.toBeNull();
    expect(user.password_hash).toBe('$2b$10$xxx');
  });

  test('用户不存在返回 null', async () => {
    pool.execute.mockResolvedValueOnce([[]]);
    const user = await User.findByUsername('nobody');
    expect(user).toBeNull();
  });
});

describe('User.verifyPassword()', () => {
  beforeEach(() => jest.clearAllMocks());

  test('密码正确时返回用户对象（不含 password_hash）', async () => {
    pool.execute.mockResolvedValueOnce([[
      { id: 1, username: 'admin', password_hash: '$2b$10$hash', created_at: new Date() },
    ]]);
    bcrypt.compare.mockResolvedValueOnce(true);

    const user = await User.verifyPassword('admin', 'correct_pass');
    expect(user).not.toBeNull();
    expect(user.username).toBe('admin');
    expect(user.password_hash).toBeUndefined(); // 不暴露密码
  });

  test('密码错误时返回 null', async () => {
    pool.execute.mockResolvedValueOnce([[
      { id: 1, username: 'admin', password_hash: '$2b$10$hash', created_at: new Date() },
    ]]);
    bcrypt.compare.mockResolvedValueOnce(false);

    const user = await User.verifyPassword('admin', 'wrong_pass');
    expect(user).toBeNull();
  });

  test('用户不存在时返回 null', async () => {
    pool.execute.mockResolvedValueOnce([[]]);
    const user = await User.verifyPassword('nobody', 'pass');
    expect(user).toBeNull();
  });
});
