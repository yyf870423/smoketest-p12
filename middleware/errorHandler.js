'use strict';

/**
 * 404 Not Found 处理
 */
function notFound(req, res, next) {
  res.status(404);
  // 尝试渲染错误视图，失败时降级为纯文本
  try {
    res.render('errors/404', { title: '页面未找到' });
  } catch (e) {
    res.send('404 - 页面未找到');
  }
}

/**
 * 500 Internal Server Error 处理
 * Express 错误处理中间件必须接收 4 个参数
 */
// eslint-disable-next-line no-unused-vars
function serverError(err, req, res, next) {
  console.error('[serverError]', err.stack || err.message || err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode);
  try {
    res.render('errors/500', {
      title: '服务器错误',
      message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : (err.message || '未知错误'),
    });
  } catch (e) {
    res.send('500 - 服务器内部错误');
  }
}

module.exports = { notFound, serverError };
