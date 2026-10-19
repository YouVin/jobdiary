import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

function withEnvironment(environment, run) {
  const previous = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = environment;
  try { run(createSourceLoader()); }
  finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }
}

test('운영 공개 URL만 canonical/sitemap에 안내하고 개인 경로는 제외한다', () => {
  withEnvironment('production', load => {
    const { SITE_URL, publicPageMetadata, PRIVATE_ROBOTS } = load('@/lib/siteMetadata');
    const metadata = publicPageMetadata('로그인', '설명', '/login');
    assert.equal(metadata.alternates.canonical, `${SITE_URL}/login`);
    assert.equal(metadata.openGraph.url, `${SITE_URL}/login`);
    assert.equal(metadata.robots.index, true);
    assert.equal(PRIVATE_ROBOTS.index, false);
    const urls = load('@/app/sitemap').default().map(item => item.url);
    assert.deepEqual(urls, ['/login', '/terms', '/privacy'].map(path => `${SITE_URL}${path}`));
    assert.equal(load('@/app/robots').default().rules.allow, '/');
  });
});

test('미리보기는 메타데이터 noindex·robots 차단·빈 sitemap을 사용한다', () => {
  withEnvironment('preview', load => {
    const { publicPageMetadata } = load('@/lib/siteMetadata');
    assert.equal(publicPageMetadata('로그인', '설명', '/login').robots.index, false);
    assert.equal(load('@/app/robots').default().rules.disallow, '/');
    assert.deepEqual(load('@/app/sitemap').default(), []);
  });
});
