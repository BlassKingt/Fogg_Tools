# Anchor Prompts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the third Fogg Tools module, `锚点提示设计器`, as a client-only Next.js page that turns existing daily routines into practical prompt recipes.

**Architecture:** Add one focused helper module for anchor-prompt domain constants and pure state helpers, then add a new `/anchor-prompts` page that owns UI state, localStorage persistence, recipe creation, pearl-habit creation, and lightweight check-ins. After the page works independently, wire it into `SiteNav`, the toolbox homepage, and the existing HTML report.

**Tech Stack:** Next.js pages router, React 18 state/hooks, styled-jsx, browser `localStorage`, existing CSS variables from `pages/_app.js`.

---

## Scope Check

The spec describes one coherent product module: a single new client-only tool plus small integration points. It does not need separate sub-project specs. The implementation should avoid new dependencies, account systems, reminders, analytics, or full habit-tracking features.

## File Structure

- Create `lib/anchorPrompts.js`
  - Owns time-period constants, initial state, recipe builders, validation helpers, and storage keys.
  - Pure functions only; no React and no browser access except exported key names.
- Create `pages/anchor-prompts.js`
  - Owns the new tool UI and browser persistence.
  - Uses `SiteNav`.
  - Keeps all page-specific styles in local styled-jsx, following existing page pattern.
- Modify `components/SiteNav.js`
  - Adds the third tool route to global navigation.
- Modify `pages/index.js`
  - Adds the third tool card.
  - Extends the recommended path from 4 steps to 5 steps by adding `提示配方`.
- Modify `pages/ability-chain.js`
  - Extends the existing HTML report generator to include anchor prompt data when available.
- Modify `docs/status/current-status.md` and `docs/handoffs/latest-handoff.md`
  - Records the new implementation state and verification results after implementation.

Do not touch `README.md` unless the user asks during this implementation. It currently has unrelated local edits.

## Task 1: Add Anchor Prompt Domain Helpers

**Files:**
- Create: `lib/anchorPrompts.js`

- [ ] **Step 1: Create the helper module**

Create `lib/anchorPrompts.js` with these exports:

```js
export const ANCHOR_PROMPTS_STORAGE_KEY = 'fogg-tools-anchor-prompts-state-v1';

export const ANCHOR_PERIODS = [
  { id: 'before-work', label: '到公司之前', hint: '起床后、洗漱、出门、通勤路上发生的事。' },
  { id: 'before-lunch', label: '午饭前', hint: '上午工作中稳定发生的事。' },
  { id: 'midday', label: '中午', hint: '午饭、午休或中午固定流程里的事。' },
  { id: 'afternoon', label: '午后', hint: '下午较稳定的会议、饮水、休息或切换动作。' },
  { id: 'leaving-work', label: '下班时', hint: '收尾、离开工位、通勤开始时发生的事。' },
  { id: 'after-work', label: '下班后', hint: '回家、晚饭、洗澡、家务或休闲前后的事。' },
  { id: 'before-bed', label: '睡前', hint: '上床前和睡前固定发生的事。' },
];

export const ANCHOR_STEPS = [
  { id: 'timeline', label: '时间轴', title: '绘制习惯时间轴' },
  { id: 'micro', label: '微习惯配方', title: '创建微习惯配方' },
  { id: 'pearl', label: '珍珠习惯', title: '创建珍珠习惯' },
  { id: 'result', label: '结果', title: '今日实践时间轴' },
];

export function createInitialAnchorState() {
  return {
    step: 'timeline',
    habits: ANCHOR_PERIODS.reduce((acc, period) => {
      acc[period.id] = [];
      return acc;
    }, {}),
    selectedAnchors: [],
    microDraft: {
      anchorId: '',
      candidates: ['', '', ''],
      selectedCandidate: '',
      note: '',
    },
    microRecipes: [],
    annoyances: ['', '', '', '', '', '', '', '', '', ''],
    selectedAnnoyance: '',
    pearlCandidates: ['', '', '', '', ''],
    pearlRecipe: null,
  };
}

export function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function buildRecipeText(anchor, action) {
  return `在我 ${anchor} 之后，我会 ${action}。`;
}

export function buildPearlText(annoyance, action) {
  return `在我遇到${annoyance}之后，我会 ${action}。`;
}

export function getAllHabits(habitsByPeriod) {
  return ANCHOR_PERIODS.flatMap(period =>
    (habitsByPeriod[period.id] || []).map(habit => ({
      ...habit,
      periodId: period.id,
      periodLabel: period.label,
    }))
  );
}

export function getReliableAnchors(habitsByPeriod) {
  return getAllHabits(habitsByPeriod).filter(habit => habit.reliable);
}

export function canCreateMicroRecipe(draft) {
  return Boolean(draft.anchorId && draft.selectedCandidate.trim());
}

export function canCreatePearlRecipe(selectedAnnoyance, pearlCandidates) {
  return Boolean(selectedAnnoyance.trim() && pearlCandidates.some(item => item.trim()));
}
```

- [ ] **Step 2: Verify helper file is syntactically valid**

Run:

```powershell
npm run build
```

Expected: build still passes because no route imports the helper yet.

- [ ] **Step 3: Commit**

```powershell
git add lib/anchorPrompts.js
git commit -m "feat: add anchor prompt helpers"
```

## Task 2: Add `/anchor-prompts` Page Skeleton and Persistence

**Files:**
- Create: `pages/anchor-prompts.js`

- [ ] **Step 1: Create the page skeleton**

Create `pages/anchor-prompts.js` with a working shell:

```js
import { useEffect, useMemo, useState } from 'react';
import SiteNav from '../components/SiteNav';
import {
  ANCHOR_PERIODS,
  ANCHOR_PROMPTS_STORAGE_KEY,
  ANCHOR_STEPS,
  createInitialAnchorState,
} from '../lib/anchorPrompts';

export default function AnchorPromptsPage() {
  const [state, setState] = useState(createInitialAnchorState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(ANCHOR_PROMPTS_STORAGE_KEY);
      if (raw) setState({ ...createInitialAnchorState(), ...JSON.parse(raw) });
    } catch (error) {
      window.localStorage.removeItem(ANCHOR_PROMPTS_STORAGE_KEY);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded || typeof window === 'undefined') return;
    window.localStorage.setItem(ANCHOR_PROMPTS_STORAGE_KEY, JSON.stringify(state));
  }, [loaded, state]);

  const currentStep = useMemo(
    () => ANCHOR_STEPS.find(step => step.id === state.step) || ANCHOR_STEPS[0],
    [state.step]
  );

  const goToStep = step => setState(prev => ({ ...prev, step }));

  return (
    <>
      <SiteNav />
      <main className="anchor-shell">
        <header className="hero">
          <p className="step-label">为用户设计定制化提示</p>
          <h1>把新习惯钉到一天里自然发生的时刻。</h1>
          <p>先绘制既有习惯时间轴，再生成微习惯配方和珍珠习惯，最后得到可以回来打卡的实践时间轴。</p>
        </header>

        <section className="workspace">
          <aside className="step-nav" aria-label="锚点提示设计步骤">
            {ANCHOR_STEPS.map(step => (
              <button
                key={step.id}
                type="button"
                className={state.step === step.id ? 'active' : ''}
                onClick={() => goToStep(step.id)}
              >
                <span>{step.label}</span>
                <small>{step.title}</small>
              </button>
            ))}
          </aside>

          <section className="panel">
            <div className="panel-head">
              <p className="step-label">{currentStep.label}</p>
              <h2>{currentStep.title}</h2>
            </div>
            <p className="empty-copy">下一步会在这里加入时间轴、配方和珍珠习惯流程。</p>
          </section>
        </section>
      </main>

      <style jsx>{`
        .anchor-shell {
          width: min(1120px, calc(100% - 40px));
          margin: 0 auto;
          padding: 8px 0 56px;
        }

        .hero {
          margin: 0 0 22px;
          padding: 24px 0 8px;
        }

        .step-label {
          display: inline-flex;
          margin: 0 0 10px;
          color: var(--ft-plum);
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid var(--ft-line);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 0.78rem;
          font-weight: 800;
        }

        h1 {
          max-width: 760px;
          margin: 0 0 14px;
          color: var(--ft-ink);
          font-size: clamp(2.2rem, 6vw, 4.4rem);
          line-height: 1;
        }

        .hero p:last-child,
        .empty-copy {
          max-width: 720px;
          margin: 0;
          color: var(--ft-muted);
          line-height: 1.8;
        }

        .workspace {
          display: grid;
          grid-template-columns: 230px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .step-nav,
        .panel {
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid var(--ft-line);
          border-radius: 8px;
          box-shadow: var(--ft-shadow);
        }

        .step-nav {
          display: grid;
          gap: 8px;
          padding: 12px;
        }

        .step-nav button {
          width: 100%;
          text-align: left;
          color: #504765;
          background: #fbf8f3;
          border: 1px solid #eee4d2;
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
        }

        .step-nav button.active {
          color: #fff;
          background: var(--ft-plum);
          border-color: var(--ft-plum);
        }

        .step-nav span,
        .step-nav small {
          display: block;
        }

        .step-nav span {
          font-weight: 800;
        }

        .step-nav small {
          margin-top: 4px;
          font-size: 0.76rem;
          line-height: 1.4;
        }

        .panel {
          min-height: 360px;
          padding: 22px;
        }

        .panel-head h2 {
          margin: 0 0 16px;
          font-size: 1.6rem;
        }

        @media (max-width: 760px) {
          .anchor-shell {
            width: min(100% - 28px, 1120px);
          }

          .workspace {
            grid-template-columns: 1fr;
          }

          .step-nav {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .step-nav button {
            padding: 10px;
          }
        }
      `}</style>
    </>
  );
}
```

- [ ] **Step 2: Run build**

Run:

```powershell
npm run build
```

Expected: output includes `/anchor-prompts` and build succeeds.

- [ ] **Step 3: Browser smoke check**

Start the dev server:

```powershell
cmd /c npm run dev -- -p 3001
```

Open `http://localhost:3001/anchor-prompts`.

Expected:
- Page renders.
- Step buttons switch active state.
- No default blue underlined links appear.
- At 375px width, no page-level horizontal overflow.

- [ ] **Step 4: Commit**

```powershell
git add pages/anchor-prompts.js
git commit -m "feat: add anchor prompts page shell"
```

## Task 3: Implement Habit Timeline Collection

**Files:**
- Modify: `pages/anchor-prompts.js`
- Modify: `lib/anchorPrompts.js`

- [ ] **Step 1: Add habit mutation helpers to page**

Add imports:

```js
import { makeId } from '../lib/anchorPrompts';
```

Add handlers inside `AnchorPromptsPage`:

```js
const updateHabitText = (periodId, habitId, value) => {
  setState(prev => ({
    ...prev,
    habits: {
      ...prev.habits,
      [periodId]: (prev.habits[periodId] || []).map(habit =>
        habit.id === habitId ? { ...habit, text: value } : habit
      ),
    },
  }));
};

const addHabit = periodId => {
  setState(prev => ({
    ...prev,
    habits: {
      ...prev.habits,
      [periodId]: [
        ...(prev.habits[periodId] || []),
        { id: makeId('habit'), text: '', reliable: false },
      ],
    },
  }));
};

const removeHabit = (periodId, habitId) => {
  setState(prev => ({
    ...prev,
    habits: {
      ...prev.habits,
      [periodId]: (prev.habits[periodId] || []).filter(habit => habit.id !== habitId),
    },
    selectedAnchors: prev.selectedAnchors.filter(id => id !== habitId),
  }));
};

const toggleReliable = (periodId, habitId) => {
  setState(prev => ({
    ...prev,
    habits: {
      ...prev.habits,
      [periodId]: (prev.habits[periodId] || []).map(habit =>
        habit.id === habitId ? { ...habit, reliable: !habit.reliable } : habit
      ),
    },
  }));
};
```

- [ ] **Step 2: Render timeline in `state.step === 'timeline'`**

Replace the placeholder panel body with conditional rendering:

```jsx
{state.step === 'timeline' && (
  <div className="timeline-editor">
    <p className="section-copy">把一天中稳定发生的习惯写下来。越具体越好，然后把绝对不会忘记的习惯标记为可靠锚点。</p>
    {ANCHOR_PERIODS.map(period => (
      <section key={period.id} className="period-row">
        <div className="period-meta">
          <h3>{period.label}</h3>
          <p>{period.hint}</p>
        </div>
        <div className="habit-list">
          {(state.habits[period.id] || []).map(habit => (
            <div key={habit.id} className={`habit-item ${habit.reliable ? 'reliable' : ''}`}>
              <input
                value={habit.text}
                placeholder="例如：刷牙、打开电脑、上床"
                onChange={event => updateHabitText(period.id, habit.id, event.target.value)}
              />
              <button type="button" onClick={() => toggleReliable(period.id, habit.id)}>
                {habit.reliable ? '可靠锚点' : '标为锚点'}
              </button>
              <button type="button" className="ghost" onClick={() => removeHabit(period.id, habit.id)}>
                删除
              </button>
            </div>
          ))}
          <button type="button" className="add-button" onClick={() => addHabit(period.id)}>
            添加这个时段的习惯
          </button>
        </div>
      </section>
    ))}
    <div className="actions">
      <button type="button" className="primary" onClick={() => goToStep('micro')}>
        下一步：创建微习惯配方
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 3: Add timeline styles**

Add these styles inside the page styled-jsx block:

```css
.section-copy {
  margin: 0 0 18px;
  color: var(--ft-muted);
  line-height: 1.7;
}

.timeline-editor {
  display: grid;
  gap: 14px;
}

.period-row {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
  background: #fffdf9;
  border: 1px solid #eee4d2;
  border-radius: 8px;
}

.period-meta h3 {
  margin: 0 0 6px;
  font-size: 1rem;
}

.period-meta p {
  margin: 0;
  color: var(--ft-muted);
  font-size: 0.82rem;
  line-height: 1.55;
}

.habit-list {
  display: grid;
  gap: 8px;
}

.habit-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
}

.habit-item input {
  width: 100%;
  min-height: 40px;
  color: var(--ft-ink);
  background: #fff;
  border: 1px solid var(--ft-line);
  border-radius: 8px;
  padding: 9px 11px;
}

.habit-item button,
.add-button,
.primary,
.secondary {
  min-height: 40px;
  border-radius: 999px;
  border: 1px solid var(--ft-line);
  background: #fff;
  color: #4d4564;
  padding: 8px 14px;
  font-weight: 800;
  cursor: pointer;
}

.habit-item.reliable input {
  border-color: var(--ft-amber);
  background: #fff8df;
}

.habit-item button:first-of-type,
.primary {
  color: #fff;
  background: var(--ft-plum);
  border-color: var(--ft-plum);
}

.habit-item.reliable button:first-of-type {
  color: #4a3500;
  background: #f2c14d;
  border-color: #f2c14d;
}

.ghost {
  color: var(--ft-muted);
}

.add-button {
  justify-self: start;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 760px) {
  .period-row,
  .habit-item {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run build and browser check**

Run:

```powershell
npm run build
```

Then in browser:
- Add habits in at least 3 periods.
- Mark at least 3 reliable anchors.
- Refresh `/anchor-prompts`.

Expected:
- Habits and reliable marks persist.
- Mobile 375px timeline is single-column and has no page horizontal overflow.

- [ ] **Step 5: Commit**

```powershell
git add pages/anchor-prompts.js lib/anchorPrompts.js
git commit -m "feat: collect anchor prompt timeline"
```

## Task 4: Implement Micro Habit Recipe Creation

**Files:**
- Modify: `pages/anchor-prompts.js`

- [ ] **Step 1: Import helper functions**

Update imports:

```js
import {
  ANCHOR_PERIODS,
  ANCHOR_PROMPTS_STORAGE_KEY,
  ANCHOR_STEPS,
  buildRecipeText,
  canCreateMicroRecipe,
  createInitialAnchorState,
  getReliableAnchors,
  makeId,
} from '../lib/anchorPrompts';
```

- [ ] **Step 2: Add derived anchors and handlers**

Add inside `AnchorPromptsPage`:

```js
const reliableAnchors = useMemo(() => getReliableAnchors(state.habits), [state.habits]);

const updateMicroDraft = patch => {
  setState(prev => ({
    ...prev,
    microDraft: { ...prev.microDraft, ...patch },
  }));
};

const updateMicroCandidate = (index, value) => {
  setState(prev => {
    const candidates = [...prev.microDraft.candidates];
    candidates[index] = value;
    return { ...prev, microDraft: { ...prev.microDraft, candidates } };
  });
};

const saveMicroRecipe = () => {
  setState(prev => {
    if (!canCreateMicroRecipe(prev.microDraft)) return prev;
    const anchor = getReliableAnchors(prev.habits).find(item => item.id === prev.microDraft.anchorId);
    if (!anchor) return prev;
    const action = prev.microDraft.selectedCandidate.trim();
    const recipe = {
      id: makeId('micro'),
      type: 'micro',
      periodId: anchor.periodId,
      periodLabel: anchor.periodLabel,
      anchorText: anchor.text.trim(),
      action,
      text: buildRecipeText(anchor.text.trim(), action),
      note: prev.microDraft.note.trim(),
      completed: false,
    };
    return {
      ...prev,
      microRecipes: [...prev.microRecipes, recipe].slice(0, 3),
      microDraft: {
        anchorId: '',
        candidates: ['', '', ''],
        selectedCandidate: '',
        note: '',
      },
    };
  });
};
```

- [ ] **Step 3: Render micro recipe step**

Add this conditional section after the timeline section:

```jsx
{state.step === 'micro' && (
  <div className="recipe-editor">
    <p className="section-copy">选择一个可靠锚点，再写下几个自然跟在它后面的小动作。默认先做 3 张配方卡。</p>
    <div className="recipe-grid">
      <section className="input-card">
        <h3>选择锚点</h3>
        <select value={state.microDraft.anchorId} onChange={event => updateMicroDraft({ anchorId: event.target.value })}>
          <option value="">选择一个可靠锚点</option>
          {reliableAnchors.map(anchor => (
            <option key={anchor.id} value={anchor.id}>
              {anchor.periodLabel} · {anchor.text}
            </option>
          ))}
        </select>

        <h3>候选新微行为</h3>
        {state.microDraft.candidates.map((candidate, index) => (
          <label key={index} className="stack-field">
            <span>候选 {index + 1}</span>
            <input
              value={candidate}
              placeholder="例如：做一次深呼吸"
              onChange={event => updateMicroCandidate(index, event.target.value)}
            />
          </label>
        ))}

        <h3>选择最终微行为</h3>
        <select value={state.microDraft.selectedCandidate} onChange={event => updateMicroDraft({ selectedCandidate: event.target.value })}>
          <option value="">选择最喜欢、最简单的一个</option>
          {state.microDraft.candidates.filter(item => item.trim()).map(candidate => (
            <option key={candidate} value={candidate.trim()}>
              {candidate.trim()}
            </option>
          ))}
        </select>

        <label className="stack-field">
          <span>备注，可选</span>
          <textarea value={state.microDraft.note} onChange={event => updateMicroDraft({ note: event.target.value })} />
        </label>

        <button type="button" className="primary" onClick={saveMicroRecipe} disabled={!canCreateMicroRecipe(state.microDraft)}>
          保存这张配方
        </button>
      </section>

      <section className="recipe-list">
        <h3>已生成的微习惯配方</h3>
        {state.microRecipes.length === 0 && <p className="empty-copy">先保存第一张配方。</p>}
        {state.microRecipes.map(recipe => (
          <article key={recipe.id} className="recipe-card">
            <span>{recipe.periodLabel}</span>
            <strong>{recipe.text}</strong>
            {recipe.note && <p>{recipe.note}</p>}
          </article>
        ))}
        <div className="actions">
          <button type="button" className="secondary" onClick={() => goToStep('timeline')}>返回时间轴</button>
          <button type="button" className="primary" onClick={() => goToStep('pearl')} disabled={state.microRecipes.length < 3}>
            下一步：创建珍珠习惯
          </button>
        </div>
      </section>
    </div>
  </div>
)}
```

- [ ] **Step 4: Add recipe styles**

Add:

```css
.recipe-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.8fr);
  gap: 16px;
  align-items: start;
}

.input-card,
.recipe-list,
.recipe-card {
  background: #fffdf9;
  border: 1px solid #eee4d2;
  border-radius: 8px;
}

.input-card,
.recipe-list {
  padding: 16px;
}

.input-card {
  display: grid;
  gap: 12px;
}

.input-card h3,
.recipe-list h3 {
  margin: 0;
  font-size: 1rem;
}

.stack-field {
  display: grid;
  gap: 6px;
}

.stack-field span {
  color: #4f4778;
  font-size: 0.78rem;
  font-weight: 800;
}

select,
textarea {
  width: 100%;
  color: var(--ft-ink);
  background: #fff;
  border: 1px solid var(--ft-line);
  border-radius: 8px;
  padding: 10px 11px;
}

textarea {
  min-height: 82px;
  resize: vertical;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.recipe-list {
  display: grid;
  gap: 10px;
}

.recipe-card {
  display: grid;
  gap: 6px;
  padding: 12px;
}

.recipe-card span {
  color: var(--ft-muted);
  font-size: 0.78rem;
  font-weight: 800;
}

.recipe-card strong {
  line-height: 1.55;
}

.recipe-card p {
  margin: 0;
  color: var(--ft-muted);
  font-size: 0.86rem;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .recipe-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Run build and browser check**

Run:

```powershell
npm run build
```

Browser check:
- Create 3 recipes.
- Confirm the “下一步：创建珍珠习惯” button is disabled before 3 recipes and enabled after 3.
- Refresh and confirm recipes persist.

- [ ] **Step 6: Commit**

```powershell
git add pages/anchor-prompts.js
git commit -m "feat: create micro habit recipes"
```

## Task 5: Implement Pearl Habit Creation

**Files:**
- Modify: `pages/anchor-prompts.js`

- [ ] **Step 1: Import pearl helpers**

Update imports:

```js
import {
  ANCHOR_PERIODS,
  ANCHOR_PROMPTS_STORAGE_KEY,
  ANCHOR_STEPS,
  buildPearlText,
  buildRecipeText,
  canCreateMicroRecipe,
  canCreatePearlRecipe,
  createInitialAnchorState,
  getReliableAnchors,
  makeId,
} from '../lib/anchorPrompts';
```

- [ ] **Step 2: Add pearl handlers**

Add:

```js
const updateAnnoyance = (index, value) => {
  setState(prev => {
    const annoyances = [...prev.annoyances];
    annoyances[index] = value;
    return { ...prev, annoyances };
  });
};

const updatePearlCandidate = (index, value) => {
  setState(prev => {
    const pearlCandidates = [...prev.pearlCandidates];
    pearlCandidates[index] = value;
    return { ...prev, pearlCandidates };
  });
};

const savePearlRecipe = () => {
  setState(prev => {
    if (!canCreatePearlRecipe(prev.selectedAnnoyance, prev.pearlCandidates)) return prev;
    const action = prev.pearlCandidates.find(item => item.trim()).trim();
    return {
      ...prev,
      pearlRecipe: {
        id: makeId('pearl'),
        type: 'pearl',
        periodId: 'annoyance',
        periodLabel: '烦恼出现时',
        anchorText: prev.selectedAnnoyance.trim(),
        action,
        text: buildPearlText(prev.selectedAnnoyance.trim(), action),
        note: '',
        completed: false,
      },
    };
  });
};
```

- [ ] **Step 3: Render pearl step**

Add:

```jsx
{state.step === 'pearl' && (
  <div className="recipe-editor">
    <p className="section-copy">把无法快速消除的烦恼当成提示。先列出经常困扰你的事，再选一个最频繁、最烦人的事项。</p>
    <div className="recipe-grid">
      <section className="input-card">
        <h3>烦恼清单</h3>
        {state.annoyances.map((annoyance, index) => (
          <label key={index} className="stack-field">
            <span>烦恼 {index + 1}</span>
            <input value={annoyance} placeholder="例如：排长队、噪音、等人迟到" onChange={event => updateAnnoyance(index, event.target.value)} />
          </label>
        ))}

        <h3>选择一个烦恼</h3>
        <select value={state.selectedAnnoyance} onChange={event => setState(prev => ({ ...prev, selectedAnnoyance: event.target.value }))}>
          <option value="">选择最频繁、最烦人的一个</option>
          {state.annoyances.filter(item => item.trim()).map(item => (
            <option key={item} value={item.trim()}>{item.trim()}</option>
          ))}
        </select>
      </section>

      <section className="input-card">
        <h3>有益替代动作</h3>
        {state.pearlCandidates.map((candidate, index) => (
          <label key={index} className="stack-field">
            <span>选项 {index + 1}</span>
            <input value={candidate} placeholder="例如：放松肩颈、单腿站立 10 秒" onChange={event => updatePearlCandidate(index, event.target.value)} />
          </label>
        ))}
        <button type="button" className="primary" onClick={savePearlRecipe} disabled={!canCreatePearlRecipe(state.selectedAnnoyance, state.pearlCandidates)}>
          保存珍珠习惯
        </button>
        {state.pearlRecipe && (
          <article className="recipe-card pearl">
            <span>珍珠习惯</span>
            <strong>{state.pearlRecipe.text}</strong>
          </article>
        )}
        <div className="actions">
          <button type="button" className="secondary" onClick={() => goToStep('micro')}>返回微习惯配方</button>
          <button type="button" className="primary" onClick={() => goToStep('result')} disabled={!state.pearlRecipe}>
            查看今日实践时间轴
          </button>
        </div>
      </section>
    </div>
  </div>
)}
```

- [ ] **Step 4: Add pearl highlight style**

Add:

```css
.recipe-card.pearl {
  border-color: #f2c14d;
  background: #fff8df;
}
```

- [ ] **Step 5: Run build and browser check**

Run:

```powershell
npm run build
```

Browser check:
- Add at least 10 annoyances.
- Select one annoyance.
- Add at least 5 replacement actions.
- Save pearl habit.
- Refresh and confirm pearl state persists.

- [ ] **Step 6: Commit**

```powershell
git add pages/anchor-prompts.js
git commit -m "feat: create pearl habit recipe"
```

## Task 6: Implement Practice Timeline and Lightweight Check-In

**Files:**
- Modify: `pages/anchor-prompts.js`
- Modify: `lib/anchorPrompts.js`

- [ ] **Step 1: Add result ordering helper**

Add to `lib/anchorPrompts.js`:

```js
export function getPracticeRecipes(state) {
  const periodOrder = [...ANCHOR_PERIODS.map(period => period.id), 'annoyance'];
  return [...state.microRecipes, state.pearlRecipe].filter(Boolean).sort((a, b) => {
    return periodOrder.indexOf(a.periodId) - periodOrder.indexOf(b.periodId);
  });
}
```

- [ ] **Step 2: Import helper and add check-in handler**

Update page imports:

```js
import {
  ANCHOR_PERIODS,
  ANCHOR_PROMPTS_STORAGE_KEY,
  ANCHOR_STEPS,
  buildPearlText,
  buildRecipeText,
  canCreateMicroRecipe,
  canCreatePearlRecipe,
  createInitialAnchorState,
  getPracticeRecipes,
  getReliableAnchors,
  makeId,
} from '../lib/anchorPrompts';
```

Add:

```js
const practiceRecipes = useMemo(() => getPracticeRecipes(state), [state]);

const toggleRecipeDone = recipeId => {
  setState(prev => ({
    ...prev,
    microRecipes: prev.microRecipes.map(recipe =>
      recipe.id === recipeId ? { ...recipe, completed: !recipe.completed } : recipe
    ),
    pearlRecipe: prev.pearlRecipe && prev.pearlRecipe.id === recipeId
      ? { ...prev.pearlRecipe, completed: !prev.pearlRecipe.completed }
      : prev.pearlRecipe,
  }));
};
```

- [ ] **Step 3: Render result step**

Add:

```jsx
{state.step === 'result' && (
  <div className="practice-view">
    <div className="result-summary">
      <div>
        <p className="step-label">三步已完成</p>
        <h3>你的今日实践时间轴</h3>
        <p>如果完成了某项，可以回来在对应配方上打卡。</p>
      </div>
      <strong>{practiceRecipes.filter(recipe => recipe.completed).length} / {practiceRecipes.length} 已完成</strong>
    </div>

    <div className="practice-timeline">
      {practiceRecipes.map(recipe => (
        <article key={recipe.id} className={`practice-card ${recipe.type === 'pearl' ? 'pearl' : ''} ${recipe.completed ? 'done' : ''}`}>
          <div className="timeline-dot" aria-hidden="true" />
          <div>
            <span>{recipe.periodLabel} · {recipe.type === 'pearl' ? recipe.anchorText : `${recipe.anchorText}之后`}</span>
            <strong>{recipe.text}</strong>
            {recipe.note && <p>{recipe.note}</p>}
          </div>
          <button type="button" onClick={() => toggleRecipeDone(recipe.id)}>
            {recipe.completed ? '已完成' : '完成后打卡'}
          </button>
        </article>
      ))}
    </div>

    <div className="actions">
      <button type="button" className="secondary" onClick={() => goToStep('pearl')}>继续调整</button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Add result styles**

Add:

```css
.practice-view {
  display: grid;
  gap: 18px;
}

.result-summary {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  background: #fffdf9;
  border: 1px solid #eee4d2;
  border-radius: 8px;
  padding: 16px;
}

.result-summary h3 {
  margin: 0 0 6px;
  font-size: 1.4rem;
}

.result-summary p {
  margin: 0;
  color: var(--ft-muted);
  line-height: 1.6;
}

.result-summary > strong {
  white-space: nowrap;
  color: #4a3500;
  background: #fff8df;
  border: 1px solid #f2c14d;
  border-radius: 999px;
  padding: 8px 12px;
}

.practice-timeline {
  position: relative;
  display: grid;
  gap: 14px;
  padding-left: 28px;
}

.practice-timeline::before {
  content: '';
  position: absolute;
  left: 9px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  background: #eadfce;
  border-radius: 999px;
}

.practice-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  background: #fffdf9;
  border: 1px solid #eee4d2;
  border-radius: 8px;
  padding: 14px;
}

.practice-card.pearl {
  border-color: #f2c14d;
  background: #fff8df;
}

.practice-card.done {
  border-color: rgba(22, 133, 111, 0.38);
  background: rgba(22, 133, 111, 0.08);
}

.timeline-dot {
  position: absolute;
  left: -26px;
  top: 20px;
  width: 17px;
  height: 17px;
  background: var(--ft-plum);
  border: 3px solid #fff;
  border-radius: 999px;
}

.practice-card.pearl .timeline-dot {
  background: #f2c14d;
}

.practice-card span,
.practice-card strong,
.practice-card p {
  display: block;
}

.practice-card span {
  color: var(--ft-muted);
  font-size: 0.78rem;
  font-weight: 800;
}

.practice-card strong {
  margin-top: 5px;
  line-height: 1.55;
}

.practice-card button {
  min-height: 40px;
  color: #4d4564;
  background: #fff;
  border: 1px solid var(--ft-line);
  border-radius: 999px;
  padding: 8px 14px;
  font-weight: 800;
  cursor: pointer;
}

.practice-card.done button {
  color: #fff;
  background: var(--ft-success);
  border-color: var(--ft-success);
}

@media (max-width: 640px) {
  .result-summary,
  .practice-card {
    grid-template-columns: 1fr;
  }

  .result-summary {
    display: grid;
  }
}
```

- [ ] **Step 5: Run build and browser check**

Run:

```powershell
npm run build
```

Browser check:
- Complete the whole flow.
- Confirm result page shows 4 items in timeline order.
- Toggle at least 2 check-ins.
- Refresh and confirm check-in states persist.
- Check 375px mobile: no page-level horizontal overflow.

- [ ] **Step 6: Commit**

```powershell
git add pages/anchor-prompts.js lib/anchorPrompts.js
git commit -m "feat: add practice timeline checkins"
```

## Task 7: Wire Navigation, Homepage, and Report

**Files:**
- Modify: `components/SiteNav.js`
- Modify: `pages/index.js`
- Modify: `pages/ability-chain.js`

- [ ] **Step 1: Add nav link**

In `components/SiteNav.js`, change `links` to:

```js
const links = [
  { href: '/', label: '工具箱' },
  { href: '/golden-behavior', label: '黄金行为' },
  { href: '/ability-chain', label: '能力链' },
  { href: '/anchor-prompts', label: '锚点提示' },
];
```

Check mobile nav after this step. If four equal links feel cramped at 375px, update mobile `.nav-links` to wrap:

```css
.nav-links {
  flex-wrap: wrap;
}

.nav-links :global(a) {
  min-width: calc(50% - 3px);
}
```

- [ ] **Step 2: Add homepage tool card**

In `pages/index.js`, add this object to `tools`:

```js
{
  title: '锚点提示设计器',
  eyebrow: '从日程锚点出发',
  description: '适合“我已经知道想做什么，但需要一个自然发生的提示”。绘制一天的习惯时间轴，把微习惯钉到可靠锚点之后。',
  href: '/anchor-prompts',
  cta: '设计提示',
  accent: 'purple',
},
```

Update `.tools` grid:

```css
.tools {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}
```

Add responsive fallback:

```css
@media (max-width: 900px) {
  .tools {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Extend homepage recommended flow**

In `flowSteps`, add:

```js
{
  title: '提示配方',
  description: '把微行为接到可靠锚点之后，知道何时开始。',
},
```

Update intro copy from “再把选中的行为带入能力链设计器” to mention the third step:

```jsx
<p>
  先用黄金行为探索器找到“高影响 + 容易做”的行为，再用能力链设计器降低执行难度，最后用锚点提示设计器把它接到一天里的可靠提示之后。
</p>
```

- [ ] **Step 4: Read anchor data in report generator**

In `pages/ability-chain.js`, add the storage key near existing report constants:

```js
const ANCHOR_PROMPTS_STORAGE_KEY = 'fogg-tools-anchor-prompts-state-v1';
```

Add a report helper near the existing golden report helper:

```js
function readAnchorPromptReportData() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ANCHOR_PROMPTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function escapeReportText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildAnchorPromptReportSection(anchorData) {
  if (!anchorData) {
    return '<span class="muted">本次报告未发现锚点提示设计结果。</span>';
  }
  const microRecipes = Array.isArray(anchorData.microRecipes) ? anchorData.microRecipes : [];
  const pearlRecipe = anchorData.pearlRecipe ? [anchorData.pearlRecipe] : [];
  const recipes = [...microRecipes, ...pearlRecipe];
  if (!recipes.length) {
    return '<span class="muted">锚点提示设计器已有进度，但还没有生成配方。</span>';
  }
  return `
    <div class="list">
      ${recipes.map(recipe => `
        <div class="item">
          <strong>${escapeReportText(recipe.type === 'pearl' ? '珍珠习惯' : recipe.periodLabel)}</strong>
          <p>${escapeReportText(recipe.text)}</p>
          <p class="muted">状态：${recipe.completed ? '已完成' : '未完成'}</p>
          ${recipe.note ? `<p class="muted">备注：${escapeReportText(recipe.note)}</p>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}
```

If an escape helper with the same name already exists, reuse it instead of duplicating it.

- [ ] **Step 5: Insert report section**

Inside the function that builds the final report HTML, read anchor data:

```js
const anchorReportData = readAnchorPromptReportData();
const anchorPromptSection = buildAnchorPromptReportSection(anchorReportData);
```

Add a section after the ability-chain section:

```html
<section>
  <h2>锚点提示设计</h2>
  <p>这一部分记录用户如何把微行为接到可靠锚点之后，并把配方排回一天的实践时间轴。</p>
  ${anchorPromptSection}
</section>
```

- [ ] **Step 6: Run build and browser checks**

Run:

```powershell
npm run build
```

Browser check:
- `/` shows three tool cards and a 5-step recommended flow.
- `SiteNav` shows `锚点提示` and highlights it on `/anchor-prompts`.
- Mobile 375px nav and homepage have no page-level horizontal overflow.
- After creating anchor prompt data, `/ability-chain` report preview includes `锚点提示设计`.

- [ ] **Step 7: Commit**

```powershell
git add components/SiteNav.js pages/index.js pages/ability-chain.js
git commit -m "feat: integrate anchor prompts tool"
```

## Task 8: Final Verification and Project Docs

**Files:**
- Modify: `docs/status/current-status.md`
- Modify: `docs/handoffs/latest-handoff.md`

- [ ] **Step 1: Run full build**

Run:

```powershell
npm run build
```

Expected:
- Build succeeds.
- Output includes `/`, `/golden-behavior`, `/ability-chain`, `/anchor-prompts`.

- [ ] **Step 2: Browser desktop regression**

At desktop width around 1280px, check:
- `/`
- `/golden-behavior`
- `/ability-chain`
- `/anchor-prompts`

Expected:
- SiteNav works and active route is correct.
- No default blue underlined links in tool CTAs.
- No page-level horizontal overflow.

- [ ] **Step 3: Browser mobile regression**

At 375px width, check:
- `/`
- `/anchor-prompts`
- Result page after completing the anchor prompt flow.

Expected:
- Navigation wraps or fits cleanly.
- Timeline and recipe cards are single-column.
- No page-level horizontal overflow.
- Check-in buttons remain visible and tappable.

- [ ] **Step 4: End-to-end third tool check**

In `/anchor-prompts`:
- Add habits in at least 3 periods.
- Mark at least 3 reliable anchors.
- Create 3 micro habit recipes.
- Create 1 pearl habit recipe.
- Open result page.
- Toggle at least 2 check-ins.
- Refresh page.

Expected:
- 4 recipes remain visible.
- Check-in states persist.
- The page still shows the result step or preserves enough state to return there.

- [ ] **Step 5: Report check**

In `/ability-chain`:
- Click `生成分析报告`.
- Confirm the report preview or downloaded HTML includes `锚点提示设计`.
- Confirm recipe text and check-in states are present.

Expected:
- Report generation does not throw.
- Existing golden behavior and ability-chain report sections remain present.

- [ ] **Step 6: Update docs**

Update `docs/status/current-status.md` with:

```markdown
- 第三个工具 `锚点提示设计器` 已实现，路由为 `/anchor-prompts`。
- 首页和导航已加入第三工具入口。
- 第三工具支持习惯时间轴、3 张微习惯配方、1 张珍珠习惯配方、实践时间轴和轻量打卡。
- HTML 分析报告已加入“锚点提示设计”章节。
- `npm run build` 已通过；桌面端和 375px 移动端已完成无横向溢出检查。
```

Update `docs/handoffs/latest-handoff.md` with:

```markdown
- `pages/anchor-prompts.js`：第三工具页面，包含 localStorage 缓存、时间轴、配方创建、珍珠习惯和轻量打卡。
- `lib/anchorPrompts.js`：第三工具的常量和纯 helper。
- `/anchor-prompts` 已接入 `SiteNav`、首页工具卡和 HTML 分析报告。
```

- [ ] **Step 7: Commit docs**

```powershell
git add docs/status/current-status.md docs/handoffs/latest-handoff.md
git commit -m "docs: record anchor prompts implementation"
```

## Self-Review

- Spec coverage:
  - Independent route `/anchor-prompts`: Task 2.
  - Seven-period habit timeline: Task 3.
  - Reliable anchors: Task 3.
  - Three micro habit recipes: Task 4.
  - Pearl habit from annoyances and replacement actions: Task 5.
  - Practice timeline with lightweight check-in: Task 6.
  - Homepage, nav, report integration: Task 7.
  - Desktop/mobile/build verification and handoff docs: Task 8.
- Placeholder scan: no unresolved placeholder markers remain.
- Type consistency:
  - Recipe shape consistently uses `id`, `type`, `periodId`, `periodLabel`, `anchorText`, `action`, `text`, `note`, `completed`.
  - Storage key is consistently `fogg-tools-anchor-prompts-state-v1`.
  - Route is consistently `/anchor-prompts`.
