# Pearl Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add the pearl companion floating interaction and require users to turn the selected beneficial habit into a tiny pearl habit before saving.

**Architecture:** Keep the existing Next.js pages-router structure. Extend the anchor prompt state in `lib/anchorPrompts.js`, then update `pages/anchor-prompts.js` with small local helpers, a floating pearl companion component, revised pearl form sections, and result-page polish animation.

**Tech Stack:** Next.js pages router, React state, styled-jsx CSS, browser localStorage.

---

### Task 1: Extend Pearl Habit State

**Files:**
- Modify: `lib/anchorPrompts.js`
- Modify: `pages/anchor-prompts.js`

- [x] **Step 1: Add pearl tiny-habit fields to initial state**

In `lib/anchorPrompts.js`, extend `createInitialAnchorState()` with:

```js
pearlTinyMethod: '',
pearlTinyAction: '',
pearlPolishPulse: 0,
```

- [x] **Step 2: Replace pearl save validation**

Change `canCreatePearlRecipe` to accept `(selectedAnnoyance, selectedPearlCandidate, pearlTinyMethod, pearlTinyAction)` and return true only when all four are present.

- [x] **Step 3: Update callers**

In `pages/anchor-prompts.js`, update all calls to `canCreatePearlRecipe` to pass the new tiny-habit fields.

- [x] **Step 4: Verify build**

Run: `npm run build`

Expected: build passes and `/anchor-prompts` remains in the route list.

### Task 2: Add Pearl Tiny-Habit Form Step

**Files:**
- Modify: `pages/anchor-prompts.js`

- [x] **Step 1: Add tiny-habit update helper**

Add a local helper:

```js
const updatePearlTinyHabit = patch => {
  setState(prev => ({ ...prev, ...patch }));
};
```

- [x] **Step 2: Revise savePearlRecipe**

Save `sourceAction`, `tinyMethod`, and final `action`:

```js
const sourceAction = prev.selectedPearlCandidate.trim();
const action = prev.pearlTinyAction.trim();
```

`text` should use `buildPearlText(prev.selectedAnnoyance.trim(), action)`.

- [x] **Step 3: Reset tiny-habit fields**

Update `resetPearlRecipe` and `clearAllRecipes` to clear `pearlTinyMethod`, `pearlTinyAction`, and `pearlPolishPulse`.

- [x] **Step 4: Add UI section**

After “挑选最佳选项”, add:

- heading: `把有益习惯变成微习惯`
- two method buttons: `规模缩小化`, `入门步骤化`
- one input bound to `state.pearlTinyAction`
- preview card titled `珍珠配方预览`
- keep final button text `保存珍珠习惯`

- [x] **Step 5: Verify manually in browser**

Expected: pearl save button stays disabled until annoyance, best beneficial habit, tiny method, and tiny action are all present.

### Task 3: Add Floating Pearl Companion

**Files:**
- Modify: `pages/anchor-prompts.js`

- [x] **Step 1: Create derived pearl stage**

Replace `pearlProgress` with stages:

```js
if (state.pearlRecipe?.completed) return 6;
if (state.pearlRecipe) return 5;
if (state.pearlTinyAction.trim()) return 4;
if ((state.selectedPearlCandidate || '').trim()) return 3;
if (state.pearlCandidates.some(candidate => candidate.trim())) return 2;
if (state.selectedAnnoyance.trim()) return 1;
return 0;
```

- [x] **Step 2: Move pearl visual out of content card**

Remove the current `.pearl-stage-card` aside from the pearl page content. Render one floating companion after `</main>` when `state.step` is `pearl` or `result`.

- [x] **Step 3: Implement companion markup**

Add markup with classes:

```jsx
<aside className={`pearl-companion stage-${pearlStage} ${state.pearlRecipe?.completed ? 'polished' : ''}`}>
  ...
</aside>
```

Use an SVG clam with dark purple fan shell, visible ridges, pink/white inner area, and a pearl object inside.

- [x] **Step 4: Add hover/tap interaction**

Use CSS hover for desktop shell opening. Use a button wrapper so mobile tap can focus/open via `:focus-visible` and `:active`.

### Task 4: Result Page Polish Animation

**Files:**
- Modify: `pages/anchor-prompts.js`

- [x] **Step 1: Change toggleRecipeDone for pearl recipes**

When a pearl recipe is toggled, increment `pearlPolishPulse`:

```js
pearlPolishPulse: prev.pearlRecipe && prev.pearlRecipe.id === recipeId
  ? prev.pearlPolishPulse + 1
  : prev.pearlPolishPulse,
```

- [x] **Step 2: Remove mini-pearl from result cards**

Delete the `mini-pearl` JSX and CSS. The floating companion becomes the only pearl visual.

- [x] **Step 3: Add pulse class**

Add `data-pulse={state.pearlPolishPulse}` to the companion and use a keyed class or animation class based on completed state. Use CSS animations for upward pearl motion and rotating shine lines.

- [x] **Step 4: Verify result page**

Expected: result page pearl card has text/buttons only; clicking `擦亮珍珠` marks completed and companion pearl becomes shiny.

### Task 5: Mobile Layout and Documentation

**Files:**
- Modify: `pages/anchor-prompts.js`
- Modify: `docs/status/current-status.md`
- Modify: `docs/handoffs/latest-handoff.md`

- [x] **Step 1: Add mobile CSS**

At `max-width: 640px`, shrink companion to about `150px`, keep it left-bottom, and ensure page-level horizontal overflow is 0.

- [x] **Step 2: Update docs**

Record:

- pearl habit now requires tiny-habit design before save
- companion appears on pearl/result pages
- AI remains TODO only

- [x] **Step 3: Run final verification**

Run:

```bash
npm run build
```

Then verify `http://localhost:3002/anchor-prompts` returns 200.

- [x] **Step 4: Commit**

Commit message:

```bash
git commit -m "feat: add pearl companion micro habit flow"
```

