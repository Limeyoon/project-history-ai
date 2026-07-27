import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <meta charSet="utf-8" />
        <meta name="description" content="프로젝트 히스토리 아카이브" />
        <link
          rel="icon"
          href="https://img.icons8.com/external-tanah-basah-glyph-tanah-basah/96/external-search-folder-tanah-basah-glyph-tanah-basah.png"
          type="image/png"
        />
        <link
          rel="apple-touch-icon"
          href="https://img.icons8.com/external-tanah-basah-glyph-tanah-basah/96/external-search-folder-tanah-basah-glyph-tanah-basah.png"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
