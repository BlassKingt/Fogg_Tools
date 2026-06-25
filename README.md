# Fogg Tools

如果觉得好用，请给项目一个免费的 Star。

Fogg Tools 是一个基于 Next.js 的福格行为设计工具箱。它把两个原本分开的工具整合到同一个工程里，既可以分别使用，也可以按推荐流程从“愿望”一路走到“突破设计”。

## 当前工具

- `/`：工具箱首页，提供推荐路径和两个工具入口。
- `/golden-behavior`：黄金行为探索器。先收集候选行为，再通过影响度和容易度找到黄金行为。
- `/ability-chain`：能力链设计器。分析困难习惯的薄弱环节，设计更容易执行的突破方案。

## 推荐流程

1. 写下一个愿望。
2. 收集可能帮助愿望发生的候选行为。
3. 用黄金行为探索器筛出“高影响 + 容易做”的行为。
4. 将黄金行为带入能力链设计器，继续降低执行难度。
5. 导出 HTML 分析报告，用于复盘、咨询记录或后续行动计划。

你也可以直接进入任一工具。如果已经知道某个习惯很难坚持，可以直接使用能力链设计器。

## 本地运行

先安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run dev
```

然后在浏览器打开：

```text
http://localhost:3000
```

如果本地 3000 端口被占用，可以指定其它端口，例如：

```bash
npm run dev -- -p 3001
```

## 构建

```bash
npm run build
```

构建通过后，可以部署到 Vercel。

## 项目结构

```text
pages/index.js            工具箱首页
pages/golden-behavior.js  黄金行为探索器
pages/ability-chain.js    能力链设计器
components/SiteNav.js     统一导航
docs/                     中文项目文档、计划、状态和交接记录
```

旧的独立 HTML 能力链工具已经迁移进 `/ability-chain`，仓库不再保留 `fuge_tools_2/` 或 `Fogg_Tool_2/` 这样的迁移源目录。

## 说明

- 当前版本是 client-only，数据主要保存在浏览器 `localStorage`。
- HTML 分析报告由浏览器本地生成，不需要后端服务。
- `记录.txt` 属于本地临时记录文件，已加入 `.gitignore`，不会上传到 GitHub。
