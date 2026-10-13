import { describe, it, expect } from 'vitest';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, appendFileSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// AC-25·AC-30 — /pro는 AWS 빌드에만, 결제 요청 저장은 nginx 로그 파일(새 프로세스 0)
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const astroConfig = readFileSync('astro.config.mjs', 'utf8');
const nginx = readFileSync('deploy/aws/nginx.conf', 'utf8');
const sh = readFileSync('deploy/aws/deploy.sh', 'utf8');
const PRO_PATHS = ['/pro', '/terms', '/refund', '/privacy'];

describe('AC-25 Vercel엔 /pro 없음', () => {
  it('vercel.json이 4경로를 AWS 정식 주소로 돌린다(§13 AC-34 전체 301 규칙에 포함)', () => {
    const r = vercel.redirects ?? [];
    for (const p of PRO_PATHS) {
      const hit = r.find((x: any) => new RegExp(`^${x.source}$`).test(`${p}/`));
      expect(hit, p).toBeTruthy();
      expect(hit.destination).toMatch(/^https:\/\/gonggo\.oaksoo\.com\//);
    }
  });
  it('astro 설정: DEPLOY_TARGET=aws일 때만 4장을 주입한다', () => {
    expect(astroConfig).toMatch(/process\.env\.DEPLOY_TARGET === 'aws'/);
    expect(astroConfig).toContain('injectRoute');
    for (const p of PRO_PATHS) expect(astroConfig).toContain(`pattern: '${p}'`);
  });
});

describe('AC-30 nginx 결제 요청 저장', () => {
  const loc = nginx.match(/location = \/api\/pro-request \{[\s\S]*?\n    \}/)?.[0] ?? '';
  it('POST만·본문 1KB·속도 제한·JSON 로그 파일', () => {
    expect(loc).toMatch(/limit_except POST \{ deny all; \}/);
    expect(loc).toContain('client_max_body_size 1k');
    expect(loc).toMatch(/limit_req zone=proreq burst=3 nodelay/);
    expect(loc).toContain('access_log /var/log/gonggo/pro-requests.jsonl pro_request if=$pro_saved;');
    expect(nginx).toMatch(/map \$status \$pro_saved \{ 204 1; default 0; \}/);
    expect(loc).toMatch(/proxy_pass http:\/\/127\.0\.0\.1:8081/);
    expect(nginx).toMatch(/log_format pro_request escape=json '\{"t":"\$time_iso8601","body":"\$request_body"\}'/);
    expect(nginx).toMatch(/limit_req_zone \$http_x_forwarded_for zone=proreq:1m rate=5r\/m/);
    expect(nginx).toMatch(/listen 127\.0\.0\.1:8081;[\s\S]*return 204/);
  });
  it('계측 비콘 로그는 호스트에 남는 경로', () => {
    expect(nginx).toMatch(/location \^~ \/intent\/ \{ access_log \/var\/log\/gonggo\/intent\.log intent; return 204; \}/);
    expect(nginx).toMatch(/log_format intent '\$time_iso8601 \$http_x_forwarded_for /);
  });
  it('배포: logs 디렉터리 마운트·옛 컨테이너 비콘 로그 이관·AWS 빌드 아니면 거절', () => {
    expect(sh).toContain('-v $R/logs:/var/log/gonggo');
    expect(sh).toMatch(/docker exec gonggo-web cat \/var\/log\/nginx\/intent\.log >> \$R\/logs\/intent\.log/);
    expect(sh.indexOf('/var/log/nginx/intent.log')).toBeLessThan(sh.indexOf('docker rm -f gonggo-web'));
    expect(sh).toMatch(/test -f dist\/pro\/index\.html \|\|/);
    // 새 설정은 일회용 컨테이너로 먼저 검사하고, 통과해야 운영 컨테이너를 바꾼다
    expect(sh.indexOf('docker run --rm')).toBeGreaterThan(-1);
    expect(sh.indexOf('docker run --rm')).toBeLessThan(sh.indexOf('docker rm -f gonggo-web'));
  });
});

describe('AC-58 배포 전후 계측·결제 요청 로그 보존 (10/14 감사 #3)', () => {
  const guard = join(process.cwd(), 'deploy/aws/logguard.sh');
  const mk = () => {
    const d = mkdtempSync(join(tmpdir(), 'lg-'));
    mkdirSync(join(d, 'logs'));
    writeFileSync(join(d, 'logs/pro-requests.jsonl'), '{"a":1}\n{"a":2}\n');
    writeFileSync(join(d, 'logs/intent.log'), 'x\ny\nz\n');
    return d;
  };
  const run = (c: string, d: string) => spawnSync('bash', [guard, c, join(d, 'logs'), join(d, 'snap')], { encoding: 'utf8' });
  it('줄 수가 같거나 늘면 통과', () => {
    const d = mk();
    expect(run('snapshot', d).status).toBe(0);
    appendFileSync(join(d, 'logs/intent.log'), 'w\n');
    expect(run('verify', d).status).toBe(0);
  });
  it('0바이트로 비워지면 실패하고 사본이 남는다', () => {
    const d = mk();
    run('snapshot', d);
    writeFileSync(join(d, 'logs/pro-requests.jsonl'), '');
    const r = run('verify', d);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('pro-requests.jsonl 2 -> 0');
    expect(readdirSync(join(d, 'logs.bak')).some((f) => f.startsWith('pro-requests.jsonl.'))).toBe(true);
  });
  it('파일이 사라져도 실패', () => {
    const d = mk();
    run('snapshot', d);
    rmSync(join(d, 'logs/intent.log'));
    expect(run('verify', d).status).toBe(1);
  });
  it('deploy.sh 가 컨테이너 교체 전 snapshot, 교체·리로드 뒤 verify 를 부른다', () => {
    expect(sh).toContain('logguard.sh');
    expect(sh.indexOf('logguard.sh snapshot')).toBeLessThan(sh.indexOf('docker rm -f gonggo-web'));
    expect(sh.indexOf('logguard.sh verify')).toBeGreaterThan(sh.indexOf('docker run -d --name gonggo-web'));
  });
});
