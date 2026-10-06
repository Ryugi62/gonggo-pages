import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// AC-25·AC-30 — /pro는 AWS 빌드에만, 결제 요청 저장은 nginx 로그 파일(새 프로세스 0)
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const astroConfig = readFileSync('astro.config.mjs', 'utf8');
const nginx = readFileSync('deploy/aws/nginx.conf', 'utf8');
const sh = readFileSync('deploy/aws/deploy.sh', 'utf8');
const PRO_PATHS = ['/pro', '/terms', '/refund', '/privacy'];

describe('AC-25 Vercel엔 /pro 없음', () => {
  it('vercel.json이 4경로를 AWS 주소로 돌린다', () => {
    const r = vercel.redirects ?? [];
    for (const p of PRO_PATHS) {
      const hit = r.find((x: any) => x.source === `${p}/:path*` || x.source === `${p}/` || x.source === p);
      expect(hit, p).toBeTruthy();
      expect(hit.destination).toMatch(/^https:\/\/gonggo\.43-202-151-104\.sslip\.io\//);
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
