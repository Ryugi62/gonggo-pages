import { defineConfig } from 'astro/config';

// SPEC §12 AC-25 — Pro 가격 페이지 4장은 상업 이용이 허용된 AWS 빌드(DEPLOY_TARGET=aws)에만 만든다.
// Vercel(Hobby)은 「상품 판매 광고」 금지라 기본 빌드엔 넣지 않는다(vercel.json도 4경로를 AWS로 돌린다).
const proPages = {
  name: 'pro-pages',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      if (process.env.DEPLOY_TARGET === 'aws') {
        injectRoute({ pattern: '/pro', entrypoint: './src/pro/pro.astro' });
        injectRoute({ pattern: '/terms', entrypoint: './src/pro/terms.astro' });
        injectRoute({ pattern: '/refund', entrypoint: './src/pro/refund.astro' });
        injectRoute({ pattern: '/privacy', entrypoint: './src/pro/privacy.astro' });
      }
    },
  },
};

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://gonggo-pages.vercel.app',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  compressHTML: true,
  devToolbar: { enabled: false },
  server: { host: '127.0.0.1' },
  integrations: [proPages],
});
