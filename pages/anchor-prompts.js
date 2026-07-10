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
  const pearlStage = useMemo(() => {
    if (state.pearlRecipe?.completed) return 6;
    if (state.pearlRecipe) return 5;
    if ((state.pearlTinyAction || '').trim()) return 4;
    if ((state.selectedPearlCandidate || '').trim()) return 3;
    if (state.pearlCandidates.some(candidate => candidate.trim())) return 2;
    if (state.selectedAnnoyance.trim()) return 1;
    return 0;
  }, [
    state.pearlCandidates,
    state.pearlRecipe,
    state.pearlTinyAction,
    state.selectedAnnoyance,
    state.selectedPearlCandidate,
  ]);
  const pearlCompanionText = [
    '先写下一个经常出现的烦恼。',
    '烦恼已经放进蚌里了。',
    '正在探索新的有益习惯。',
    '已选出最适合的有益习惯。',
    '微习惯正在变得更圆润。',
    '珍珠习惯已成形。',
    '珍珠已被擦亮。',
  ][pearlStage];
  const pearlCompanionMode = pearlStage === 0 || pearlStage === 5 ? 'is-closed' : 'is-open';

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

  const updatePearlTinyHabit = patch => {
    setState(prev => ({ ...prev, ...patch }));
  };

  const savePearlRecipe = () => {
    setState(prev => {
      if (!canCreatePearlRecipe(prev.selectedAnnoyance, prev.selectedPearlCandidate, prev.pearlTinyMethod || '', prev.pearlTinyAction || '')) return prev;
      const sourceAction = prev.selectedPearlCandidate.trim();
      const action = prev.pearlTinyAction.trim();
      return {
        ...prev,
        pearlRecipe: {
          id: makeId('pearl'),
          type: 'pearl',
          periodId: 'annoyance',
          periodLabel: '烦恼出现时',
          anchorText: prev.selectedAnnoyance.trim(),
          sourceAction,
          tinyMethod: prev.pearlTinyMethod,
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
      pearlTinyMethod: '',
      pearlTinyAction: '',
      pearlPolishPulse: 0,
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
      pearlTinyMethod: '',
      pearlTinyAction: '',
      pearlPolishPulse: 0,
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
      pearlPolishPulse: prev.pearlRecipe && prev.pearlRecipe.id === recipeId
        ? (prev.pearlPolishPulse || 0) + 1
        : (prev.pearlPolishPulse || 0),
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

                      <h3>把有益习惯变成微习惯</h3>
                      <div className="method-toggle" aria-label="微习惯设计方法">
                        <button
                          type="button"
                          className={state.pearlTinyMethod === 'scale-down' ? 'selected' : ''}
                          onClick={() => updatePearlTinyHabit({ pearlTinyMethod: 'scale-down' })}
                        >
                          <strong>规模缩小化</strong>
                          <span>把这个习惯缩到小到不会抗拒。</span>
                        </button>
                        <button
                          type="button"
                          className={state.pearlTinyMethod === 'starter-step' ? 'selected' : ''}
                          onClick={() => updatePearlTinyHabit({ pearlTinyMethod: 'starter-step' })}
                        >
                          <strong>入门步骤化</strong>
                          <span>只做进入这个习惯的第一步。</span>
                        </button>
                      </div>

                      <label className="stack-field">
                        <span>最终微习惯</span>
                        <input
                          value={state.pearlTinyAction || ''}
                          placeholder={state.pearlTinyMethod === 'starter-step' ? '例如：把注意力放到肩膀上' : '例如：放松一下肩膀'}
                          onChange={event => updatePearlTinyHabit({ pearlTinyAction: event.target.value })}
                        />
                      </label>

                      <article className={`recipe-card preview ${canCreatePearlRecipe(state.selectedAnnoyance, state.selectedPearlCandidate || '', state.pearlTinyMethod || '', state.pearlTinyAction || '') ? '' : 'muted'}`}>
                        <span>珍珠配方预览</span>
                        <strong>
                          {canCreatePearlRecipe(state.selectedAnnoyance, state.selectedPearlCandidate || '', state.pearlTinyMethod || '', state.pearlTinyAction || '')
                            ? buildPearlText(state.selectedAnnoyance.trim(), state.pearlTinyAction.trim())
                            : '选择烦恼、最佳有益习惯，并写下最终微习惯后生成预览。'}
                        </strong>
                      </article>

                      <button type="button" className="primary" onClick={savePearlRecipe} disabled={!canCreatePearlRecipe(state.selectedAnnoyance, state.selectedPearlCandidate || '', state.pearlTinyMethod || '', state.pearlTinyAction || '')}>
                        保存珍珠习惯
                      </button>
                      {state.pearlRecipe && (
                        <article className="recipe-card pearl">
                          <span>珍珠习惯</span>
                          <strong>{state.pearlRecipe.text}</strong>
                          <p>{state.pearlRecipe.tinyMethod === 'starter-step' ? '入门步骤化' : '规模缩小化'} · 来源：{state.pearlRecipe.sourceAction || state.pearlRecipe.action}</p>
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

      {(state.step === 'pearl' || state.step === 'result') && (
        <aside
          key={`pearl-companion-${state.pearlPolishPulse || 0}-${pearlStage}`}
          className={`pearl-companion stage-${pearlStage} ${pearlCompanionMode} ${state.pearlRecipe?.completed ? 'polished' : ''}`}
          aria-label="珍珠习惯进度"
        >
          <button type="button" className="pearl-companion-button" aria-label="查看珍珠习惯进度">
            <svg className="companion-clam" viewBox="0 0 220 178" aria-hidden="true">
              <defs>
                <linearGradient id="pearlCompanionShellGradient" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#2b1746" />
                  <stop offset="0.55" stopColor="#613b86" />
                  <stop offset="1" stopColor="#9c6bb2" />
                </linearGradient>
                <linearGradient id="pearlCompanionInnerGradient" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#fff5fa" />
                  <stop offset="0.6" stopColor="#f3b5d5" />
                  <stop offset="1" stopColor="#ce78a9" />
                </linearGradient>
                <linearGradient id="pearlCompanionNacreGradient" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#fffdf8" />
                  <stop offset="0.54" stopColor="#ffe6f1" />
                  <stop offset="1" stopColor="#d8c6ff" />
                </linearGradient>
                <linearGradient id="pearlCompanionMantleGradient" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#ffd7e6" />
                  <stop offset="0.62" stopColor="#ef9cc5" />
                  <stop offset="1" stopColor="#a45c9e" />
                </linearGradient>
              </defs>
              <g className="companion-lower-shell">
                <path className="companion-lower-outer" d="M31 104c16 46 48 68 84 68 38 0 70-24 83-69-21-16-51-25-84-25-34 0-64 9-83 26Z" />
                <path className="companion-lower-inner" d="M50 111c17-17 42-26 65-26 25 0 49 9 65 26-13 23-36 34-65 34-28 0-52-11-65-34Z" />
                <path className="companion-mantle" d="M61 118c15-11 34-17 54-17 21 0 40 6 54 17-12 14-30 22-54 22-23 0-42-8-54-22Z" />
                <path className="companion-lower-ridge" d="M77 136c12 12 24 19 38 24M153 136c-12 12-24 19-38 24M115 141v22" />
                <path className="companion-front-rim" d="M48 109c35 13 98 13 134 0" />
              </g>
              <g className="companion-top-shell">
                <path className="companion-top-outer" d="M31 96c16-47 48-70 84-70 38 0 70 24 83 70-21 14-51 22-84 22-34 0-64-8-83-22Z" />
                <path className="companion-top-inner" d="M44 101c34-13 105-13 140 0-15 11-38 17-70 17-31 0-55-6-70-17Z" />
                <path className="companion-shell-ridge" d="M62 88c16-29 33-46 53-57M91 101c4-29 11-51 24-70M139 101c-4-29-12-51-24-70M168 88c-16-29-34-46-53-57" />
                <path className="companion-shell-edge" d="M43 96c36 11 106 11 143 0" />
              </g>
            </svg>
            {pearlStage > 0 && <span className={`pearl-object stage-${pearlStage}`} />}
            {state.pearlRecipe?.completed && <span className="shine-ring" />}
          </button>
          <p>{pearlCompanionText}</p>
        </aside>
      )}

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

        .method-toggle {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .method-toggle button {
          display: grid;
          gap: 5px;
          min-height: 92px;
          text-align: left;
          color: #4f4778;
          background: #fff;
          border: 1px solid var(--ft-line);
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
        }

        .method-toggle button.selected {
          color: #fff;
          background: var(--ft-plum);
          border-color: var(--ft-plum);
          box-shadow: 0 10px 22px rgba(80, 64, 125, 0.18);
        }

        .method-toggle span {
          font-size: 0.82rem;
          line-height: 1.5;
          opacity: 0.82;
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

        .recipe-card.preview {
          border-style: dashed;
          padding: 14px;
        }

        .recipe-card.preview.muted {
          color: #81778e;
          background: #fffaf5;
        }

        .pearl-layout {
          display: block;
        }

        .pearl-companion {
          position: fixed;
          left: 22px;
          bottom: 22px;
          z-index: 40;
          width: 198px;
          display: grid;
          gap: 6px;
          justify-items: center;
          pointer-events: none;
        }

        .pearl-companion-button {
          position: relative;
          width: 198px;
          height: 160px;
          background: rgba(255, 255, 255, 0.76);
          border: 1px solid rgba(238, 228, 210, 0.9);
          border-radius: 8px;
          box-shadow: 0 18px 42px rgba(56, 42, 74, 0.2);
          cursor: pointer;
          pointer-events: auto;
        }

        .pearl-companion-button:focus-visible {
          outline: 3px solid rgba(242, 193, 77, 0.75);
          outline-offset: 3px;
        }

        .pearl-companion p {
          margin: 0;
          max-width: 176px;
          color: #4f4778;
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid rgba(238, 228, 210, 0.9);
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 0.75rem;
          font-weight: 800;
          line-height: 1.35;
          text-align: center;
          box-shadow: 0 10px 24px rgba(56, 42, 74, 0.12);
        }

        .companion-clam {
          position: absolute;
          inset: 10px 8px;
          width: calc(100% - 16px);
          height: calc(100% - 20px);
          overflow: visible;
          filter: drop-shadow(0 11px 15px rgba(43, 23, 70, 0.2));
        }

        .companion-top-outer,
        .companion-lower-outer {
          fill: url(#pearlCompanionShellGradient);
          stroke: #251a3b;
          stroke-width: 3;
          stroke-linejoin: round;
        }

        .companion-top-shell {
          transform-origin: 50% 70%;
          transition: transform 0.42s ease;
        }

        .pearl-companion.is-open .companion-top-shell,
        .pearl-companion.is-closed:hover .companion-top-shell,
        .pearl-companion.is-closed .pearl-companion-button:focus-visible .companion-top-shell,
        .pearl-companion.is-closed .pearl-companion-button:active .companion-top-shell {
          transform: translateY(-38px) translateX(-3px) rotate(-18deg) scaleY(0.74);
        }

        .pearl-companion.is-open:hover .companion-top-shell,
        .pearl-companion.is-open .pearl-companion-button:focus-visible .companion-top-shell,
        .pearl-companion.is-open .pearl-companion-button:active .companion-top-shell {
          transform: none;
        }

        .companion-shell-ridge,
        .companion-shell-edge,
        .companion-lower-ridge,
        .companion-front-rim {
          fill: none;
          stroke-linecap: round;
        }

        .companion-shell-ridge {
          stroke: rgba(223, 196, 239, 0.66);
          stroke-width: 4;
        }

        .companion-shell-edge {
          stroke: rgba(255, 244, 255, 0.72);
          stroke-width: 4;
        }

        .companion-lower-ridge {
          stroke: rgba(223, 196, 239, 0.48);
          stroke-width: 3;
        }

        .companion-lower-inner,
        .companion-top-inner {
          fill: url(#pearlCompanionNacreGradient);
          stroke: rgba(116, 70, 139, 0.52);
          stroke-width: 3;
        }

        .companion-mantle {
          fill: url(#pearlCompanionMantleGradient);
          stroke: rgba(174, 91, 142, 0.48);
          stroke-width: 2;
        }

        .companion-front-rim {
          stroke: rgba(255, 248, 250, 0.78);
          stroke-width: 4;
        }

        .companion-lower-inner,
        .companion-top-inner,
        .companion-mantle,
        .companion-front-rim {
          opacity: 0;
          transition: opacity 0.24s ease;
        }

        .pearl-companion.is-open .companion-lower-inner,
        .pearl-companion.is-open .companion-top-inner,
        .pearl-companion.is-open .companion-mantle,
        .pearl-companion.is-open .companion-front-rim,
        .pearl-companion.is-closed:hover .companion-lower-inner,
        .pearl-companion.is-closed:hover .companion-top-inner,
        .pearl-companion.is-closed:hover .companion-mantle,
        .pearl-companion.is-closed:hover .companion-front-rim,
        .pearl-companion.is-closed .pearl-companion-button:focus-visible .companion-lower-inner,
        .pearl-companion.is-closed .pearl-companion-button:focus-visible .companion-top-inner,
        .pearl-companion.is-closed .pearl-companion-button:focus-visible .companion-mantle,
        .pearl-companion.is-closed .pearl-companion-button:focus-visible .companion-front-rim,
        .pearl-companion.is-closed .pearl-companion-button:active .companion-lower-inner,
        .pearl-companion.is-closed .pearl-companion-button:active .companion-top-inner,
        .pearl-companion.is-closed .pearl-companion-button:active .companion-mantle,
        .pearl-companion.is-closed .pearl-companion-button:active .companion-front-rim {
          opacity: 1;
        }

        .pearl-companion.is-open:hover .companion-lower-inner,
        .pearl-companion.is-open:hover .companion-top-inner,
        .pearl-companion.is-open:hover .companion-mantle,
        .pearl-companion.is-open:hover .companion-front-rim,
        .pearl-companion.is-open .pearl-companion-button:focus-visible .companion-lower-inner,
        .pearl-companion.is-open .pearl-companion-button:focus-visible .companion-top-inner,
        .pearl-companion.is-open .pearl-companion-button:focus-visible .companion-mantle,
        .pearl-companion.is-open .pearl-companion-button:focus-visible .companion-front-rim,
        .pearl-companion.is-open .pearl-companion-button:active .companion-lower-inner,
        .pearl-companion.is-open .pearl-companion-button:active .companion-top-inner,
        .pearl-companion.is-open .pearl-companion-button:active .companion-mantle,
        .pearl-companion.is-open .pearl-companion-button:active .companion-front-rim {
          opacity: 0;
        }

        .pearl-object {
          position: absolute;
          z-index: 2;
          top: 113px;
          left: 50%;
          display: block;
          width: 32px;
          height: 32px;
          background: #817986;
          border: 1px solid rgba(62, 56, 84, 0.28);
          opacity: 0;
          transform: translate(-50%, -50%);
          transition: border-radius .25s ease, clip-path .25s ease, background .25s ease, box-shadow .25s ease, transform .25s ease, top .25s ease, opacity .24s ease;
        }

        .pearl-companion.is-open .pearl-object,
        .pearl-companion.is-closed:hover .pearl-object,
        .pearl-companion.is-closed .pearl-companion-button:focus-visible .pearl-object,
        .pearl-companion.is-closed .pearl-companion-button:active .pearl-object {
          opacity: 1;
        }

        .pearl-companion.is-open:hover .pearl-object,
        .pearl-companion.is-open .pearl-companion-button:focus-visible .pearl-object,
        .pearl-companion.is-open .pearl-companion-button:active .pearl-object {
          opacity: 0;
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
          clip-path: polygon(50% 0, 80% 12%, 100% 50%, 80% 88%, 50% 100%, 20% 88%, 0 50%, 20% 12%);
          background: #dcc7d9;
        }

        .pearl-object.stage-5,
        .pearl-object.stage-6 {
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

        .pearl-companion.stage-1.is-open .pearl-object {
          animation: stone-drop 0.85s ease-out both;
        }

        .pearl-companion.stage-1.is-open:hover .pearl-object,
        .pearl-companion.stage-1.is-open .pearl-companion-button:focus-visible .pearl-object,
        .pearl-companion.stage-1.is-open .pearl-companion-button:active .pearl-object {
          animation: none;
          opacity: 0;
        }

        .pearl-companion.stage-5.is-closed .companion-top-shell {
          animation: shell-close 1.15s ease both;
        }

        .pearl-companion.stage-5.is-closed .companion-lower-inner,
        .pearl-companion.stage-5.is-closed .companion-top-inner,
        .pearl-companion.stage-5.is-closed .companion-mantle,
        .pearl-companion.stage-5.is-closed .companion-front-rim,
        .pearl-companion.stage-5.is-closed .pearl-object {
          animation: inside-hide-after-close 1.15s ease both;
        }

        .pearl-companion.stage-5.is-closed:hover .companion-top-shell,
        .pearl-companion.stage-5.is-closed .pearl-companion-button:focus-visible .companion-top-shell,
        .pearl-companion.stage-5.is-closed .pearl-companion-button:active .companion-top-shell,
        .pearl-companion.stage-5.is-closed:hover .companion-lower-inner,
        .pearl-companion.stage-5.is-closed:hover .companion-top-inner,
        .pearl-companion.stage-5.is-closed:hover .companion-mantle,
        .pearl-companion.stage-5.is-closed:hover .companion-front-rim,
        .pearl-companion.stage-5.is-closed:hover .pearl-object,
        .pearl-companion.stage-5.is-closed .pearl-companion-button:focus-visible .companion-lower-inner,
        .pearl-companion.stage-5.is-closed .pearl-companion-button:focus-visible .companion-top-inner,
        .pearl-companion.stage-5.is-closed .pearl-companion-button:focus-visible .companion-mantle,
        .pearl-companion.stage-5.is-closed .pearl-companion-button:focus-visible .companion-front-rim,
        .pearl-companion.stage-5.is-closed .pearl-companion-button:focus-visible .pearl-object,
        .pearl-companion.stage-5.is-closed .pearl-companion-button:active .companion-lower-inner,
        .pearl-companion.stage-5.is-closed .pearl-companion-button:active .companion-top-inner,
        .pearl-companion.stage-5.is-closed .pearl-companion-button:active .companion-mantle,
        .pearl-companion.stage-5.is-closed .pearl-companion-button:active .companion-front-rim,
        .pearl-companion.stage-5.is-closed .pearl-companion-button:active .pearl-object {
          animation: none;
        }

        .pearl-companion.polished .pearl-object {
          animation: pearl-rise 1.15s ease-out both;
          box-shadow: 0 0 22px rgba(242, 193, 77, 0.95), 0 0 42px rgba(255, 255, 255, 0.9);
        }

        .shine-ring {
          position: absolute;
          z-index: 3;
          top: 42px;
          left: 50%;
          width: 76px;
          height: 76px;
          border-radius: 999px;
          border: 2px dashed rgba(242, 193, 77, 0.95);
          transform: translateX(-50%);
          animation: spin-shine 1.2s linear both;
          pointer-events: none;
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

        .practice-card .text-button {
          justify-self: end;
          min-height: 0;
          color: #8b3f4d;
          background: transparent;
          border: 0;
          padding: 3px 0;
        }

        @keyframes stone-drop {
          0% {
            top: 64px;
            opacity: 0;
            transform: translate(-50%, -80%) rotate(-28deg) scale(0.72);
          }
          62% {
            top: 116px;
            opacity: 1;
            transform: translate(-50%, -50%) rotate(10deg) scale(1.06);
          }
          100% {
            top: 113px;
            opacity: 1;
            transform: translate(-50%, -50%) rotate(-12deg) scale(1);
          }
        }

        @keyframes shell-close {
          0% {
            transform: translateY(-38px) translateX(-3px) rotate(-18deg) scaleY(0.74);
          }
          48% {
            transform: translateY(-38px) translateX(-3px) rotate(-18deg) scaleY(0.74);
          }
          100% {
            transform: none;
          }
        }

        @keyframes inside-hide-after-close {
          0% {
            opacity: 1;
          }
          62% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes pearl-rise {
          0% {
            top: 113px;
            transform: translate(-50%, -50%) scale(0.96);
          }
          58% {
            top: 62px;
            transform: translate(-50%, -50%) scale(1.12);
          }
          100% {
            top: 72px;
            transform: translate(-50%, -50%) scale(1.04);
          }
        }

        @keyframes spin-shine {
          0% {
            opacity: 0;
            transform: translateX(-50%) rotate(0deg) scale(0.72);
          }
          25% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) rotate(360deg) scale(1.12);
          }
        }

        @media (max-width: 900px) {
          .pearl-layout,
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

          .method-toggle {
            grid-template-columns: 1fr;
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

          .practice-card .text-button {
            justify-self: start;
          }

          .pearl-companion {
            left: 12px;
            bottom: 12px;
            width: 150px;
          }

          .pearl-companion-button {
            width: 150px;
            height: 122px;
          }

          .pearl-companion p {
            max-width: 142px;
            font-size: 0.68rem;
            padding: 5px 8px;
          }

          .pearl-object {
            top: 78px;
            width: 25px;
            height: 25px;
          }

          .pearl-object.stage-5,
          .pearl-object.stage-6 {
            width: 30px;
            height: 30px;
          }

          .shine-ring {
            top: 32px;
            width: 56px;
            height: 56px;
          }
        }
      `}</style>
    </>
  );
}
