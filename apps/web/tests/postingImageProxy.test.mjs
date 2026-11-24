import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

// 공고 본문 이미지 대신 받기 (#238). 서버가 아무 주소나 받지 않는지(SSRF) 확인한다.
const load = createSourceLoader();
const proxy = load('../../supabase/functions/_shared/postingImage/proxy.ts');
const shared = load('@jobdiary/shared');
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

function deps(overrides = {}) {
  const fetched = [];
  return {
    fetched,
    deps: {
      getUserId: async () => 'user-1',
      fetchImage: async (url) => { fetched.push(url); return { status: 200, contentType: 'image/png', bytes: PNG }; },
      logError: () => {},
      ...overrides,
    },
  };
}

test('허용 목록은 공유 계약(익스텐션·웹앱)과 같다', () => {
  const samples = ['https://file2.jobkorea.co.kr/a.png', 'https://file.jobkorea.co.kr/a', 'https://static.saraminimage.co.kr/b.webp', 'https://saraminimage.co.kr/c',
    'http://file2.jobkorea.co.kr/a.png', 'https://www.jobkorea.co.kr/a.png', 'https://file2.jobkorea.co.kr.evil.com/a', 'https://evilsaraminimage.co.kr/a',
    'https://u:p@file2.jobkorea.co.kr/a', 'https://file2.jobkorea.co.kr:444/a', 'https://127.0.0.1/a', 'https://localhost/a', 'file:///etc/passwd', '', null];
  for (const sample of samples) assert.equal(proxy.isPostingImageUrl(sample), shared.isPostingImageUrl(sample), String(sample));
});

test('로그인하지 않았거나 허용 목록 밖 주소면 받지 않는다', async () => {
  const anonymous = deps({ getUserId: async () => null });
  assert.equal((await proxy.handlePostingImage(anonymous.deps, { url: 'https://file2.jobkorea.co.kr/a.png' })).status, 401);
  const { deps: d, fetched } = deps();
  for (const url of ['https://169.254.169.254/latest/meta-data', 'http://file2.jobkorea.co.kr/a.png', 'https://evil.example.com/a.png', undefined]) {
    const response = await proxy.handlePostingImage(d, { url });
    assert.deepEqual([response.status, response.json.code], [400, 'bad_url'], String(url));
  }
  assert.deepEqual(fetched, [], '허용 목록 밖 주소로는 요청하지 않는다');
});

test('이미지면 그대로 돌려주고, 이미지가 아니거나 너무 크거나 실패하면 오류', async () => {
  const ok = await proxy.handlePostingImage(deps().deps, { url: 'https://file2.jobkorea.co.kr/a.png' });
  assert.deepEqual([ok.status, ok.contentType, ok.bytes], [200, 'image/png', PNG]);
  const cases = [
    [{ status: 200, contentType: 'text/html', bytes: PNG }, 415, 'not_image'],
    [{ status: 200, contentType: 'image/svg+xml', bytes: PNG }, 415, 'not_image'],
    [{ status: 200, contentType: 'image/png', bytes: null }, 413, 'too_large'],
    [{ status: 302, contentType: '', bytes: null }, 502, 'fetch_failed'],
  ];
  for (const [fetchedImage, status, code] of cases) {
    const response = await proxy.handlePostingImage(deps({ fetchImage: async () => fetchedImage }).deps, { url: 'https://file2.jobkorea.co.kr/a.png' });
    assert.deepEqual([response.status, response.json.code], [status, code], JSON.stringify(fetchedImage));
  }
  const thrown = await proxy.handlePostingImage(deps({ fetchImage: async () => { throw new Error('timeout'); } }).deps, { url: 'https://file2.jobkorea.co.kr/a.png' });
  assert.equal(thrown.status, 502);
});
