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

  const startHabitDrag = (event, periodId, index) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDraggingHabit({ periodId, index });
  };

  const updateHabitDrag = event => {
    if (!draggingHabit || typeof document === 'undefined') return;
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-habit-item="true"]');
    if (!target) return;
    const targetPeriodId = target.getAttribute('data-period-id');
    const targetIndex = Number(target.getAttribute('data-habit-index'));
    if (targetPeriodId !== draggingHabit.periodId || Number.isNaN(targetIndex) || targetIndex === draggingHabit.index) return;
    reorderHabit(draggingHabit.periodId, draggingHabit.index, targetIndex);
    setDraggingHabit({ periodId: draggingHabit.periodId, index: targetIndex });
  };

  const finishHabitDrag = () => {
    setDraggingHabit(null);
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
      const selectedPearlCandidate = prev.selectedPearlCandidate && prev.selectedPearlCandidate === prev.pearlCandidates[index]
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

  const removeMicroRecipe = recipeId => {
    setState(prev => ({
      ...prev,
      microRecipes: prev.microRecipes.filter(recipe => recipe.id !== recipeId),
    }));
  };

  const resetPearlRecipe = () => {
    setState(prev => ({
      ...prev,
      selectedAnnoyance: '',
      pearlCandidates: ['', '', '', '', ''],
      selectedPearlCandidate: '',
      pearlRecipe: null,
    }));
  };

  const clearAllRecipes = () => {
    setState(prev => ({
      ...prev,
      microRecipes: [],
      selectedAnnoyance: '',
      pearlCandidates: ['', '', '', '', ''],
      selectedPearlCandidate: '',
      pearlRecipe: null,
    }));
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
                          className={`habit-item ${habit.reliable ? 'reliable' : ''} ${draggingHabit?.periodId === period.id && draggingHabit.index === index ? 'dragging' : ''}`}
                          data-habit-item="true"
                          data-period-id={period.id}
                          data-habit-index={index}
                          onDragOver={event => event.preventDefault()}
                          onDrop={event => {
                            event.preventDefault();
                            if (!draggingHabit || draggingHabit.periodId !== period.id) return;
                            reorderHabit(period.id, draggingHabit.index, index);
                            setDraggingHabit(null);
                          }}
                        >
                          <button
                            type="button"
                            className="drag-edge"
                            aria-label={`拖动调整${habit.text || period.label}的顺序`}
                            title="按住上下拖动调整顺序"
                            onPointerDown={event => startHabitDrag(event, period.id, index)}
                            onPointerMove={updateHabitDrag}
                            onPointerUp={finishHabitDrag}
                            onPointerCancel={finishHabitDrag}
                          >
                            <span aria-hidden="true" />
                          </button>
                          <input
                            value={habit.text}
                            placeholder="例如：刷牙、打开电脑、上床"
                            onChange={event => updateHabitText(period.id, habit.id, event.target.value)}
                          />
                          <div className="habit-actions">
                            <button type="button" className="anchor-toggle" onClick={() => toggleReliable(period.id, habit.id)}>
                              {habit.reliable ? '可靠锚点' : '标为锚点'}
                            </button>
                            <button type="button" className="ghost" onClick={() => removeHabit(period.id, habit.id)}>
                              删除
                            </button>
                          </div>
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
                        <button type="button" className="text-button danger" onClick={() => removeMicroRecipe(recipe.id)}>
                          删除这张配方
                        </button>
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
                      <svg className="clam-svg" viewBox="0 0 220 170" role="img" aria-hidden="true">
                        <defs>
                          <linearGradient id="clamShellGradient" x1="0" x2="1" y1="0" y2="1">
                            <stop offset="0" stopColor="#7a4f96" />
                            <stop offset="0.55" stopColor="#51316e" />
                            <stop offset="1" stopColor="#2f2049" />
                          </linearGradient>
                          <linearGradient id="clamInnerGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0" stopColor="#fff5ef" />
                            <stop offset="0.58" stopColor="#f7bdc9" />
                            <stop offset="1" stopColor="#df88aa" />
                          </linearGradient>
                        </defs>
                        <path className="clam-top-fill" d="M20 99 C29 44 67 18 109 16 C151 18 191 45 200 99 C153 83 69 83 20 99Z" />
                        <path className="clam-top-edge" d="M20 99 C29 44 67 18 109 16 C151 18 191 45 200 99" />
                        <path className="clam-ridge" d="M109 18 C101 45 98 70 101 96" />
                        <path className="clam-ridge" d="M83 25 C88 50 92 72 95 98" />
                        <path className="clam-ridge" d="M61 40 C75 58 84 77 90 100" />
                        <path className="clam-ridge" d="M137 25 C130 50 126 72 123 98" />
                        <path className="clam-ridge" d="M160 40 C145 58 136 77 130 100" />
                        <path className="clam-inner" d="M36 103 C58 74 162 74 184 103 C173 138 143 154 110 154 C77 154 47 138 36 103Z" />
                        <path className="clam-lip" d="M40 103 C67 91 154 91 181 103" />
                        <path className="clam-bottom" d="M35 105 C52 139 80 156 110 156 C140 156 169 139 185 105 C150 116 72 116 35 105Z" />
                      </svg>
                      {pearlProgress > 0 && <span className={`pearl-object stage-${pearlProgress}`} />}
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
                          <button type="button" className="text-button danger" onClick={resetPearlRecipe}>
                            重做珍珠习惯
                          </button>
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
                      <button
                        type="button"
                        className="text-button danger"
                        onClick={() => recipe.type === 'pearl' ? resetPearlRecipe() : removeMicroRecipe(recipe.id)}
                      >
                        删除
                      </button>
                    </article>
                  ))}
                </div>

                <div className="actions">
                  <button type="button" className="secondary" onClick={() => goToStep('pearl')}>继续调整</button>
                  {practiceRecipes.length > 0 && (
                    <button type="button" className="secondary danger-action" onClick={clearAllRecipes}>
                      清空配方记录
                    </button>
                  )}
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
          grid-template-columns: 42px minmax(0, 1fr) auto;
          gap: 8px;
          align-items: center;
        }

        .habit-item.dragging {
          opacity: 0.82;
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

        .drag-edge {
          width: 42px;
          min-width: 42px;
          min-height: 44px;
          padding: 0;
          background: #f5f0fb;
          border-color: #ded3ec;
          border-radius: 8px;
          cursor: grab;
          touch-action: none;
          user-select: none;
        }

        .drag-edge span {
          display: block;
          width: 16px;
          height: 26px;
          margin: 0 auto;
          border-left: 2px dotted #7b6596;
          border-right: 2px dotted #7b6596;
        }

        .drag-edge:active {
          cursor: grabbing;
        }

        .habit-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .habit-item.reliable input {
          border-color: var(--ft-amber);
          background: #fff8df;
        }

        .anchor-toggle,
        .primary {
          color: #fff;
          background: var(--ft-plum);
          border-color: var(--ft-plum);
        }

        .habit-item.reliable .anchor-toggle {
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

        .text-button {
          justify-self: start;
          min-height: 0;
          color: #6d5b86;
          background: transparent;
          border: 0;
          padding: 3px 0;
          font-weight: 800;
          cursor: pointer;
        }

        .text-button:hover {
          color: var(--ft-plum);
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .danger,
        .danger-action {
          color: #8b3f4d;
        }

        .danger-action {
          background: #fff7f7;
          border-color: #e8c5c9;
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
          width: 210px;
          height: 162px;
          display: grid;
          place-items: center;
        }

        .clam-svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 12px 18px rgba(67, 47, 82, 0.16));
        }

        .clam-top-fill,
        .clam-bottom {
          fill: url(#clamShellGradient);
          stroke: #251a3b;
          stroke-width: 3;
          stroke-linejoin: round;
        }

        .clam-top-edge,
        .clam-ridge,
        .clam-lip {
          fill: none;
          stroke-linecap: round;
        }

        .clam-top-edge {
          stroke: rgba(255, 239, 255, 0.32);
          stroke-width: 3;
        }

        .clam-ridge {
          stroke: rgba(223, 196, 239, 0.62);
          stroke-width: 4;
        }

        .clam-inner {
          fill: url(#clamInnerGradient);
          stroke: #b86d91;
          stroke-width: 3;
        }

        .clam-lip {
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 4;
        }

        .pearl-object {
          position: absolute;
          z-index: 2;
          top: 108px;
          left: 50%;
          display: block;
          width: 34px;
          height: 34px;
          background: #817986;
          border: 1px solid rgba(62, 56, 84, 0.28);
          transform: translate(-50%, -50%);
          transition: border-radius .25s ease, clip-path .25s ease, background .25s ease, box-shadow .25s ease, transform .25s ease;
        }

        .pearl-object.stage-1 {
          clip-path: polygon(50% 0, 94% 78%, 8% 70%);
          transform: translate(-50%, -50%) rotate(-12deg);
        }

        .pearl-object.stage-2 {
          clip-path: inset(0 0 0 0 round 5px);
          background: #9a919a;
          transform: translate(-50%, -50%) rotate(8deg);
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
          grid-template-columns: minmax(0, 1fr) auto auto auto;
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

        .practice-card .text-button {
          justify-self: end;
          min-height: 0;
          color: #8b3f4d;
          background: transparent;
          border: 0;
          padding: 3px 0;
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

          .period-row {
            grid-template-columns: 1fr;
          }

          .habit-item {
            grid-template-columns: 40px minmax(0, 1fr);
            align-items: stretch;
          }

          .drag-edge {
            grid-row: 1 / span 2;
            width: 40px;
            min-width: 40px;
            min-height: 88px;
            height: 100%;
          }

          .habit-actions {
            grid-column: 2;
            justify-content: flex-start;
          }

          .habit-actions button {
            min-height: 38px;
            padding-inline: 12px;
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

          .clam {
            width: 184px;
            height: 142px;
          }

          .pearl-object {
            top: 95px;
          }

          .practice-card .text-button {
            justify-self: start;
          }
        }
      `}</style>
    </>
  );
}
