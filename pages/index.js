import Link from 'next/link';
import SiteNav from '../components/SiteNav';

const tools = [
  {
    title: '黄金行为探索器',
    eyebrow: '从愿望出发',
    description: '适合“我有一个想实现的愿望，但还不知道先做什么”。先收集候选行为，再用影响度和容易度找出黄金行为。',
    href: '/golden-behavior',
    cta: '开始探索',
    accent: 'purple',
  },
  {
    title: '能力链设计器',
    eyebrow: '从困难习惯出发',
    description: '适合“我知道要做什么，但总是做不到”。分析薄弱环节，再设计让行为更容易执行的突破方案。',
    href: '/ability-chain',
    cta: '分析习惯',
    accent: 'gold',
  },
  {
    title: '锚点提示设计器',
    eyebrow: '从日程锚点出发',
    description: '适合“我已经知道想做什么，但需要一个自然发生的提示”。绘制一天的习惯时间轴，把微习惯钉到可靠锚点之后。',
    href: '/anchor-prompts',
    cta: '设计提示',
    accent: 'purple',
  },
];

const flowSteps = [
  {
    title: '愿望',
    description: '先说清楚你想实现什么。',
  },
  {
    title: '候选行为',
    description: '列出可能帮助愿望发生的具体行动。',
  },
  {
    title: '黄金行为',
    description: '筛出影响大、也容易开始的行为。',
  },
  {
    title: '突破设计',
    description: '继续降低执行难度，让它真的做得起来。',
  },
  {
    title: '提示配方',
    description: '把微行为接到可靠锚点之后，知道何时开始。',
  },
];

export default function ToolboxHome() {
  return (
    <>
      <SiteNav />
      <main className="shell">
        <section className="intro">
          <div className="intro-copy">
            <p className="step-label">推荐路径</p>
            <h1>从一个愿望，走到一个更容易开始的行动。</h1>
            <p>
              先用黄金行为探索器找到“高影响 + 容易做”的行为，再用能力链设计器降低执行难度，最后用锚点提示设计器把它接到一天里的可靠提示之后。
            </p>
          </div>
          <ol className="flow" aria-label="推荐连续流程">
            {flowSteps.map((step, index) => (
              <li key={step.title}>
                <span className="flow-index">{index + 1}</span>
                <span>
                  <strong>{step.title}</strong>
                  <small>{step.description}</small>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="tools" aria-label="工具入口">
          {tools.map(tool => (
            <Link key={tool.href} href={tool.href} className={`tool-card ${tool.accent}`}>
              <span className="eyebrow">{tool.eyebrow}</span>
              <h2>{tool.title}</h2>
              <p>{tool.description}</p>
              <span className="cta">{tool.cta}</span>
            </Link>
          ))}
        </section>

        <section className="note" aria-label="使用说明">
          <strong>也可以直接选择任一工具。</strong>
          <span>如果你已经知道哪个习惯很难坚持，可以直接进入能力链设计器。</span>
        </section>

        <style jsx>{`
          .shell {
            width: min(1120px, calc(100% - 40px));
            min-height: calc(100vh - 96px);
            margin: 0 auto;
            padding: 8px 0 56px;
          }

          .intro {
            display: grid;
            grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
            gap: 34px;
            align-items: stretch;
            margin-bottom: 24px;
          }

          .intro-copy {
            padding: 42px 0 34px;
          }

          .step-label {
            display: inline-flex;
            margin: 0 0 12px;
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
            margin: 0 0 16px;
            color: var(--ft-ink);
            font-size: clamp(2.45rem, 7vw, 5rem);
            line-height: 0.98;
            text-wrap: balance;
          }

          .intro-copy p:last-child {
            max-width: 640px;
            margin: 0;
            color: var(--ft-muted);
            font-size: 1rem;
            line-height: 1.8;
          }

          .flow {
            display: grid;
            gap: 10px;
            align-content: center;
            margin: 0;
            list-style: none;
            background: rgba(255, 255, 255, 0.78);
            border: 1px solid var(--ft-line);
            border-radius: 8px;
            padding: 22px;
            box-shadow: var(--ft-shadow);
            backdrop-filter: blur(14px);
          }

          .flow li {
            display: grid;
            grid-template-columns: 34px minmax(0, 1fr);
            gap: 12px;
            align-items: center;
            min-height: 62px;
            color: #3e3854;
            background: #fbf8f3;
            border: 1px solid #eee4d2;
            border-radius: 8px;
            padding: 12px 14px;
          }

          .flow-index {
            display: inline-flex;
            width: 30px;
            height: 30px;
            align-items: center;
            justify-content: center;
            color: #fff;
            background: var(--ft-plum);
            border-radius: 999px;
            font-size: 0.78rem;
            font-weight: 800;
          }

          .flow strong,
          .flow small {
            display: block;
          }

          .flow strong {
            font-size: 0.95rem;
          }

          .flow small {
            margin-top: 3px;
            color: var(--ft-muted);
            font-size: 0.78rem;
            line-height: 1.45;
          }

          .tools {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 18px;
          }

          :global(a.tool-card) {
            display: flex;
            min-height: 250px;
            flex-direction: column;
            justify-content: space-between;
            color: inherit;
            text-decoration: none;
            background: rgba(255, 255, 255, 0.86);
            border: 1px solid var(--ft-line);
            border-radius: 8px;
            padding: 24px;
            box-shadow: 0 12px 32px rgba(65, 56, 105, 0.08);
            transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          }

          :global(a.tool-card:hover) {
            transform: translateY(-3px);
            box-shadow: 0 18px 42px rgba(65, 56, 105, 0.14);
          }

          :global(a.tool-card.purple:hover) {
            border-color: #8c82b5;
          }

          :global(a.tool-card.gold:hover) {
            border-color: var(--ft-amber);
          }

          .eyebrow {
            color: var(--ft-plum);
            font-size: 0.8rem;
            font-weight: 800;
          }

          :global(a.tool-card.gold) .eyebrow {
            color: #8c620d;
          }

          h2 {
            margin: 14px 0 10px;
            color: var(--ft-ink);
            font-size: 1.45rem;
          }

          :global(a.tool-card) p {
            margin: 0;
            color: var(--ft-muted);
            line-height: 1.75;
          }

          .cta {
            align-self: flex-start;
            margin-top: 28px;
            color: #fff;
            background: var(--ft-plum);
            border-radius: 999px;
            padding: 11px 18px;
            font-weight: 800;
          }

          :global(a.tool-card.gold) .cta {
            color: #4a3500;
            background: #f2c14d;
          }

          .note {
            display: flex;
            gap: 10px;
            align-items: center;
            margin-top: 18px;
            color: var(--ft-muted);
            background: rgba(255, 255, 255, 0.72);
            border: 1px solid var(--ft-line);
            border-radius: 8px;
            padding: 16px 18px;
          }

          .note strong {
            color: #3e3854;
          }

          @media (max-width: 900px) {
            .tools {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 760px) {
            .shell {
              width: min(100% - 28px, 1120px);
              padding-top: 0;
            }

            .intro,
            .tools,
            .note {
              display: flex;
              flex-direction: column;
            }

            .intro-copy {
              padding: 12px 0 0;
            }

            :global(a.tool-card) {
              min-height: 220px;
            }
          }
        `}</style>
      </main>
    </>
  );
}
