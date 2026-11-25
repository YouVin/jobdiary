import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

// 공고 이미지 자르기 계획 (#232)
const load = createSourceLoader();
const { planImageSlices, estimateImageTokens, IMAGE_SLICE } = load('@/utils/postingImageSlices');
const server = load('../../supabase/functions/_shared/companyInfo/handler.ts');

test('긴 세로 공고는 겹치게 잘라 모든 줄을 덮고, 조각의 긴 변은 1,568px보다 작다', () => {
  const slices = planImageSlices(860, 3000);
  assert.deepEqual(slices.map((slice) => [slice.sourceY, slice.sourceHeight, slice.width, slice.height]), [
    [0, 1400, 860, 1400], [1340, 1400, 860, 1400], [2680, 320, 860, 320],
  ]);
  for (let index = 1; index < slices.length; index += 1) {
    assert.equal(slices[index - 1].sourceY + slices[index - 1].sourceHeight - slices[index].sourceY, IMAGE_SLICE.overlap, '앞 조각과 겹침');
  }
  assert.equal(slices.at(-1).sourceY + slices.at(-1).sourceHeight, 3000, '마지막 줄까지');
  for (const slice of slices) assert.ok(Math.max(slice.width, slice.height) < 1568);
});

test('가로가 넓으면 1,000px로 줄이고, 작은 이미지는 한 조각 그대로다', () => {
  const wide = planImageSlices(2000, 1000);
  assert.deepEqual(wide.map((slice) => [slice.sourceY, slice.sourceHeight, slice.width, slice.height]), [[0, 1000, 1000, 500]]);
  assert.deepEqual(planImageSlices(600, 400).map((slice) => [slice.width, slice.height]), [[600, 400]]);
  assert.deepEqual(planImageSlices(0, 100), []);
});

test('예상 토큰은 28×28 조각 수이고, 조각 상한은 서버와 같다', () => {
  assert.equal(estimateImageTokens(planImageSlices(1000, 1400)), 36 * 50);
  assert.equal(IMAGE_SLICE.maxSlices, server.MAX_POSTING_IMAGES);
  assert.ok(planImageSlices(1000, 20000).length > IMAGE_SLICE.maxSlices, '아주 긴 이미지는 화면에서 막아야 한다');
});
