import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// AWS 배포 설정(기존 EC2 · 공용 edge-caddy 뒤 nginx 1개) — 다른 서비스를 건드리지 않는 계약
const caddy = readFileSync('deploy/aws/gonggo.caddy', 'utf8');
const nginx = readFileSync('deploy/aws/nginx.conf', 'utf8');
const sh = readFileSync('deploy/aws/deploy.sh', 'utf8');

describe('AWS 배포 설정', () => {
  it('엣지 스니펫은 공고콕 호스트 블록만(정식 + sslip, §13 AC-35), 전역 설정 없음', () => {
    const hosts = caddy.split('\n').filter((l) => /^\S.*\{\s*$/.test(l));
    expect(hosts).toEqual(['gonggo.oaksoo.com {', 'gonggo.43-202-151-104.sslip.io {']);
    expect(caddy).not.toMatch(/^\{/m);
    expect(caddy).toContain('reverse_proxy gonggo-web:80');
  });
  it('nginx: 디렉터리 슬래시 301·계측 비콘 204·404 페이지', () => {
    expect(nginx).toContain('absolute_redirect off');
    expect(nginx).toMatch(/location \^~ \/intent\/ \{[^}]*return 204/);
    expect(nginx).toContain('error_page 404 /404.html');
  });
  it('AC-24 nginx: .ics는 text/calendar; charset=utf-8', () => {
    expect(nginx).toMatch(/location ~\* \\\.ics\$ \{ types \{ \} default_type "text\/calendar; charset=utf-8";/);
  });
  it('배포 스크립트: 자기 스니펫만 복사, validate 실패 시 원복, 설정은 디렉터리 마운트', () => {
    expect(sh).toContain('/home/ubuntu/edge/sites/gonggo.caddy');
    expect(sh).not.toMatch(/edge\/Caddyfile\s*$/m);
    expect(sh).toMatch(/caddy validate[\s\S]*원복/);
    expect(sh).toContain('$R/conf/nginx:/etc/nginx/conf.d:ro');
    expect(sh).toContain('--memory 48m');
  });
});
