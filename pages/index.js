import Link from 'next/link';

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
];

export default function ToolboxHome() {
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="kicker">Fogg Tools</p>
          <h1>福格行为设计工具箱</h1>
        </div>
        <nav className="nav" aria-label="工具导航">
          <Link href="/golden-behavior">黄金行为</Link>
          <Link href="/ability-chain">能力链</Link>
        </nav>
      </header>

      <section className="intro">
        <div className="intro-copy">
          <p className="step-label">推荐路径</p>
          <h2>从一个愿望，走到一个更容易开始的行动。</h2>
          <p>
            先用黄金行为探索器找到“高影响 + 容易做”的行为，再把选中的行为带入能力链设计器，继续降低执行难度。
          </p>
        </div>
        <div className="flow" aria-label="推荐连续流程">
          <span>愿望</span>
          <span>候选行为</span>
          <span>黄金行为</span>
          <span>突破设计</span>
        </div>
      </section>

      <section className="tools" aria-label="工具入口">
        {tools.map(tool => (
          <Link key={tool.href} href={tool.href} className={`tool-card ${tool.accent}`}>
            <span className="eyebrow">{tool.eyebrow}</span>
            <h3>{tool.title}</h3>
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
        :global(body) {
          margin: 0;
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
          background: #f5f3fa;
          color: #2d2b3a;
        }

        .shell {
          width: min(1040px, calc(100% - 40px));
          min-height: 100vh;
          margin: 0 auto;
          padding: 28px 0 48px;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 44px;
        }

        .kicker {
          margin: 0 0 6px;
          color: #6c5ce7;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          color: #3b3263;
          font-size: 1.55rem;
          line-height: 1.2;
        }

        .nav {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .nav :global(a) {
          color: #5a4b9e;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 700;
          background: #fff;
          border: 1px solid #e8e2f5;
          border-radius: 999px;
          padding: 10px 16px;
          box-shadow: 0 4px 16px rgba(70, 55, 130, 0.06);
        }

        .intro {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
          gap: 28px;
          align-items: stretch;
          margin-bottom: 28px;
        }

        .intro-copy {
          padding: 28px 0;
        }

        .step-label {
          display: inline-flex;
          margin: 0 0 12px;
          color: #6c5ce7;
          background: #f0ecf8;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 0.78rem;
          font-weight: 800;
        }

        h2 {
          max-width: 680px;
          margin: 0 0 14px;
          color: #2d2b3a;
          font-size: 2.3rem;
          line-height: 1.12;
        }

        .intro-copy p:last-child {
          max-width: 640px;
          margin: 0;
          color: #5f5874;
          font-size: 1rem;
          line-height: 1.8;
        }

        .flow {
          display: grid;
          gap: 12px;
          align-content: center;
          background: #fff;
          border: 1px solid #ece4f7;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(70, 55, 130, 0.08);
        }

        .flow span {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          color: #4b3e6d;
          background: #faf8ff;
          border: 1px solid #e8e2f5;
          border-radius: 8px;
          font-weight: 800;
        }

        .tools {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .tool-card {
          display: flex;
          min-height: 250px;
          flex-direction: column;
          justify-content: space-between;
          color: inherit;
          text-decoration: none;
          background: #fff;
          border: 1px solid #ece4f7;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 8px 26px rgba(70, 55, 130, 0.07);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .tool-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 34px rgba(70, 55, 130, 0.12);
        }

        .tool-card.purple:hover {
          border-color: #a29bfe;
        }

        .tool-card.gold:hover {
          border-color: #ffcb4d;
        }

        .eyebrow {
          color: #6c5ce7;
          font-size: 0.8rem;
          font-weight: 800;
        }

        .tool-card.gold .eyebrow {
          color: #a66f00;
        }

        h3 {
          margin: 14px 0 10px;
          color: #352d52;
          font-size: 1.45rem;
        }

        .tool-card p {
          margin: 0;
          color: #5f5874;
          line-height: 1.75;
        }

        .cta {
          align-self: flex-start;
          margin-top: 28px;
          color: #fff;
          background: #6c5ce7;
          border-radius: 999px;
          padding: 11px 18px;
          font-weight: 800;
        }

        .tool-card.gold .cta {
          color: #4a3500;
          background: linear-gradient(135deg, #ffd54f, #ffb300);
        }

        .note {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-top: 18px;
          color: #5f5874;
          background: #fff;
          border: 1px solid #ece4f7;
          border-radius: 8px;
          padding: 16px 18px;
        }

        .note strong {
          color: #4b3e6d;
        }

        @media (max-width: 760px) {
          .shell {
            width: min(100% - 28px, 1040px);
            padding-top: 18px;
          }

          .topbar,
          .intro,
          .tools,
          .note {
            display: flex;
            flex-direction: column;
          }

          .topbar {
            align-items: flex-start;
            margin-bottom: 24px;
          }

          .nav {
            justify-content: flex-start;
          }

          .intro-copy {
            padding: 10px 0 0;
          }

          h2 {
            font-size: 1.75rem;
          }

          .tool-card {
            min-height: 220px;
          }
        }
      `}</style>
    </main>
  );
}
