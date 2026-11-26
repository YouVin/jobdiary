import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

// 첫 사용 안내(#272)의 "PC에서 이어서" 문구는 화면 폭이 아니라 기기로 고른다.
const { isMobileUserAgent } = createSourceLoader()('@/utils/device');

test('휴대폰·태블릿은 모바일, PC 크롬·엣지는 아님', () => {
  assert.equal(isMobileUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'), true);
  assert.equal(isMobileUserAgent('Mozilla/5.0 (Linux; Android 15; SM-S928N) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36'), true);
  assert.equal(isMobileUserAgent('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15'), true);
  assert.equal(isMobileUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36 Edg/131.0'), false);
  assert.equal(isMobileUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36'), false);
});
