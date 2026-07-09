import { useEffect, useMemo, useState } from 'react';
import SiteNav from '../components/SiteNav';
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

export default function AnchorPromptsPage() {
  const [state, setState] = useState(createInitialAnchorState);
  const [loaded, setLoaded] = useState(false);
  const [draggingHabit, setDraggingHabit] = useState(null);

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
  const practiceRecipes = useMemo(() => getPracticeRecipes(state), [state]);
  const pearlProgress = useMemo(() => {
    if (state.pearlRecipe) return 4;
    if ((state.selectedPearlCandidate || '').trim()) return 3;
    if (state.pearlCandidates.some(candidate => candidate.trim())) return 2;
    if (state.selectedAnnoyance.trim()) return 1;
    return 0;
  }, [state.pearlCandidates, state.pearlRecipe, state.selectedAnnoyance, state.selectedPearlCandidate]);

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

  const reorderHabit = (periodId, fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setState(prev => {
      const habits = [...(prev.habits[periodId] || [])];
      if (!habits[fromIndex] || !habits[toIndex]) return prev;
      const [moved] = habits.splice(fromIndex, 1);
      habits.splice(toIndex, 0, moved);
      return {
        ...prev,
        habits: {
          ...prev.habits,
          [periodId]: habits,
        },
      };
    });
  };

  const moveHabit = (periodId, habitId, direction) => {
    const habits = state.habits[periodId] || [];
    const index = habits.findIndex(habit => habit.id === habitId);
    reorderHabit(periodId, index, index + direction);
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
        microRecipes: [...prev.microRecipes, recipe],
        microDraft: {
          anchorId: '',
          candidates: ['', '', ''],
          selectedCandidate: '',
          note: '',
        },
      };
    });
  };

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
      const selectedPearlCandidate = prev.selectedPearlCandidate === prev.pearlCandidates[index]
        ? value.trim()
        : prev.selectedPearlCandidate;
      return { ...prev, pearlCandidates, selectedPearlCandidate };
    });
  };

  const savePearlRecipe = () => {
    setState(prev => {
      if (!canCreatePearlRecipe(prev.selectedAnnoyance, prev.selectedPearlCandidate)) return prev;
      const action = prev.selectedPearlCandidate.trim();
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
                      <h3><span className="period-icon" aria-hidden="true">{period.icon}</span>{period.label}</h3>
                      <p>{period.hint}</p>
                    </div>
                    <div className="habit-list">
                      {(state.habits[period.id] || []).map((habit, index) => (
                        <div
                          key={habit.id}
                          className={`habit-item ${habit.reliable ? 'reliable' : ''}`}
                          onDragOver={event => event.preventDefault()}
                          onDrop={event => {
                            event.preventDefault();
                            if (!draggingHabit || draggingHabit.periodId !== period.id) return;
                            reorderHabit(period.id, draggingHabit.index, index);
                            setDraggingHabit(null);
                          }}
                        >
                          <span
                            className="drag-handle"
                            draggable
                            title="拖动调整顺序"
                            onDragStart={() => setDraggingHabit({ periodId: period.id, index })}
                            onDragEnd={() => setDraggingHabit(null)}
                          >
                            ↕
                          </span>
                          <input
                            value={habit.text}
                            placeholder="例如：刷牙、打开电脑、上床"
                            onChange={event => updateHabitText(period.id, habit.id, event.target.value)}
                          />
                          <button type="button" className="ghost order-btn" onClick={() => moveHabit(period.id, habit.id, -1)} disabled={index === 0}>
                            上移
                          </button>
                          <button type="button" className="ghost order-btn" onClick={() => moveHabit(period.id, habit.id, 1)} disabled={index === (state.habits[period.id] || []).length - 1}>
                            下移
                          </button>
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
            {state.step === 'pearl' && (
              <div className="recipe-editor">
                <p className="section-copy">把无法快速消除的烦恼当成提示。先列出经常困扰你的事，再选一个最频繁、最烦人的事项。</p>
                <div className="pearl-layout">
                  <aside className={`pearl-stage-card stage-${pearlProgress}`} aria-label="珍珠习惯可视化进度">
                    <div className="clam" aria-hidden="true">
                      <div className="clam-shell top-shell" />
                      <div className="clam-mouth">
                        {pearlProgress > 0 && <span className={`pearl-object stage-${pearlProgress}`} />}
                      </div>
                      <div className="clam-shell bottom-shell" />
                    </div>
                    <strong>{pearlProgress === 4 ? '珍珠习惯已成形' : '把烦恼慢慢磨成珍珠'}</strong>
                    <p>
                      {pearlProgress === 0 && '先选择一个最常困扰你的烦恼。'}
                      {pearlProgress === 1 && '烦恼像一颗有棱角的小石子，已经进入蚌里。'}
                      {pearlProgress === 2 && '开始探索新的、有益的习惯，石子正在变圆润。'}
                      {pearlProgress === 3 && '你已经挑出最佳选项，珍珠快要成形了。'}
                      {pearlProgress === 4 && '已经生成珍珠习惯，可以放到实践时间轴里。'}
                    </p>
                  </aside>

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
                      <h3>新的、有益的习惯选项</h3>
                      {state.pearlCandidates.map((candidate, index) => (
                        <label key={index} className="stack-field">
                          <span>选项 {index + 1}</span>
                          <input value={candidate} placeholder="例如：放松肩颈、单腿站立 10 秒" onChange={event => updatePearlCandidate(index, event.target.value)} />
                        </label>
                      ))}

                      <h3>挑选最佳选项</h3>
                      <select value={state.selectedPearlCandidate || ''} onChange={event => setState(prev => ({ ...prev, selectedPearlCandidate: event.target.value }))}>
                        <option value="">从上面的有益习惯里选择一个</option>
                        {state.pearlCandidates.filter(item => item.trim()).map(candidate => (
                          <option key={candidate} value={candidate.trim()}>{candidate.trim()}</option>
                        ))}
                      </select>

                      <button type="button" className="primary" onClick={savePearlRecipe} disabled={!canCreatePearlRecipe(state.selectedAnnoyance, state.selectedPearlCandidate || '')}>
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
              </div>
            )}
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
                      {recipe.type === 'pearl' && (
                        <div className={`mini-pearl ${recipe.completed ? 'polished' : ''}`} aria-hidden="true">
                          <span />
                        </div>
                      )}
                      <button type="button" onClick={() => toggleRecipeDone(recipe.id)}>
                        {recipe.type === 'pearl'
                          ? (recipe.completed ? '珍珠已擦亮' : '擦亮珍珠')
                          : (recipe.completed ? '已完成' : '完成后打卡')}
                      </button>
                    </article>
                  ))}
                </div>

                <div className="actions">
                  <button type="button" className="secondary" onClick={() => goToStep('pearl')}>继续调整</button>
                </div>
              </div>
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
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 6px;
          font-size: 1rem;
        }

        .period-icon {
          display: inline-flex;
          width: 30px;
          height: 30px;
          align-items: center;
          justify-content: center;
          background: #f0ecf8;
          border: 1px solid var(--ft-line);
          border-radius: 999px;
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
          grid-template-columns: auto minmax(0, 1fr) auto auto auto auto;
          gap: 8px;
          align-items: center;
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

        .drag-handle {
          display: inline-flex;
          width: 34px;
          height: 40px;
          align-items: center;
          justify-content: center;
          color: var(--ft-plum);
          background: #f5f0fb;
          border: 1px solid var(--ft-line);
          border-radius: 999px;
          cursor: grab;
          font-weight: 900;
          user-select: none;
        }

        .drag-handle:active {
          cursor: grabbing;
        }

        .order-btn {
          padding-inline: 12px;
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

        .recipe-card.pearl {
          border-color: #f2c14d;
          background: #fff8df;
        }

        .pearl-layout {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }

        .pearl-stage-card {
          position: sticky;
          top: 16px;
          display: grid;
          gap: 12px;
          justify-items: center;
          text-align: center;
          background: #fffdf9;
          border: 1px solid #eee4d2;
          border-radius: 8px;
          padding: 18px 16px;
        }

        .pearl-stage-card strong {
          color: var(--ft-ink);
        }

        .pearl-stage-card p {
          margin: 0;
          color: var(--ft-muted);
          font-size: 0.86rem;
          line-height: 1.65;
        }

        .clam {
          position: relative;
          width: 178px;
          height: 146px;
          display: grid;
          place-items: center;
        }

        .clam-shell {
          position: absolute;
          left: 16px;
          width: 146px;
          height: 66px;
          background:
            radial-gradient(circle at 28% 28%, rgba(255,255,255,.72), transparent 28%),
            linear-gradient(145deg, #f7d9df, #e8b5c4 58%, #d796aa);
          border: 2px solid #c9879b;
          box-shadow: 0 8px 20px rgba(108, 76, 97, 0.12);
        }

        .top-shell {
          top: 17px;
          border-radius: 90px 90px 24px 24px;
          transform: rotate(-7deg);
          transform-origin: 50% 100%;
        }

        .bottom-shell {
          bottom: 16px;
          border-radius: 24px 24px 90px 90px;
          transform: rotate(5deg);
          transform-origin: 50% 0;
        }

        .clam-mouth {
          position: absolute;
          z-index: 2;
          top: 58px;
          left: 41px;
          width: 96px;
          height: 44px;
          display: grid;
          place-items: center;
          background: #fffaf1;
          border: 1px solid rgba(201, 135, 155, 0.46);
          border-radius: 999px;
          box-shadow: inset 0 0 18px rgba(217, 155, 30, 0.16);
        }

        .pearl-object {
          display: inline-block;
          width: 34px;
          height: 34px;
          background: #817986;
          border: 1px solid rgba(62, 56, 84, 0.28);
          transition: border-radius .25s ease, clip-path .25s ease, background .25s ease, box-shadow .25s ease, transform .25s ease;
        }

        .pearl-object.stage-1 {
          clip-path: polygon(50% 0, 94% 78%, 8% 70%);
          transform: rotate(-12deg);
        }

        .pearl-object.stage-2 {
          clip-path: inset(0 0 0 0 round 5px);
          background: #9a919a;
          transform: rotate(8deg);
        }

        .pearl-object.stage-3 {
          clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%);
          background: #c8b7c4;
        }

        .pearl-object.stage-4 {
          width: 38px;
          height: 38px;
          clip-path: none;
          border-radius: 999px;
          background:
            radial-gradient(circle at 30% 25%, #fff, rgba(255,255,255,.3) 26%, transparent 27%),
            radial-gradient(circle at 65% 70%, rgba(242, 193, 77, .45), transparent 35%),
            linear-gradient(145deg, #fffdf6, #f4d6ec 48%, #d9c4ff);
          box-shadow: 0 0 18px rgba(242, 193, 77, 0.75), 0 6px 20px rgba(98, 73, 127, 0.16);
        }

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
          grid-template-columns: minmax(0, 1fr) auto auto;
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

        .mini-pearl {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          background: #fffaf1;
          border: 1px solid #f2c14d;
          border-radius: 999px;
        }

        .mini-pearl span {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: linear-gradient(145deg, #fffdf6, #f4d6ec 48%, #d9c4ff);
          box-shadow: 0 0 12px rgba(242, 193, 77, 0.45);
        }

        .mini-pearl.polished span {
          box-shadow: 0 0 18px rgba(242, 193, 77, 0.95), 0 0 32px rgba(255, 255, 255, 0.9);
          transform: scale(1.08);
        }

        @media (max-width: 900px) {
          .pearl-layout,
          .recipe-grid {
            grid-template-columns: 1fr;
          }

          .pearl-stage-card {
            position: static;
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

          .drag-handle {
            width: 100%;
          }
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
      `}</style>
    </>
  );
}
