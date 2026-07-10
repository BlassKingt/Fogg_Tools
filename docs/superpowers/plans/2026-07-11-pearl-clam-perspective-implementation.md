# Pearl Clam Perspective Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat front-view pearl clam with a 45-degree layered clam so opening exposes believable inner shell, mantle, and pearl layers.

**Architecture:** Keep the existing React state and pearl workflow. Only change the floating companion SVG structure, scoped CSS classes, and Chinese status/handoff docs. Preserve existing open/closed stage logic and the pearl polish animation.

**Tech Stack:** Next.js pages router, React JSX, styled-jsx CSS, inline SVG.

---

### Task 1: Replace Clam SVG Layers

**Files:**
- Modify: `pages/anchor-prompts.js`

- [x] **Step 1: Replace the old front-view SVG groups**

Replace the current lower shell, inner, lip, and top shell paths with layered groups:

```jsx
<g className="companion-lower-shell">
  <path className="companion-lower-outer" d="..." />
  <path className="companion-lower-inner" d="..." />
  <path className="companion-mantle" d="..." />
  <path className="companion-front-rim" d="..." />
</g>
<g className="companion-top-shell">
  <path className="companion-top-outer" d="..." />
  <path className="companion-top-inner" d="..." />
  <path className="companion-shell-ridge" d="..." />
</g>
```

- [x] **Step 2: Add nacre and mantle gradients**

Add `pearlCompanionNacreGradient` and `pearlCompanionMantleGradient` in the existing `<defs>`.

### Task 2: Update Perspective CSS

**Files:**
- Modify: `pages/anchor-prompts.js`

- [x] **Step 1: Update shell class selectors**

Style `companion-lower-outer`, `companion-top-outer`, `companion-lower-inner`, `companion-top-inner`, `companion-mantle`, and `companion-front-rim`.

- [x] **Step 2: Keep open/closed rules**

Reuse `is-open` and `is-closed`. Closed state hides inner shell, mantle, and pearl. Open state shows them. The top shell opens with a 45-degree-feeling translate/rotate transform.

- [x] **Step 3: Preserve polish animation**

Do not change `pearl-rise` or `shine-ring` except if coordinates need minor alignment.

### Task 3: Verify and Document

**Files:**
- Modify: `docs/status/current-status.md`
- Modify: `docs/handoffs/latest-handoff.md`

- [x] **Step 1: Run verification**

Run:

```bash
npm run build
git diff --check
```

Expected: both pass.

- [x] **Step 2: Check local route**

Run:

```powershell
Invoke-WebRequest -Uri http://localhost:3002/anchor-prompts -UseBasicParsing -TimeoutSec 5
```

Expected: HTTP 200.

- [x] **Step 3: Update docs**

Record that the pearl clam moved from a flat front-view shell to a 45-degree layered shell to fix the visual layering problem.

- [x] **Step 4: Commit**

Commit message:

```bash
git commit -m "fix: redraw pearl clam perspective"
```
