'use strict';

/**
 * 后台路由
 *
 * GET  /admin/login          → 登录页
 * POST /admin/login          → 提交登录
 * GET  /admin/logout         → 退出登录
 * GET  /admin/articles       → 文章列表（需登录）
 * GET  /admin/articles/new   → 新建文章页（需登录）
 * POST /admin/articles       → 提交新建（需登录）
 * GET  /admin/articles/:id/edit → 编辑文章页（需登录）
 * POST /admin/articles/:id   → 提交更新（需登录）
 * POST /admin/articles/:id/delete → 删除文章（需登录）
 */

const express   = require('express');
const router    = express.Router();
const User      = require('../models/User');
const Article   = require('../models/Article');
const { requireAuth, redirectIfAuthenticated } = require('../middleware/auth');

const ADMIN_PAGE_SIZE = 20;

/* ------------------------------------------------------------------ */
/* 登录 / 退出                                                         */
/* ------------------------------------------------------------------ */

/**
 * GET /admin/login  登录页面
 */
router.get('/admin/login', redirectIfAuthenticated, (req, res) => {
  return res.render('admin/login', {
    title: '管理员登录',
    error: null,
  });
});

/**
 * POST /admin/login  处理登录
 */
router.post('/admin/login', redirectIfAuthenticated, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.render('admin/login', {
        title: '管理员登录',
        error: '用户名和密码不能为空',
      });
    }

    const user = await User.verifyPassword(String(username), String(password));
    if (!user) {
      return res.render('admin/login', {
        title: '管理员登录',
        error: '用户名或密码错误',
      });
    }

    req.session.userId   = user.id;
    req.session.username = user.username;
    return res.redirect('/admin/articles');
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /admin/logout  退出登录
 */
router.get('/admin/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    return res.redirect('/admin/login');
  });
});

/* ------------------------------------------------------------------ */
/* 文章管理（需登录）                                                  */
/* ------------------------------------------------------------------ */

/**
 * GET /admin/articles  文章列表
 */
router.get('/admin/articles', requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const { rows, total } = await Article.listAll(page, ADMIN_PAGE_SIZE);
    const totalPages = Math.ceil(total / ADMIN_PAGE_SIZE);

    return res.render('admin/articles', {
      title:       '文章管理',
      articles:    rows,
      currentPage: page,
      totalPages,
      total,
      username:    req.session.username,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /admin/articles/new  新建文章页
 */
router.get('/admin/articles/new', requireAuth, (req, res) => {
  return res.render('admin/edit', {
    title:    '新建文章',
    article:  { id: null, title: '', content: '', tags: '', status: 'draft' },
    isNew:    true,
    error:    null,
    username: req.session.username,
  });
});

/**
 * POST /admin/articles  提交新建文章
 */
router.post('/admin/articles', requireAuth, async (req, res, next) => {
  try {
    let { title, content, tags, status } = req.body;

    title   = String(title   || '').trim();
    content = String(content || '').trim();
    tags    = String(tags    || '').trim();
    status  = ['published', 'draft'].includes(status) ? status : 'draft';

    if (!title) {
      return res.render('admin/edit', {
        title:    '新建文章',
        article:  { id: null, title, content, tags, status },
        isNew:    true,
        error:    '文章标题不能为空',
        username: req.session.username,
      });
    }

    if (!content) {
      return res.render('admin/edit', {
        title:    '新建文章',
        article:  { id: null, title, content, tags, status },
        isNew:    true,
        error:    '文章内容不能为空',
        username: req.session.username,
      });
    }

    const { id } = await Article.create({ title, content, tags, status });
    return res.redirect(`/admin/articles/${id}/edit?created=1`);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /admin/articles/:id/edit  编辑文章页
 */
router.get('/admin/articles/:id/edit', requireAuth, async (req, res, next) => {
  try {
    const id      = parseInt(req.params.id);
    if (!id || id < 1) {
      return res.status(404).render('errors/404', { title: '页面不存在', profile: null });
    }
    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).render('errors/404', { title: '页面不存在', profile: null });
    }

    return res.render('admin/edit', {
      title:    `编辑文章 - ${article.title}`,
      article,
      isNew:    false,
      error:    null,
      saved:    req.query.saved === '1',
      created:  req.query.created === '1',
      username: req.session.username,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /admin/articles/:id  提交更新文章
 */
router.post('/admin/articles/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || id < 1) {
      return res.status(404).render('errors/404', { title: '页面不存在', profile: null });
    }

    let { title, content, tags, status } = req.body;
    title   = String(title   || '').trim();
    content = String(content || '').trim();
    tags    = String(tags    || '').trim();
    status  = ['published', 'draft'].includes(status) ? status : 'draft';

    if (!title) {
      const article = await Article.findById(id);
      return res.render('admin/edit', {
        title:    '编辑文章',
        article:  { ...article, title, content, tags, status },
        isNew:    false,
        error:    '文章标题不能为空',
        username: req.session.username,
      });
    }

    if (!content) {
      const article = await Article.findById(id);
      return res.render('admin/edit', {
        title:    '编辑文章',
        article:  { ...article, title, content, tags, status },
        isNew:    false,
        error:    '文章内容不能为空',
        username: req.session.username,
      });
    }

    const { affectedRows } = await Article.update(id, { title, content, tags, status });
    if (!affectedRows) {
      return res.status(404).render('errors/404', { title: '页面不存在', profile: null });
    }
    return res.redirect(`/admin/articles/${id}/edit?saved=1`);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /admin/articles/:id/delete  删除文章（软删除）
 */
router.post('/admin/articles/:id/delete', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || id < 1) {
      return res.status(404).render('errors/404', { title: '页面不存在', profile: null });
    }
    await Article.softDelete(id);
    return res.redirect('/admin/articles?deleted=1');
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
