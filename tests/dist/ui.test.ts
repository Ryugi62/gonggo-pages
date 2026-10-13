import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';

// SPEC §8 UI 수용기준 10항 ↔ 테스트 1:1 (10/14 규칙 감사 #1). 번호 = SPEC §8 번호.
// 수동 판정(2 스텝 구성의 시각 확인·5 캡처·6 위치·7 근거 접힘의 시각·8 문안)은 SPEC에 「수동 — UI검수 기록」로 표시하고 볼트 UI검수 파일에 판정을 남긴다.
const aws = process.env.DEPLOY_TARGET === 'aws';
const read = (f: string) => readFileSync(f, 'utf8');
const slug = readdirSync('dist/g').sort()[0];
const pages: Record<string, string> = { home: 'dist/index.html', detail: `dist/g/${slug}/index.html`, check: 'dist/check/index.html' };
if (aws) pages.pro = 'dist/pro/index.html';
const css = (s: string) => (s.match(/<style[^>]*>[\s\S]*?<\/style>/g) ?? []).join('\n');

describe('SPEC §8 UI 수용기준 — 자동 검사 가능 항목', () => {
  it.each(Object.entries(pages))('1 모바일 퍼스트·10 성능: %s — viewport(확대 차단 없음)·외부 의존 0', (_n, f) => {
    const s = read(f);
    expect(s).toMatch(/<meta name="viewport" content="width=device-width, initial-scale=1"/);
    expect(s).not.toMatch(/user-scalable=no|maximum-scale=1\b/);
    expect(s).not.toMatch(/<script[^>]+src="https?:\/\//);
    expect(s).not.toMatch(/<link[^>]+rel="stylesheet"[^>]+href="https?:/);
    expect(s).not.toMatch(/@import|fonts\.googleapis|cdn\./);
  });
  it('1 본문 폭 ≤720px 중앙', () => {
    expect(css(read(pages.detail))).toMatch(/\.wrap\{[^}]*max-width:720px;margin:0 auto/);
  });
  it.each(Object.entries(pages))('3 타이포: %s — 본문 16px · 12px 미만 글자 0 · 굵기 300 이하 0', (_n, f) => {
    const c = css(read(f));
    expect(c).toMatch(/body\{[^}]*font:16px\/1\.[56]/);
    expect(c).not.toMatch(/font-size:\s*(?:[0-9]|1[01])(?:\.\d+)?px/);
    expect(c).not.toMatch(/font-weight:\s*[123]00\b/);
  });
  it('4·5 터치 목표: 버튼 min-height ≥52px(≥44), 하단 고정 CTA 높이 ≥52px·전폭 바', () => {
    const c = css(read(pages.detail));
    expect(c).toMatch(/\.btn\{[^}]*min-height:52px/);
    expect(c).toMatch(/\.cta\{[^}]*height:56px/);
    expect(c).toMatch(/\.cta-bar\{[^}]*position:fixed[^}]*bottom:0[^}]*left:0[^}]*right:0/);
  });
  it('5 하단 고정 CTA: 상세 = 「원문 공고 보기」 1개, btn primary 0 (캘린더는 보조)', () => {
    const s = read(pages.detail);
    expect((s.match(/class="cta"/g) ?? []).length).toBe(1);
    expect(s).toContain('원문 공고 보기');
    expect(s).not.toMatch(/class="btn primary/);
  });
  it('6 숫자 먼저: 상세 첫 카드 = D-n(.big ≥28px)', () => {
    const s = read(pages.detail);
    const card = s.indexOf('aria-label="마감까지 남은 날"');
    expect(card).toBeGreaterThan(0);
    expect(s.slice(card, card + 300)).toMatch(/class="big"/);
    expect(css(s)).toMatch(/\.big\{[^}]*font-size:32px/);
  });
  it('6 숫자 먼저(/pro): 가격 카드가 질문 목록보다 앞 — 첫 화면 안', () => {
    if (!aws) return;
    const s = read(pages.pro);
    expect(s.indexOf('data-arm="H1"')).toBeLessThan(s.indexOf('class="asks"'));
    expect(css(s)).toMatch(/#pro(?:\[[^\]]+\])?\{padding-bottom:112px/);
  });
  it('7 근거는 접힘: 모든 <details>는 닫힘(open 속성 0)', () => {
    for (const f of Object.values(pages)) {
      const s = read(f);
      expect(s, f).not.toMatch(/<details[^>]*\sopen/);
    }
    expect(read(pages.detail)).toContain('<details');
  });
  it('9 색: 다크 대응 + 포커스 outline 제거 없음', () => {
    const c = css(read(pages.detail));
    expect(c).toContain('prefers-color-scheme:dark');
    expect(c).not.toMatch(/outline:\s*(none|0)\b/);
  });
  it('1·3·4·5·9·10 ui_audit.py: 4 대표 페이지 fail 0', () => {
    const audit = `${homedir()}/jarvis/_system/ui_audit.py`;
    if (!existsSync(audit)) return; // 볼트 밖 환경(CI)에서는 위 정적 검사만
    for (const f of Object.values(pages)) {
      const r = spawnSync('python3', [audit, f, '--json'], { encoding: 'utf8' });
      const j = JSON.parse(r.stdout);
      expect(j.summary.fail, `${f} ${r.stdout.slice(0, 400)}`).toBe(0);
    }
  }, 60_000);
});
