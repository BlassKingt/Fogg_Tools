# 文档地图

本项目按 `ask-matt` 建议的代码库路线组织文档：用 `grill-with-docs` 澄清语言，用 ADR 保存关键决策，并保留新 Codex 窗口可直接接手的 handoff。

## 从这里开始

- `../CONTEXT.md`：领域术语和已澄清的概念边界。
- `prd/current-prd.md`：当前产品需求和范围。
- `plans/current-plan.md`：实施计划和验证检查。
- `status/current-status.md`：进度、决策、开放问题和下一步。
- `handoffs/latest-handoff.md`：新窗口继续工作的最短入口。

## 决策记录

- `adr/0001-keep-nextjs-pages-router-for-vercel.md`
- `adr/0002-use-independent-tools-with-a-recommended-continuous-flow.md`
- `adr/0003-keep-public-version-client-only-initially.md`

## 更新规则

- 每完成一个有意义的实现阶段，更新 `status/current-status.md`。
- 当执行顺序或策略改变时，更新 `plans/current-plan.md`。
- 只有当一个决策难以反悔、并且存在真实取舍时，才新增 ADR。
- `CONTEXT.md` 不写实现细节，只记录项目领域语言。
