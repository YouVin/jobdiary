// 예시 데이터로 홈·지원 보드를 찍고 가로 넘침·브라우저 예외를 확인한다.
// 사용: (저장소 루트에서) node .claude/skills/jobdiary-release/scripts/capture-home.mjs <출력폴더> [origin]
// 전제: apps/web 프로덕션 서버가 origin(기본 http://localhost:3100)에서 실행 중.
// Supabase 요청은 모두 예시 데이터로 가로채며 실제 계정·DB를 사용하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const outDir = path.resolve(process.argv[2] ?? '');
const origin = process.argv[3] ?? 'http://localhost:3100';
if (!process.argv[2]) {
  console.error('usage: node .claude/skills/jobdiary-release/scripts/capture-home.mjs <out-dir> [origin]');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const playwrightPath = path.join(root, 'apps/web/node_modules/.release-tools/node_modules/playwright/index.mjs');
const { chromium } = await import(pathToFileURL(playwrightPath).href);

// 공개 Supabase 주소에서 브라우저 세션 저장 키만 만든다(비밀값 아님).
const env = fs.readFileSync(path.join(root, 'apps/web/.env.local'), 'utf8');
const publicUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const authKey = 'sb-' + new URL(publicUrl).hostname.split('.')[0] + '-auth-token';
const user = {
  id: '11111111-1111-4111-8111-111111111111', email: 'sample@example.test', aud: 'authenticated', role: 'authenticated',
  app_metadata: { provider: 'email' }, user_metadata: { terms_version: '2026-10-17', privacy_version: '2026-10-17' },
  created_at: '2026-01-01T00:00:00Z',
};
const exp = Math.floor(Date.now() / 1000) + 3600;
const enc = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
const session = { access_token: `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ sub: user.id, exp })}.test`, refresh_token: 'test', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };

// 오늘(한국 날짜) 기준 상대 날짜
const todayKst = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const shift = (days) => new Date(Date.parse(`${todayKst}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

const companies = ['루트랩스', '데이브릿지', '하루컴퍼니', '스튜디오온', '페이지원', '클라우드베리', '모아핀테크', '그린카트', '노바모빌리티', '온기랩', '테이블포', '브릭웍스'];
const plan = [['applied', 21], ['screening', 6], ['interview', 3], ['interviewed', 2], ['offer', 1], ['rejected', 12], ['canceled', 3]];
const platforms = [...Array(22).fill('saramin'), ...Array(15).fill('jobkorea'), ...Array(8).fill('wanted'), ...Array(3).fill('manual')];
const rows = [];
let n = 0;
for (const [status, count] of plan) {
  for (let i = 0; i < count; i += 1) {
    const applied = shift(-(n % 30));
    rows.push({
      id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, user_id: user.id,
      company: n < companies.length ? companies[n] : `예시회사 ${n + 1}`, position: n % 2 ? '프론트엔드 개발자' : '웹 프론트엔드',
      platform: platforms[n], status, status_source: status === 'rejected' && i < 4 ? 'deadline' : 'manual',
      applied_at: `${applied}T00:00:00Z`, updated_at: `${applied}T01:00:00Z`, created_at: `${applied}T00:00:00Z`,
      deadline_at: n === 0 ? shift(2) : n === 1 ? shift(7) : null,
      interview_date: status === 'interview' ? `${shift([0, 3, 9][i])}T00:00:00.000Z` : null,
      diary: [], memo: null, url: null, external_id: null,
    });
    n += 1;
  }
}

const browser = await chromium.launch({ channel: 'msedge', headless: true });
let failed = false;
async function shoot(data, shots) {
  const context = await browser.newContext({ timezoneId: 'Asia/Seoul', locale: 'ko-KR' });
  const errors = [];
  context.on('page', (p) => p.on('pageerror', (e) => errors.push(e.message)));
  await context.addInitScript(([key, value, appOrigin]) => {
    if (location.origin === appOrigin) localStorage.setItem(key, value);
  }, [authKey, JSON.stringify(session), new URL(origin).origin]);
  await context.route('https://*.supabase.co/**', (route) => {
    const url = new URL(route.request().url());
    const body = url.pathname === '/auth/v1/user' ? user : url.pathname === '/rest/v1/applications' && route.request().method() === 'GET' ? data : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  for (const [route, width, name] of shots) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + route);
    await page.getByRole('button', { name: '지원추가' }).waitFor();
    await page.waitForTimeout(800);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) failed = true;
    await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
    console.log(`${name}: ${overflow ? 'OVERFLOW' : 'ok'}`);
  }
  if (errors.length) failed = true;
  console.log(`browser errors: ${errors.length ? errors.join(' | ') : 0}`);
  await context.close();
}

await shoot(rows, [['/', 1440, 'home-1440'], ['/', 768, 'home-768'], ['/', 390, 'home-390'], ['/board', 1440, 'board-1440'], ['/board', 768, 'board-768'], ['/board', 390, 'board-390']]);
await shoot([], [['/', 1440, 'home-empty-1440']]);
await browser.close();
console.log(`screenshots: ${outDir}`);
process.exit(failed ? 1 : 0);
