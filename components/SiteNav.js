import Link from 'next/link';
import { useRouter } from 'next/router';

const links = [
  { href: '/', label: '工具箱' },
  { href: '/golden-behavior', label: '黄金行为' },
  { href: '/ability-chain', label: '能力链' },
];

export default function SiteNav() {
  const router = useRouter();

  return (
    <nav className="site-nav" aria-label="主导航">
      <Link href="/" className="brand-link">
        <span className="brand-mark" aria-hidden="true">
          <img src="/favicon.svg" alt="" />
        </span>
        <span>
          <strong>Fogg Tools</strong>
          <small>行为设计工具箱</small>
        </span>
      </Link>
      <div className="nav-links">
        {links.map(link => {
          const active = router.pathname === link.href;
          return (
            <Link key={link.href} href={link.href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
              {link.label}
            </Link>
          );
        })}
      </div>

      <style jsx>{`
        .site-nav {
          width: min(1120px, calc(100% - 40px));
          margin: 0 auto 28px;
          padding: 16px 0 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        :global(a.brand-link) {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: #2d2940;
          text-decoration: none;
        }

        .brand-mark {
          display: inline-flex;
          width: 38px;
          height: 38px;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #4f4778;
          border-radius: 12px;
          box-shadow: 0 10px 24px rgba(65, 56, 105, 0.18);
        }

        .brand-mark img {
          display: block;
          width: 100%;
          height: 100%;
        }

        :global(a.brand-link) strong,
        :global(a.brand-link) small {
          display: block;
        }

        :global(a.brand-link) strong {
          font-size: 0.96rem;
          line-height: 1.2;
        }

        :global(a.brand-link) small {
          color: #7d748f;
          font-size: 0.74rem;
          margin-top: 2px;
        }

        .nav-links {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px;
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid rgba(223, 216, 235, 0.9);
          border-radius: 999px;
          box-shadow: 0 10px 30px rgba(65, 56, 105, 0.08);
          backdrop-filter: blur(14px);
        }

        .nav-links :global(a) {
          color: #5c536f;
          text-decoration: none;
          border-radius: 999px;
          padding: 9px 14px;
          font-size: 0.86rem;
          font-weight: 700;
          transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
        }

        .nav-links :global(a:hover) {
          color: #322b4f;
          background: rgba(240, 236, 248, 0.86);
        }

        .nav-links :global(a:active) {
          transform: translateY(1px);
        }

        .nav-links :global(a.active) {
          color: #ffffff;
          background: #4f4778;
          box-shadow: 0 8px 18px rgba(65, 56, 105, 0.18);
        }

        @media (max-width: 640px) {
          .site-nav {
            width: min(100% - 28px, 1120px);
            align-items: flex-start;
            flex-direction: column;
            margin-bottom: 20px;
          }

          .nav-links {
            width: 100%;
            justify-content: space-between;
          }

          .nav-links :global(a) {
            flex: 1;
            text-align: center;
            padding: 9px 8px;
          }
        }
      `}</style>
    </nav>
  );
}
