# 当前实施计划

## 假设

- 保留现有 Next.js pages-router app 作为部署外壳。
- 独立 HTML 工具应迁移为 React 页面，而不是用 iframe 嵌入。
- 公开首版先保持 client-only。
- 默认产品路径是连续流程，但两个工具都要能独立使用。

## 实施步骤

1. 建立共享项目结构。
   - 只有在能减少真实重复时，才添加共享 layout/navigation 组件。
   - 保持现有工具的视觉语言，不做大规模重设计。
   - 通过检查路由文件和 build 输出验证。

2. 把黄金行为探索器移出根路由。已完成。
   - 保留 `pages/index.js` 当前行为。
   - 将它放到 `/golden-behavior`。
   - 验证原流程仍能到达结果页。

3. 创建工具箱首页 `/`。已完成。
   - 直接呈现两个使用场景。
   - 链接到 `/golden-behavior` 和 `/ability-chain`。
   - 避免做成营销型 landing page。

4. 把能力链设计器转换为 Next.js 页面。已完成。
   - 将独立 HTML/CSS/JS 翻译为 React state 和 event handlers。
   - 保留模块一和突破设计的行为。
   - 验证直接进入能力链设计器可用。

5. 添加跨工具连接。已完成。
   - 在黄金行为结果卡片中链接到 `/ability-chain?behavior=...`。
   - 能力链设计器识别 query 参数，并预填一个突破设计入口。
   - 多个黄金行为通过 `/ability-chain?from=golden&behaviors=...` 传递，localStorage 交接保留为备份。
   - 验证没有 query 参数时，独立入口仍可用。

6. 添加进度管理。已完成第一版。
   - 两个工具都用 localStorage 保留当前填写进度。
   - 常规页面不常驻显示导出和清空缓存按钮。
   - 黄金行为结果页提供“重新寻找黄金行为”作为显式重新开始入口。
   - 能力链模块一的方案确认采用追加逻辑，不覆盖已从黄金行为探索器带入的方案。
   - 能力链模块二 all-no 状态提供两个出口：查看其它候选方案，或返回黄金行为探索器。
   - 能力链模块二提供“移除这个方案”，用于清理误带入或不再需要的缓存方案。

7. 添加正式 HTML 分析报告。已完成第一版。
   - 报告从 localStorage 读取黄金行为探索器结果，并重建黄金行为焦点图。
   - 报告记录能力链中的困难习惯、薄弱环节、突破想法、方案角度选择和用户备注。
   - 报告导出为独立 `.html` 文件，视觉风格与当前工具一致，但采用正式报告版式。

8. 做公开部署前检查。
   - 运行 `npm run build`。
   - 本地启动或检查页面。
   - 检查桌面端和移动端布局。
   - 更新 `docs/status/current-status.md` 和 `docs/handoffs/latest-handoff.md`。

9. 统一视觉和导航。已完成第一版。
   - 保存功能 baseline：`5f0a411 baseline before visual polish`。
   - 添加 `components/SiteNav.js` 作为三页共用导航。
   - 在 `pages/_app.js` 中统一背景、色板、字体和 focus state。
   - 首页、黄金行为探索器、能力链设计器使用同一套导航和更一致的卡片/按钮风格。

## 验证命令

```powershell
npm run build
npm run dev
```

## 风险记录

- 黄金行为探索器当前使用固定尺寸的焦点图；路由和布局调整后需要检查移动端体验。
- 能力链设计器来自约 1200 行单文件 HTML，转换时应分阶段验证。
- 跨工具连接不能让能力链设计器依赖黄金行为探索器；它仍然必须能独立使用。

## 当前验证记录

- `npm run build` 已通过。
- 浏览器已验证 `/`、`/golden-behavior`、`/ability-chain` 三个路由可访问。
- 首页已用 375px 移动端宽度检查，没有横向溢出。
- 能力链核心流程已通过浏览器验证。
- `/ability-chain?behavior=...` 已通过浏览器验证。
- `/ability-chain?from=golden&behaviors=...` 已通过浏览器验证，可同时生成多个突破设计方案 tab。
- 能力链模块一确认方案后，已验证会追加到突破设计方案列表，不会清掉已带入的黄金行为。
- `npm run build` 已通过缓存和 all-no CTA 调整后的版本。
- `npm run build` 已通过方案移除和 HTML 报告导出版本。
- 浏览器已验证能力链出现“生成分析报告”和“移除这个方案”；移除当前方案会让方案 tab 数量减少。
- Codex in-app browser 不支持下载事件，因此 HTML 报告下载动作未能在该浏览器里完整捕获。
- `npm run build` 已通过统一导航和视觉打磨版本。
- 浏览器已验证 `/`、`/golden-behavior`、`/ability-chain` 三页桌面端当前导航高亮正确，且无横向溢出。
- 浏览器已验证 375px 移动端三页当前导航高亮正确，且无横向溢出。
- `/ability-chain` 已用 390px 移动端宽度检查，没有横向溢出。
- `/golden-behavior` 到 `/ability-chain?behavior=...` 的真实点击路径已通过浏览器验证。
