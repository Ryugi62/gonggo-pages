// 캡처 390/1280 — 로컬 미리보기(127.0.0.1)만 대상. 사용: node scripts/shots.ts <base> <path...>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';

const exe = process.env.CHROME_PATH ?? `${homedir()}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const [base, ...paths] = process.argv.slice(2);
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ executablePath: exe });
for (const width of [390, 1280]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: 'networkidle' });
    const name = p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home';
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: `shots/${name}-${width}.png`, fullPage: true });
    console.log(`${width} ${p} 가로넘침=${overflow}px`);
  }
  await page.close();
}
await browser.close();
