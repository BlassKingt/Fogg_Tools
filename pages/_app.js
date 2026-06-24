export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <style jsx global>{`
        :root {
          --ft-bg: #f4f1f6;
          --ft-bg-soft: #fbfaf7;
          --ft-surface: #ffffff;
          --ft-ink: #2d2940;
          --ft-muted: #746d82;
          --ft-line: #e7deee;
          --ft-plum: #4f4778;
          --ft-plum-soft: #eee8f6;
          --ft-amber: #d99b1e;
          --ft-success: #16856f;
          --ft-danger: #c85c48;
          --ft-shadow: 0 16px 42px rgba(65, 56, 105, 0.1);
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: 'Avenir Next', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
          background:
            radial-gradient(circle at 14% 4%, rgba(217, 155, 30, 0.045), transparent 28rem),
            radial-gradient(circle at 92% 8%, rgba(79, 71, 120, 0.08), transparent 24rem),
            linear-gradient(180deg, var(--ft-bg) 0%, var(--ft-bg-soft) 48%, #ffffff 100%);
          color: var(--ft-ink);
          min-height: 100vh;
        }

        button,
        input,
        textarea {
          font: inherit;
        }

        a:focus-visible,
        button:focus-visible,
        input:focus-visible,
        textarea:focus-visible {
          outline: 3px solid rgba(217, 155, 30, 0.42);
          outline-offset: 3px;
        }
      `}</style>
    </>
  );
}
