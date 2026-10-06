// /pro 흐름 물리 검증 — 390/1280 캡처 + 가로 넘침 + 퍼널 비콘 순서 + 외부 요청 수.
// 사용: node scripts/pro-shots.ts <base> <outDir> [--mock-post] [--email=<주소>]
//   --mock-post: /api/pro-request 를 브라우저에서 204로 가로챈다(로컬 미리보기용, 서버 저장 없음)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';

const exe = process.env.CHROME_PATH ?? `${homedir()}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const [base, out] = process.argv.slice(2);
const mock = process.argv.includes('--mock-post');
const email = process.argv.find((a) => a.startsWith('--email='))?.slice(8) ?? 'qa-local@example.com';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: exe });
const origin = new URL(base).origin;

for (const width of [390, 1280]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const intents: string[] = [];
  const foreign: string[] = [];
  let postStatus = 0;
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.origin !== origin) foreign.push(r.url());
    if (u.pathname.startsWith('/intent/pro/')) intents.push(u.pathname);
  });
  page.on('response', (r) => { if (r.url().endsWith('/api/pro-request')) postStatus = r.status(); });
  if (mock) await page.route('**/api/pro-request', (r) => r.fulfill({ status: 204 }));

  await page.goto(`${base}/pro/`, { waitUntil: 'networkidle' });
  const arm = await page.evaluate(() => (document.querySelector('[data-arm]:not([hidden])') as HTMLElement | null)?.dataset.arm ?? null);
  const visibleCards = await page.locator('[data-arm]:visible').count();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: `${out}/pro-${width}.png`, fullPage: true });
  console.log(`${width} /pro/ 가격안=${arm} 보이는카드=${visibleCards} 가로넘침=${overflow}px`);

  if (width === 390) {
    await page.click('#next');
    await page.screenshot({ path: `${out}/pro-step-email-${width}.png` });
    await page.fill('#email', email);
    await page.click('#next');
    await page.check('#pledge');
    await page.check('#consent');
    await page.screenshot({ path: `${out}/pro-step-agree-${width}.png` });
    await page.click('#next');
    await page.waitForSelector('#step-done:not([hidden])', { timeout: 10_000 });
    await page.waitForTimeout(300); // keepalive 비콘 발사 대기(고정 대기 아님 — 1회 300ms)
    await page.screenshot({ path: `${out}/pro-done-${width}.png` });
    console.log(`  저장 응답=${postStatus} · 비콘 순서=${intents.join(' → ')}`);
    // 같은 브라우저 재방문 → 같은 가격안(AC-26)
    await page.goto(`${base}/pro/`, { waitUntil: 'networkidle' });
    const arm2 = await page.evaluate(() => (document.querySelector('[data-arm]:not([hidden])') as HTMLElement | null)?.dataset.arm ?? null);
    console.log(`  재방문 가격안=${arm2} (${arm2 === arm ? '같음' : '다름'})`);
    for (const p of ['terms', 'refund', 'privacy']) {
      await page.goto(`${base}/${p}/`, { waitUntil: 'networkidle' });
      const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      await page.screenshot({ path: `${out}/${p}-${width}.png`, fullPage: true });
      console.log(`  /${p}/ 가로넘침=${o}px`);
    }
  }
  console.log(`  외부 출처 요청=${foreign.length}${foreign.length ? ' ' + foreign.join(' ') : ''}`);
  await ctx.close();
}
await browser.close();
