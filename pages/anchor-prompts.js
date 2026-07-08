import { useEffect, useMemo, useState } from 'react';
import SiteNav from '../components/SiteNav';
import {
  ANCHOR_PERIODS,
  ANCHOR_PROMPTS_STORAGE_KEY,
  ANCHOR_STEPS,
  createInitialAnchorState,
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
            {state.step !== 'timeline' && (
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
