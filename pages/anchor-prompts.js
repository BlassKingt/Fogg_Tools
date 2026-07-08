import { useEffect, useMemo, useState } from 'react';
import SiteNav from '../components/SiteNav';
import {
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
