# 珍珠蚌图像资产实施计划

## 目标

用已通过审图的柔和半立体珍珠蚌状态帧替换 `/anchor-prompts` 当前的 inline SVG，同时保留现有珍珠习惯状态、hover 开合逻辑和“擦亮珍珠”上浮闪光动画。

## 范围

本次只改：

- 珍珠蚌生产图像资产。
- `pages/anchor-prompts.js` 中珍珠悬浮窗的图形标记和相关 CSS。
- 当前状态和交接文档。

本次不改：

- 珍珠习惯业务流程。
- `localStorage` 数据格式。
- 配方保存、删除、重做或打卡逻辑。
- 结果页其它布局。

## 资产结构

使用一张 `4×2` 等格 sprite sheet：

1. `closed`
2. `open-empty`
3. `open-sharp-stone`
4. `open-cube-stone`
5. `open-polyhedron-stone`
6. `open-rounded-stone`
7. `open-pearl`
8. 留空

每一格中的蚌必须使用相同画布尺寸、比例、中心点和视角。生产母版先生成在纯色 `#00ff00` 背景上，再使用 imagegen skill 提供的 `remove_chroma_key.py` 转换为透明 PNG。

最终资产路径：

```text
public/anchor-prompts/pearl-clam/pearl-clam-states.png
```

## 状态映射

现有 `pearlStage` 与 sprite 状态映射：

- `0`：默认 `closed`，hover/focus 显示 `open-empty`。
- `1`：默认 `open-sharp-stone`，hover/focus 显示 `closed`。
- `2`：默认 `open-cube-stone`，hover/focus 显示 `closed`。
- `3`：默认 `open-polyhedron-stone`，hover/focus 显示 `closed`。
- `4`：默认 `open-rounded-stone`，hover/focus 显示 `closed`。
- `5`：默认 `closed`，hover/focus 显示 `open-pearl`。
- `6`：默认 `open-pearl`，hover/focus 显示 `closed`。

`pearlStage === 6` 时继续保留独立的 `.pearl-object` 和 `.shine-ring`，只用于上浮和旋转闪光动画；静止时由 sprite 中的珍珠承担视觉显示。

## 实施步骤

### 1. 生成生产母版

- 使用已通过的七状态对照图作为 reference image。
- 生成 `4×2` 等格、纯绿色背景、无投影的生产 sprite sheet。
- 检查空蚌、石头顺序、尺寸递减和多面体形态。

### 2. 去背并保存

- 把生成母版复制到项目临时目录。
- 使用 `remove_chroma_key.py` 去除绿色背景。
- 验证 PNG 有 alpha 通道、四角透明、主体边缘没有明显绿色杂边。
- 保存到 `public/anchor-prompts/pearl-clam/pearl-clam-states.png`。

### 3. 替换页面图形

- 删除旧的珍珠蚌 inline SVG 和对应渐变定义。
- 新增固定尺寸 sprite 容器，通过 stage class 切换 `background-position`。
- 保留现有悬浮窗按钮、状态文案、hover/focus/active 语义和擦亮动画。
- 删除只服务于旧 SVG 的 CSS，不清理其它页面样式。

### 4. 验证

- `npm run build`
- `git diff --check`
- 本地 `/anchor-prompts` 返回 200。
- 桌面端检查默认、hover 和擦亮状态。
- 375px 移动端检查尺寸、位置、触控状态和页面横向溢出。
- 确认关闭状态完全看不到内壳、软体、石头或珍珠。

## 完成标准

- 页面不再使用旧珍珠蚌 SVG。
- 七个状态与 `pearlStage` 正确对应。
- 开口时上下内壳和内腔关系清楚，闭合时内部完全隐藏。
- 石头按“大三角 → 略小正方体 → 更小不规则多面体 → 更小近圆石 → 最小珍珠”变化。
- 擦亮珍珠的上浮和闪光动画仍可用。
- 桌面端和移动端均通过视觉检查，build 通过。

## 实施结果

2026-07-11 已完成接入：

- 生产 sprite sheet 已去背并保存到 `public/anchor-prompts/pearl-clam/pearl-clam-states.png`，文件为 RGBA PNG，四角透明。
- `pages/anchor-prompts.js` 已删除旧 inline SVG，改用两层 sprite 在默认态和 hover/focus/active 态之间切换。
- 阶段 1 保留独立三角石落入动画；阶段 5 使用 `open-pearl` 与 `closed` 帧交叉淡化，保留保存后的 1.15 秒慢速收合；阶段 6 使用张开空蚌底图叠加独立珍珠，保留上浮、发光和旋转闪光动画。这里有意不直接使用静止 `open-pearl` 帧，以免动画开始时出现重复珍珠。
- 桌面端与 375px 移动端已检查状态类、sprite 尺寸、动画名称和页面横向溢出；本地路由返回 200。自动截图接口本轮持续超时，最终像素观感由用户在本地页面继续确认。
