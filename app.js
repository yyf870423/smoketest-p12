'use strict';

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 请求体解析
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Session 配置
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_in_production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24小时
  },
}));

// 视图引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 前台路由
const frontRouter = require('./routes/front');
app.use('/', frontRouter);

// 后台路由
const adminRouter = require('./routes/admin');
app.use('/', adminRouter);

// 错误处理中间件
const { notFound, serverError } = require('./middleware/errorHandler');
app.use(notFound);
app.use(serverError);

// 启动服务
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`[app] 服务已启动，端口: ${PORT}`);
  console.log(`[app] 访问地址: http://localhost:${PORT}`);
});

module.exports = app;
