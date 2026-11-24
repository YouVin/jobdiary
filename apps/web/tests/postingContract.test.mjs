import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

// 공고 페이지 읽기 공유 계약 (#238). 웹앱이 익스텐션 응답을 믿기 전에 검사한다.
const { parsePostingContent, isPostingImageUrl, MAX_POSTING_IMAGE_URLS } = createSourceLoader()('@jobdiary/shared');

test('이미지 주소는 https의 잡코리아 file*·사람인 saraminimage 서버만 허용한다', () => {
  for (const ok of ['https://file2.jobkorea.co.kr/a.png', 'https://file.jobkorea.co.kr/a.png', 'https://static.saraminimage.co.kr/b.webp', 'https://saraminimage.co.kr/c.jpg']) assert.equal(isPostingImageUrl(ok), true, ok);
  for (const bad of ['http://file2.jobkorea.co.kr/a.png', 'https://www.jobkorea.co.kr/a.png', 'https://file2.jobkorea.co.kr.evil.com/a.png', 'https://evilsaraminimage.co.kr/a.png',
    'https://user:pw@file2.jobkorea.co.kr/a.png', 'https://file2.jobkorea.co.kr:8443/a.png', 'https://169.254.169.254/latest', 'javascript:alert(1)', 42]) assert.equal(isPostingImageUrl(bad), false, String(bad));
});

test('익스텐션 응답은 공고 주소·ID가 맞아야 하고, 길이는 자르고, 이미지는 허용 목록만 남긴다', () => {
  const base = { platform: 'jobkorea', postingId: '50303737', url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/50303737', title: ' 제목 ', company: '회사', location: '서울 강남구', workSchedule: '주5일', text: '가'.repeat(20000) };
  const posting = parsePostingContent({ ...base, imageUrls: ['https://file2.jobkorea.co.kr/a.png', 'https://evil.example.com/b.png', ...Array(9).fill('https://file2.jobkorea.co.kr/c.png')] });
  assert.equal(posting.title, '제목');
  assert.equal(posting.text.length, 15000);
  assert.equal(posting.imageUrls.length, MAX_POSTING_IMAGE_URLS);
  assert.ok(!posting.imageUrls.includes('https://evil.example.com/b.png'));
  assert.equal(parsePostingContent({ ...base, postingId: '999' }), null, '주소와 ID가 다르면 거절');
  assert.equal(parsePostingContent({ ...base, platform: 'wanted' }), null);
  assert.equal(parsePostingContent({ ...base, url: 'https://evil.example.com/Recruit/GI_Read/50303737' }), null);
  assert.equal(parsePostingContent(null), null);
});
