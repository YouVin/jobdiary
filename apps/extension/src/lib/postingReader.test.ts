import { describe, expect, it } from 'vitest';
import { htmlToText, readImageUrls, readJobkoreaSummary, readPosting } from './postingReader';

// 공고 페이지 읽기 (#238). 실제 사이트 HTML을 저장소에 넣지 않고, 2026-11-25에 확인한 구조만 작게 흉내 낸다.
const JOBKOREA_PAGE = `
<html><head><script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'JobPosting', title: '파이프라인 엔지니어 채용공고',
  hiringOrganization: { '@type': 'Organization', name: '엔코어스튜디오 주식회사' },
  jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', streetAddress: '서울 강남구 도산대로56길 5 (청담동) 지하1층,1층' } },
})}</script></head>
<body><div>근무시간</div><ul class="list"><li class="item">주5일(월~금)</li></ul></body></html>`;

const JOBKOREA_IMAGE_BODY = `<div class="detail"><img src="https://file2.jobkorea.co.kr/Net/Recruit/posting.png?v=1"><img src="https://i.jobkorea.kr/logo.png"></div>`;
const JOBKOREA_TEXT_BODY = `<div><p>디유넷은 에듀테크 기업입니다.</p><ul><li>1. 담당업무</li><li>온라인 교육 솔루션 개발&nbsp;&amp; 운영</li></ul><script>var x = '<li>숨김</li>';</script></div>`;
const SARAMIN_BODY = `<div class="user_content"><p>📋 주요업무<br>- 웹 서비스 개발</p><p>🏠 근무조건<br>근무지 : 서울 강서구 양천로 620, 재택근무 가능</p>
<img src="//static.saraminimage.co.kr/recruit/body.webp"><img src="https://evil.example.com/a.png"></div>`;

function fakeFetch(pages: Record<string, string>) {
  const requested: string[] = [];
  const fetchText = async (url: string) => {
    requested.push(url);
    if (!(url in pages)) throw new Error(`예상하지 않은 요청: ${url}`);
    return pages[url];
  };
  return { fetchText, requested };
}

describe('postingReader', () => {
  it('잡코리아: 구조화 데이터의 정확한 근무지·회사·제목과 요약 칸 근무시간을 읽는다', () => {
    expect(readJobkoreaSummary(JOBKOREA_PAGE)).toEqual({
      title: '파이프라인 엔지니어 채용공고', company: '엔코어스튜디오 주식회사',
      location: '서울 강남구 도산대로56길 5 (청담동) 지하1층,1층', workSchedule: '주5일(월~금)',
    });
  });

  it('본문 글은 블록 경계를 줄바꿈으로 남기고, 스크립트·태그·문자 엔티티를 정리한다', () => {
    expect(htmlToText(JOBKOREA_TEXT_BODY)).toBe('디유넷은 에듀테크 기업입니다.\n1. 담당업무\n온라인 교육 솔루션 개발 & 운영');
  });

  it('본문 이미지는 허용된 이미지 서버(잡코리아 file*, 사람인 saraminimage)만 남긴다', () => {
    expect(readImageUrls(JOBKOREA_IMAGE_BODY, 'https://www.jobkorea.co.kr/Recruit/GI_Read_Comt_Ifrm?Gno=1'))
      .toEqual(['https://file2.jobkorea.co.kr/Net/Recruit/posting.png?v=1']);
    expect(readImageUrls(SARAMIN_BODY, 'https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx=1'))
      .toEqual(['https://static.saraminimage.co.kr/recruit/body.webp']);
  });

  it('잡코리아 공고는 공고 페이지와 본문 페이지 두 곳만 읽는다', async () => {
    const { fetchText, requested } = fakeFetch({
      'https://www.jobkorea.co.kr/Recruit/GI_Read/50303737': JOBKOREA_PAGE,
      'https://www.jobkorea.co.kr/Recruit/GI_Read_Comt_Ifrm?Gno=50303737': JOBKOREA_IMAGE_BODY,
    });
    const posting = await readPosting('https://www.jobkorea.co.kr/Recruit/GI_Read/50303737?utm=x', fetchText);
    expect(requested).toHaveLength(2);
    expect(posting).toMatchObject({ platform: 'jobkorea', postingId: '50303737', location: '서울 강남구 도산대로56길 5 (청담동) 지하1층,1층', text: '' });
    expect(posting.imageUrls).toHaveLength(1);
  });

  it('사람인 공고는 본문 페이지만 읽고, 근무지는 본문의 "근무지 :" 줄에서 가져온다', async () => {
    const { fetchText, requested } = fakeFetch({ 'https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx=55604816&rec_seq=0': SARAMIN_BODY });
    const posting = await readPosting('https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=55604816#seq=0', fetchText);
    expect(requested).toEqual(['https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx=55604816&rec_seq=0']);
    expect(posting.location).toBe('서울 강서구 양천로 620, 재택근무 가능');
    expect(posting.text).toContain('- 웹 서비스 개발');
  });

  it('공고 주소가 아니면 아무것도 요청하지 않는다', async () => {
    const { fetchText, requested } = fakeFetch({});
    for (const url of ['https://evil.example.com/Recruit/GI_Read/1', 'https://www.wanted.co.kr/company/123', 'javascript:alert(1)']) {
      await expect(readPosting(url, fetchText)).rejects.toThrow('unsupported-posting');
    }
    expect(requested).toEqual([]);
  });

  it('원티드는 공고 페이지 하나의 Next.js 데이터에서 칸별 본문·근무지·회사를 읽고 이미지는 없다', async () => {
    const initialData = {
      id: 381742, position: '프론트엔드 개발자', company: { company_name: '스튜디오프리윌루전' },
      address: { full_location: '서울 서초구 매헌로16길 32, 희경빌딩F동 401호' },
      intro: '영상 콘텐츠 스타트업입니다.', main_tasks: '• 플랫폼 프론트엔드 개발', requirements: '• Next.js, TypeScript 경험', preferred_points: '', benefits: '• 점심 식대',
    };
    const page = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { initialData } } })}</script></html>`;
    const { fetchText, requested } = fakeFetch({ 'https://www.wanted.co.kr/wd/381742': page });
    const posting = await readPosting('https://www.wanted.co.kr/wd/381742?utm_source=x', fetchText);
    expect(requested).toEqual(['https://www.wanted.co.kr/wd/381742']);
    expect(posting).toMatchObject({ platform: 'wanted', title: '프론트엔드 개발자', company: '스튜디오프리윌루전', location: '서울 서초구 매헌로16길 32, 희경빌딩F동 401호', imageUrls: [] });
    expect(posting.text).toBe('[회사 소개]\n영상 콘텐츠 스타트업입니다.\n\n[주요업무]\n• 플랫폼 프론트엔드 개발\n\n[자격요건]\n• Next.js, TypeScript 경험\n\n[혜택 및 복지]\n• 점심 식대');
  });

  it('원티드 데이터의 공고 번호가 다르면(다른 공고) 본문을 쓰지 않는다', async () => {
    const page = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { initialData: { id: 1, main_tasks: '다른 공고' } } } })}</script>`;
    const { fetchText } = fakeFetch({ 'https://www.wanted.co.kr/wd/381742': page });
    expect((await readPosting('https://www.wanted.co.kr/wd/381742', fetchText)).text).toBe('');
  });
});
