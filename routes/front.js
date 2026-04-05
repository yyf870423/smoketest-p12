'use strict';

/**
 * 前台路由
 *
 * GET /              → 文章列表页（分页）
 * GET /article/:id   → 文章详情页
 * GET /about         → 个人简介页
 */

const express = require('express');
const router  = express.Router();
const Article = require('../models/Article');
const profile = require('../config/profile');

const PAGE_SIZE = 10;

/**
 * 文章列表页
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const { rows, total } = await Article.listPublished(page, PAGE_SIZE);
    const totalPages = Math.ceil(total / PAGE_SIZE);

    return res.render('front/index', {
      articles:    rows,
      currentPage: page,
      totalPages,
      total,
      profile,
      title:       profile.name,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * 文章详情页
 */
router.get('/article/:id', async (req, res, next) => {
  try {
    const id      = parseInt(req.params.id);
    if (!id || id < 1) {
      return res.status(404).render('errors/404', { title: '页面不存在', profile });
    }
    const article = await Article.findPublishedById(id);
    if (!article) {
      return res.status(404).render('errors/404', { title: '页面不存在', profile });
    }
    return res.render('front/article', {
      article,
      profile,
      title: article.title,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * 个人简介页
 */
router.get('/about', (req, res) => {
  return res.render('front/about', {
    profile,
    title: '关于我',
  });
});

module.exports = router;
