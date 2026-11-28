// 소개 페이지(/intro, #286)를 운영 빌드에서 검사한다.
// 사용: apps/web에서 `npx next start -p 3100` 뒤 `node scripts/verify-intro-browser.mjs`
import assert from 'node:assert/strict';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { routeSupabase, scan, signIn } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const STORE = 'https://chromewebstore.google.com/detail/afnboeihbppogfinbickjaaadcgjkmil';
const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'msedge' }), headless: true });
const errors = [];
try {
  // ── 스크립트 없이 받은 HTML: 검색 로봇·AI가 읽는 내용 ──
  const crawler = await browser.newContext({ javaScriptEnabled: false });
  const raw = await crawler.newPage();
  const response = await raw.goto(`${origin}/intro`);
  assert.equal(response.status(), 200);
  assert.match(await raw.locator('meta[name="robots"]').getAttribute('content'), /^index, follow/);
  assert.equal(await raw.getByRole('heading', { level: 1 }).textContent(), '여기저기 지원한 회사, 취준일기 한곳에 모아요');
  const blocks = (await raw.locator('script[type="application/ld+json"]').allTextContents()).flatMap((text) => JSON.parse(text));
  const app = blocks.find((block) => block['@type'] === 'WebApplication');
  const faq = blocks.find((block) => block['@type'] === 'FAQPage');
  assert.equal(app.offers.price, '0');
  assert.ok(faq.mainEntity.length >= 5);
  // 화면의 질문과 구조화 데이터의 질문이 같다
  assert.deepEqual(await raw.locator('details summary').allTextContents(), faq.mainEntity.map((item) => item.name));
  // 질문 답도 스크립트 없이 HTML에 들어 있다(접힌 상태여도)
  assert.ok((await raw.content()).includes(faq.mainEntity[3].acceptedAnswer.text));
  await crawler.close();

  // ── 처음 온 사람: 링크·펼침·키보드·axe·화면 폭 ──
  const context = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul', reducedMotion: 'reduce' });
  await routeSupabase(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);
  await page.goto(`${origin}/intro`);
  const header = page.getByRole('banner');
  assert.equal(await header.getByRole('link', { name: '시작하기', exact: true }).getAttribute('href'), '/signup');
  assert.equal(await header.getByRole('link', { name: '로그인', exact: true }).getAttribute('href'), '/login');
  const install = page.getByRole('main').getByRole('link', { name: '크롬 익스텐션 설치 (새 탭에서 열림)' });
  assert.equal(await install.getAttribute('href'), STORE);
  assert.equal(await install.getAttribute('target'), '_blank');
  assert.equal(await page.getByRole('main').getByRole('link', { name: '무료로 시작하기' }).count(), 2);
  for (const name of ['이용약관', '개인정보처리방침']) await page.getByRole('contentinfo').getByRole('link', { name, exact: true }).waitFor();
  for (const src of ['home', 'board', 'detail', 'recap']) assert.ok((await page.locator(`img[src*="${src}-v"], img[srcset*="${src}-v"]`).first().getAttribute('alt')).length > 10);

  // 질문은 키보드로 연다
  const question = page.getByText('채용 사이트 비밀번호를 알려 줘야 하나요?', { exact: true });
  await question.focus();
  await page.keyboard.press('Enter');
  await page.getByText(/채용 사이트 비밀번호를 묻거나 저장하지 않아요/).waitFor({ state: 'visible' });
  await scan(page, '소개 페이지');

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), 0, `${width}px 가로 넘침`);
  }

  // 휴대폰(#310): 설치할 수 없는 익스텐션 버튼 대신 "가져오기는 PC 크롬" 안내, 휴대폰 화면 사진(alt 있음)
  await page.setViewportSize({ width: 390, height: 900 });
  assert.equal(await install.isVisible(), false, '휴대폰에서는 익스텐션 설치 버튼을 숨긴다');
  await page.getByText(/지원 내역 가져오기는 PC 크롬에서 해요/).waitFor({ state: 'visible' });
  for (const src of ['home-mobile', 'board-mobile']) assert.ok((await page.locator(`img[src*="${src}-v"], img[srcset*="${src}-v"]`).first().getAttribute('alt')).length > 10);
  await page.setViewportSize({ width: 1440, height: 900 });
  assert.equal(await install.isVisible(), true);
  await page.getByText(/지원 내역 가져오기는 PC 크롬에서 해요/).waitFor({ state: 'hidden' });

  // ── 로그인한 사람: 시작하기 대신 내 홈으로 ──
  await signIn(page, origin, '/intro');
  await header.getByRole('link', { name: '내 홈으로' }).waitFor();
  assert.equal(await header.getByRole('link', { name: '시작하기', exact: true }).count(), 0);

  assert.deepEqual(errors, []);
  console.log('PASS 소개 페이지: 스크립트 없이 h1·검색 허용·JSON-LD(앱·질문 화면과 같음)·답 HTML, 시작하기·로그인·익스텐션(새 탭)·약관 링크, 사진 alt, 질문 키보드 펼침, axe, 390·768·1440 넘침 없음, 로그인 시 내 홈으로, 브라우저 예외 0건');
} finally {
  await browser.close();
}
