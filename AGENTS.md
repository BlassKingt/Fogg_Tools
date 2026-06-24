# 项目协作说明

本项目默认应用 `karpathy-guidelines`。

## 工作方式

- 编码前先想清楚；关键假设要明确写出来。
- 优先实现能解决当前问题的最小方案。
- 改动保持克制，贴合现有 Next.js pages-router 项目结构。
- 面向可验证目标工作：完成实现前要能 build、运行，并检查 UI。

## 项目记忆入口

新任务开始前，优先阅读这些文件：

- `CONTEXT.md`：项目语言、领域术语和概念边界。
- `docs/README.md`：文档地图。
- `docs/prd/current-prd.md`：当前产品方向。
- `docs/plans/current-plan.md`：实施计划。
- `docs/status/current-status.md`：进度、决策、开放问题。
- `docs/handoffs/latest-handoff.md`：新窗口继续工作的交接入口。
- `docs/adr/`：已接受的架构和产品流程决策。

## 文档规则

- `CONTEXT.md` 只记录领域词汇，不写实现细节；它是 glossary，不是 spec。
- 难以反悔、存在真实取舍、未来读者可能疑惑的决策，记录到 `docs/adr/`。
- 重要进展、阻塞、决策变化后，更新 `docs/status/current-status.md`。
- 大阶段结束前，更新 `docs/handoffs/latest-handoff.md`，保证新 Codex 窗口可以接手。
