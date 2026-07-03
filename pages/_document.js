import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <meta charSet="utf-8" />
        <meta name="description" content="프로젝트 히스토리 아카이브" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
