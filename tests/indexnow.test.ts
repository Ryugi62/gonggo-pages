import { describe, it, expect } from 'vitest';
import { indexNowPayloads, sitemapUrls } from '../src/application/indexNow.ts';

const O = 'https://gonggo.oaksoo.com';
describe('AC-48 IndexNow 알림', () => {
  it('정식 호스트만·중복 0·키 위치', () => {
    const p = indexNowPayloads(O, 'abc123', [`${O}/`, `${O}/g/a/`, `${O}/g/a/`, 'https://gonggo-pages.vercel.app/g/a/', 'https://gonggo.43-202-151-104.sslip.io/', 'https://example.org/x']);
    expect(p).toEqual([{ host: 'gonggo.oaksoo.com', key: 'abc123', keyLocation: `${O}/abc123.txt`, urlList: [`${O}/`, `${O}/g/a/`] }]);
  });
  it('10,000개씩 나눈다', () => {
    const urls = Array.from({ length: 10001 }, (_, i) => `${O}/g/${i}/`);
    const p = indexNowPayloads(O, 'k', urls);
    expect(p.map((x) => x.urlList.length)).toEqual([10000, 1]);
  });
  it('sitemap.xml에서 loc를 읽는다(&amp; 복원)', () => {
    expect(sitemapUrls('<urlset><url><loc>https://a/x?b=1&amp;c=2</loc></url><url><loc>https://a/y/</loc></url></urlset>')).toEqual(['https://a/x?b=1&c=2', 'https://a/y/']);
  });
});
