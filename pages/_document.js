import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <meta charSet="utf-8" />
        <meta name="description" content="프로젝트 히스토리 아카이브" />
        <link rel="icon" href="/icons/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/favicon.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
