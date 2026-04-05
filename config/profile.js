'use strict';

/**
 * 博主个人简介静态配置
 *
 * MVP 阶段个人简介数据不存数据库，直接在此文件维护。
 * 如需后台可编辑，未来迭代可将数据迁移至 users 表。
 */

module.exports = {
  /** 博主显示名称 */
  name: '我的博客',

  /** 头像路径（相对于 public 目录） */
  avatar: '/images/avatar.jpg',

  /** 一行简短签名 */
  tagline: '记录思考，分享所得',

  /** 个人简介（支持多段落，使用 \n 换行） */
  bio: '热爱编程与写作，专注于 Node.js、全栈开发和产品设计。\n\n用文字记录技术成长，用代码构建想象。',

  /** 社交链接列表 */
  socialLinks: [
    { label: 'GitHub', url: 'https://github.com/', icon: 'github' },
  ],

  /** 版权年份（自动取当年） */
  get copyrightYear() {
    return new Date().getFullYear();
  },
};
