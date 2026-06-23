export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
          background: linear-gradient(180deg, #f0edf6 0%, #faf9f6 40%, #fefefe 100%);
          min-height: 100vh;
        }
      `}</style>
    </>
  );
}