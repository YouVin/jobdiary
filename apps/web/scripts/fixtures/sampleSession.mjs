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
      return send(rows);
    }
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
  await page.waitForTimeout(700);
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
