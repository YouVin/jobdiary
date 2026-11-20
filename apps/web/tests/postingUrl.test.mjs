import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

const load = createSourceLoader();
const { getPostingUrl } = load('@/utils/postingUrl');

test('공고 주소는 http(s)일 때만 링크로 쓴다', () => {
  assert.equal(getPostingUrl('https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=1'), 'https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=1');
  assert.equal(getPostingUrl('  HTTP://example.com  '), 'HTTP://example.com');
  assert.equal(getPostingUrl('javascript:alert(1)'), null);
  assert.equal(getPostingUrl('www.example.com'), null);
  assert.equal(getPostingUrl(''), null);
  assert.equal(getPostingUrl(undefined), null);
});
