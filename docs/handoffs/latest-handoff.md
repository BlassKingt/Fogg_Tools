# 最新交接

## 用途

在 `D:\01work\workspace\01fuge_diag` 打开新的 Codex 窗口时，先读这个文件。

## 建议使用的 skills

- 默认使用 `karpathy-guidelines`。
- 如果产品语言或流程决策发生变化，使用 `grill-with-docs`。
- 切换到新上下文窗口前，使用 `handoff`。
- 声称实现完成前，使用 `verification-before-completion`。

## 优先阅读

1. `AGENTS.md`
2. `CONTEXT.md`
3. `docs/README.md`
4. `docs/prd/current-prd.md`
5. `docs/plans/current-plan.md`
6. `docs/status/current-status.md`
7. `docs/adr/`

## 当前产品方向

项目目标是成为一个可公开部署到 Vercel 的福格行为设计工具箱。

已确定采用方案 C：两个工具保持独立可用，同时推荐从愿望到黄金行为、再到突破设计的连续流程。

## 当前技术方向

- 保留 Next.js pages router。
- 创建 `/` 作为功能性的工具箱首页。
- 将当前 `pages/index.js` 的流程移动到 `/golden-behavior`。
- 将原独立 HTML 能力链工具转换到 `/ability-chain`。
- 在黄金行为结果页添加到 `/ability-chain?behavior=...` 的连接。
- 公开首版保持 client-only。

## 当前状态

文档体系已经建立，并已改为中文主文档。核心整合已完成：`/` 是工具箱首页，`/golden-behavior` 是黄金行为探索器，`/ability-chain` 是 React 版本能力链设计器，并支持从黄金行为带参进入突破设计。统一导航、默认缓存、当前方案移除和正式 HTML 分析报告已完成第一版。功能 baseline 已保存为本地 git commit `5f0a411 baseline before visual polish`。第一轮视觉反馈后，已修复默认蓝色下划线泄漏，并把背景从偏黄渐变收敛为更中性的暖灰纸面底。首页推荐路径已改为编号步骤说明，能力链 all-no 状态的“寻找新的黄金行为”已修为金色按钮。HTML 分析报告按钮已增加新标签页预览和页面内生成反馈。黄金行为探索器移动端保留愿望云朵、连线和候选行为环绕视觉，焦点图保留原坐标系统并支持 touch 拖拽。

重要文件：

- `pages/index.js`：工具箱首页。
- `components/SiteNav.js`：三页共用顶部导航。
- `pages/_app.js`：全局视觉变量、背景、字体和 focus state。
- `pages/golden-behavior.js`：当前黄金行为探索器，含工具导航、localStorage 缓存、结果页重新寻找黄金行为入口，以及单个/多个黄金行为进入能力链的入口。移动端不要缩放焦点图坐标系统；候选行为使用独立环绕坐标，焦点图面板内部横向滚动并在进入时自动居中，拖拽统一读取 mouse/touch 坐标。
- `pages/ability-chain.js`：React 版本能力链设计器，含工具导航、localStorage 缓存、来自黄金行为探索器的方案追加逻辑、当前方案移除、HTML 分析报告导出，以及 all-no 状态下的两个出口 CTA。
- 原迁移源目录 `fuge_tools_2/` 和 `Fogg_Tool_2/` 已从仓库移除；当前能力链以 `pages/ability-chain.js` 为唯一公开实现。
- `package.json`：当前 Next.js 依赖配置。
- GitHub：当前本地分支为 `main`，已推送到 `origin/main`；远端误推的 `master` 分支已删除。
- 移动端结果页和焦点图继续调整前的备份 tag 为 `baseline-mobile-interactions-20260627`，对应提交 `d96bee5`，已推送到 GitHub。

## 已验证

- `npm run build` 通过。
- 本地浏览器验证了 `/`、`/golden-behavior`、`/ability-chain`。
- 首页在 375px 移动端宽度下没有横向溢出。
- 能力链核心流程已通过浏览器验证：输入困难习惯、选择薄弱环节、添加突破想法、选择方案、进入突破设计并回答问题。
- `/ability-chain?behavior=...` 可以预填黄金行为并自动进入突破设计。
- `/ability-chain?from=golden&behaviors=...` 可以一次带入多个黄金行为，并生成多个突破设计方案 tab。
- 能力链模块一完成后不会覆盖既有黄金行为方案，会把新确认的方案追加到列表中。
- 能力链模块二 all-no 状态会提示用户查看其它候选方案，或返回黄金行为探索器寻找新的黄金行为。
- 能力链当前方案可以通过“移除这个方案”清理，避免缓存方案越堆越多。
- HTML 分析报告按钮已出现，`npm run build` 通过；报告内容包含黄金行为图、能力链诊断、方案角度选择和用户备注。Codex in-app browser 不支持下载事件，实际下载需在普通浏览器或部署环境里再做一次人工确认。
- 统一导航和视觉打磨后，`npm run build` 通过。
- 浏览器验证了 `/`、`/golden-behavior`、`/ability-chain` 在桌面端和 375px 移动端均无横向溢出，导航当前页高亮正确。
- `/ability-chain` 在 390px 移动端宽度下没有横向溢出。
- 端到端真实点击路径已验证：在 `/golden-behavior` 完成焦点图排序后，结果页出现“继续到突破设计”；点击后进入 `/ability-chain?behavior=睡前放下手机`，并带入该黄金行为。
- 链接样式和背景收敛修正后，`npm run build` 通过。
- 浏览器验证：首页品牌链接和工具卡片在桌面端、375px 移动端均无默认蓝色下划线，首页无横向溢出。
- 黄金行为结果页“继续到突破设计”已在代码层改为 `:global(a.continue-link)`，仍建议用完整人工流程复核一次结果态观感。
- 首页推荐路径和能力链 CTA 局部打磨后，`npm run build` 通过。
- 浏览器验证：首页推荐路径为 4 个编号步骤，桌面端和 375px 移动端均无横向溢出。
- 浏览器验证：能力链 all-no 状态下“寻找新的黄金行为”为金色按钮，`text-decoration: none`。
- HTML 分析报告生成反馈修正后，`npm run build` 通过；按钮会尝试打开新标签页预览并触发 HTML 下载，同时显示页面内提示。Codex in-app browser 因下载/新标签页安全策略拦截自动点击验证，需人工点击一次确认下载体验。
- GitHub 已推送到 `origin/main`；远端 `master` 分支已删除。
- 黄金行为探索器移动端排布修正后，`npm run build` 通过。
- 浏览器验证：`/golden-behavior` 在 375px 移动端初始页、候选行为列表、焦点图排序页均无页面级横向溢出；焦点图只在 `.focus-map` 内部横向滚动。
- 浏览器验证：`/golden-behavior` 在 1280px 桌面端无横向溢出，桌面核心容器尺寸保持正常。
- 移动端云朵环绕视觉和触控拖拽修正后，`npm run build` 通过。
- 浏览器验证：375px 下云朵和移动端连线可见，4 个候选行为环绕云朵且页面无横向溢出；第一轮 3 张卡片均实际拖入焦点图，第二轮横向拖动触发位置变化。
- 浏览器验证：1280px 下仍使用 600px 桌面画布，只显示桌面连线，没有受到移动端坐标和连线影响。
- 结果页批量按钮、移动端文案和焦点图居中修正后，`npm run build` 通过。
- 浏览器验证：375px 下待排序区位于焦点图下方，移动端显示“下方/上方”文案；焦点图 `scrollLeft` 和理论居中值均为 95px。
- 浏览器验证：两个黄金行为时，批量送出按钮在移动端和桌面端均显示为金色按钮、无下划线且可见；桌面端无横向溢出。

## 如何继续

下一步建议先人工点击一次“生成分析报告”，确认新标签页预览和 HTML 下载体验；再完整跑一次黄金行为结果页，复核“继续到突破设计”按钮观感；然后在真实手机上复核黄金行为焦点图的触控拖拽手感，最后做 Vercel 部署前检查。
