// 로그인한 화면을 검사할 때 함께 쓰는 fixture (#203, #204).
// Supabase HTTP를 가로채 예시 지원 50건과 약관 동의를 마친 사용자를 돌려주고, OAuth 복귀처럼 주소의 토큰으로 로그인한다.
// 회사 이름은 지어낸 이름이며, 사이트 간 중복 묶음 2개(같은 회사·공고, 다른 사이트)를 일부러 넣었다.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const DAY = 24 * 60 * 60 * 1000;
export const todayKst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
const dateAt = (offset) => new Date(Date.parse(`${todayKst}T00:00:00Z`) + offset * DAY).toISOString().slice(0, 10);

export const user = {
  id: '22222222-2222-4222-8222-222222222222', aud: 'authenticated', role: 'authenticated', email: 'sample@example.test',
  app_metadata: { provider: 'email' }, user_metadata: { terms_version: '2026-10-17', privacy_version: '2026-10-17' }, created_at: '2026-09-01T00:00:00Z',
  // 이메일 가입 계정 (계정 설정의 비밀번호 변경 칸이 보인다)
  identities: [{ id: 'email-identity', provider: 'email', user_id: '22222222-2222-4222-8222-222222222222', identity_data: {}, created_at: '2026-09-01T00:00:00Z' }],
};

const NAMES = ['가람소프트', '나래랩스', '다온시스템', '라온데이터', '마루테크', '바다컴퍼니', '사이웍스', '아라네트웍스', '자람에듀', '차오름', '카라클라우드', '타래', '파랑스튜디오', '하늘정보'];
const PLATFORMS = ['jobkorea', 'saramin', 'jobkorea', 'saramin', 'wanted'];
const STATUSES = ['applied', 'applied', 'rejected', 'applied', 'screening', 'rejected', 'interview', 'canceled', 'applied', 'offer'];
const POSITIONS = ['프론트엔드 개발자', '백엔드 개발자', '웹 퍼블리셔'];

export const rows = Array.from({ length: 50 }, (_, index) => {
  const applied = dateAt(-((index * 53) % 56) - (index % 3 === 0 ? 0 : 1));
  const status = STATUSES[index % STATUSES.length];
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    user_id: user.id,
    company: `${NAMES[index % NAMES.length]}${index >= NAMES.length ? ` ${Math.floor(index / NAMES.length) + 1}` : ''}`,
    position: POSITIONS[index % 3],
    platform: PLATFORMS[index % PLATFORMS.length],
    status,
    status_source: status === 'rejected' && index % 4 === 0 ? 'deadline' : 'manual',
    applied_at: `${applied}T01:00:00Z`,
    updated_at: `${applied}T01:00:00Z`,
    created_at: `${applied}T01:00:00Z`,
    memo: null,
    diary: [],
    interview_date: status === 'interview' ? `${dateAt(2 + (index % 5))}T05:00:00Z` : null,
    deadline_at: index % 6 === 0 ? dateAt(index % 20) : null,
    url: index % 4 === 0 ? `https://www.jobkorea.co.kr/Recruit/GI_Read/${1000 + index}` : null,
    external_id: null,
  };
});
// 중복 묶음: 마지막 두 건을 앞의 두 건과 같은 회사·공고로, 다른 사이트에서 지원한 것으로 바꾼다.
for (const [copyIndex, sourceIndex, platform] of [[48, 0, 'saramin'], [49, 1, 'jobkorea']]) {
  Object.assign(rows[copyIndex], { company: rows[sourceIndex].company, position: rows[sourceIndex].position, platform });
}

// 회사 정보(#229): 지원별 저장된 결과와 Edge Function 요청 기록. 실제 AI는 부르지 않는다.
// 공고 내용에 [한도초과]·[실패]를 넣으면 서버의 429·502 응답을 흉내 낸다.
export const companyInfoStore = new Map();
export const companyInfoRequests = [];
export const SAMPLE_COMPANY_INFO = {
  companySummary: '웹 서비스를 만드는 IT 회사예요.',
  hasTalentStatement: true,
  strengths: [
    { strength: '소통', quote: '다양한 직군의 동료와 원활하게 소통하는 분', reason: '여러 직군과 함께 일하는 환경을 강조해요.', prepQuestion: '다른 직군과 의견이 달랐던 경험을 말해 주세요.' },
    { strength: '책임감', quote: '맡은 기능을 기획부터 배포까지 책임지고 완수해 본 경험', reason: '기능을 끝까지 맡는 역할이에요.', prepQuestion: '처음부터 끝까지 맡아 출시한 기능이 있나요?' },
  ],
  skills: { required: ['React', 'TypeScript'], preferred: ['Next.js', '테스트 코드'] },
};
export const SAMPLE_TRANSCRIPT = `[주요 업무]
- React로 사용자 화면을 만들어요
[자격 요건]
- 다양한 직군의 동료와 원활하게 소통하는 분
- 맡은 기능을 기획부터 배포까지 책임지고 완수해 본 경험`;

async function routeCompanyInfo(route, url, send) {
  const method = route.request().method();
  if (method === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  if (url.pathname === '/rest/v1/application_analyses') {
    const id = url.searchParams.get('application_id')?.replace(/^eq\./, '');
    const row = id ? companyInfoStore.get(id) : undefined;
    return send(row ? [row] : []);
  }
  const body = route.request().postDataJSON();
  companyInfoRequests.push(body);
  const text = body.postingText ?? '';
  if (text.includes('[한도초과]')) return send({ error: '회사 정보는 하루 5번까지 새로 만들 수 있어요. 내일 다시 해 주세요.', code: 'daily_limit' }, 429);
  if (text.includes('[실패]')) return send({ error: 'AI 응답을 받지 못했어요. 잠시 후 다시 해 주세요.', code: 'ai_unavailable' }, 502);
  // 이미지 공고(#232)는 AI가 옮겨 적은 글(transcript)도 함께 돌려준다.
  const result = body.postingImages ? { transcript: SAMPLE_TRANSCRIPT, ...SAMPLE_COMPANY_INFO } : SAMPLE_COMPANY_INFO;
  const createdAt = new Date().toISOString();
  companyInfoStore.set(body.applicationId, { result, created_at: createdAt });
  return send({ companyInfo: { result, model: 'claude-haiku-5-5', createdAt }, cached: false });
}

export async function routeSupabase(context) {
  await context.route('https://*.supabase.co/**', async (route) => {
    const url = new URL(route.request().url());
    const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/auth/v1/user') return send(user);
    if (url.pathname === '/rest/v1/applications') {
      // 단계 변경(PATCH)은 바뀐 행을 그대로 돌려준다.
      if (route.request().method() === 'PATCH') {
        // id 조건이 없는 PATCH는 로드 때의 마감 자동 탈락(익스텐션·직접 만든 지원만 대상)이다. 예시 행은 대상이 아니다.
        if (!url.searchParams.has('id')) return send([]);
        const id = url.searchParams.get('id').replace(/^eq\./, '');
        const row = rows.find((item) => item.id === id);
        Object.assign(row, route.request().postDataJSON(), { updated_at: new Date().toISOString() });
        return send(row); // .single() 요청이라 객체 하나로 돌려준다
      }
      // 지원 추가(POST): 한 건(.single())이면 객체, 여러 건이면 배열로 돌려준다.
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        const now = new Date().toISOString();
        const created = (Array.isArray(body) ? body : [body]).map((item, index) => ({
          id: `99999999-0000-4000-8000-${String(rows.length + index).padStart(12, '0')}`,
          created_at: now, updated_at: now, diary: [], memo: null, interview_date: null, url: null, external_id: null, ...item,
        }));
        rows.push(...created);
        return send(Array.isArray(body) ? created : created[0], 201);
      }
      if (route.request().method() === 'DELETE') {
        const id = url.searchParams.get('id')?.replace(/^eq\./, '');
        const index = rows.findIndex((item) => item.id === id);
        return send(index >= 0 ? rows.splice(index, 1) : []);
      }
      return send(rows);
    }
    if (url.pathname === '/rest/v1/application_analyses' || url.pathname === '/functions/v1/company-info') return routeCompanyInfo(route, url, send);
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
    throw new Error(`예상하지 않은 요청: ${route.request().method()} ${url.pathname}`);
  });
}

export async function signIn(page, origin, path = '/') {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.test`;
  await page.goto(`${origin}/login#access_token=${token}&refresh_token=test&expires_in=3600&token_type=bearer`);
  await page.waitForURL(`${origin}/`);
  if (path !== '/') await page.goto(`${origin}${path}`);
}

const axeSource = fs.readFileSync('node_modules/.release-tools/node_modules/axe-core/axe.min.js', 'utf8');

// axe(WCAG 2.2 AA + best-practice)와 ARIA 참조 대상 검사. 움직임이 끝난 뒤 잰다.
export async function scan(page, name) {
  // 카드가 올라오는 움직임이 다 끝난 뒤 잰다: 마지막 카드 지연 300ms + 0.5s = 800ms.
  // 운영 빌드는 개발 서버보다 빨리 그려져 700ms로는 움직임 도중을 재는 일이 생겼다(#206).
  await page.waitForTimeout(1000);
  if (!(await page.evaluate(() => Boolean(window.axe)))) await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
    return result.violations.map((item) => ({ id: item.id, targets: item.nodes.map((node) => node.target) }));
  });
  assert.deepEqual(violations, [], name);
  const missing = await page.evaluate(() => Array.from(document.querySelectorAll('[aria-describedby], [aria-controls], [aria-labelledby]')).flatMap((element) => ['aria-describedby', 'aria-controls', 'aria-labelledby'].flatMap((attribute) => (element.getAttribute(attribute) || '').split(' ').filter(Boolean).filter((id) => !document.getElementById(id)))));
  assert.deepEqual(missing, [], `${name}: ARIA 참조 대상 존재`);
  console.log(`PASS axe/ARIA ${name}`);
}
