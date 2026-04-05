# smoketest-p12 - 个人博客主页系统

个人博客主页系统，支持文章列表、文章详情、个人简介页面，后台支持发布和编辑文章。

## 技术栈

- **后端**：Node.js + Express + EJS
- **数据库**：MySQL
- **前端**：原生 HTML/CSS
- **部署**：阿里云 SAE（Serverless 应用引擎）

## 功能

- 📄 文章列表页
- 📝 文章详情页
- 👤 个人简介页
- 🔧 后台文章发布与编辑

## 分支策略

| 分支 | 用途 |
|------|------|
| `main` | 生产环境，保护分支，需 PR 合并 |
| `staging` | 预发布环境，自动部署 |
| `feature/*` | 功能开发分支 |

## 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 启动开发服务
npm run dev
```

## 部署

- **Staging**：推送到 `staging` 分支自动触发
- **Production**：手动触发 `deploy-production` workflow（需审批）

## CI/CD

通过 GitHub Actions 实现自动化：

1. `lint` - 代码风格检查
2. `test` - 单元测试
3. `build` - 构建验证
4. `security-scan` - 依赖安全检查
5. `deploy-staging` - 自动部署到 Staging
6. `deploy-production` - 手动触发部署到生产（需审批）
