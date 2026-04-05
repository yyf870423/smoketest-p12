'use strict';

/**
 * 认证中间件 - 验证用户是否已登录（后台路由保护）
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  // 未登录，重定向到后台登录页
  return res.redirect('/admin/login');
}

/**
 * 已登录用户访问登录页时重定向到后台首页
 */
function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/admin/articles');
  }
  return next();
}

module.exports = { requireAuth, redirectIfAuthenticated };
