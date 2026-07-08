import { useEffect, useMemo, useState } from 'react';
import SiteNav from '../components/SiteNav';
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
  const reliableAnchors = useMemo(() => getReliableAnchors(state.habits), [state.habits]);

  const goToStep = step => setState(prev => ({ ...prev, step }));

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
            {state.step !== 'timeline' && state.step !== 'micro' && (
              <p className="empty-copy">这个步骤会在下一轮实现中接上配方和珍珠习惯流程。</p>
            )}
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

          .period-row,
          .habit-item {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
