# 保留 Next.js Pages Router 以部署到 Vercel

项目已经包含一个小型 Next.js pages-router app 和一个独立 HTML 工具。我们会把两个工具整合进现有 Next.js 项目，而不是切换前端框架，因为这样 Vercel 部署最直接、迁移风险最低，也允许独立 HTML 工具逐步转换为 React 页面。

**状态**：accepted

**考虑过的方案**：
- 保留 Next.js pages router，并把 HTML 工具迁移成页面。
- 替换为其他前端技术栈。
- 把 HTML 工具作为静态文件或 iframe 发布。

**影响**：
- 首次实现应保留 pages-router 结构。
- 在做更深的跨工具状态共享前，HTML 工具应先变成 React 页面。
