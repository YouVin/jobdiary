// 겹쳐 뜨는 창(지원 추가 Dialog·상세 SidePanel)과 계정 설정(#205)을 실제 Edge·앱으로 검사한다.
// Supabase HTTP는 fixture(scripts/fixtures/sampleSession.mjs)로 대신한다.
// 사용: apps/web에서 개발 서버를 띄운 뒤 `node scripts/verify-overlays-browser.mjs`
//   TEST_ORIGIN(기본 http://localhost:3100), SHOT_DIR을 주면 창·계정 화면을 1440·390px로 찍는다.
import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';
import { routeSupabase, scan as scanPage, signIn } from './fixtures/sampleSession.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const shotDir = process.env.SHOT_DIR;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
await routeSupabase(context);
const page = await context.newPage();
page.on('pageerror', (error) => pageErrors.push(error.message));
page.setDefaultTimeout(10000);
const scan = (name) => scanPage(page, name);
const activeLabel = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim() ?? '');

// Tab을 여러 번 눌러도 포커스가 창 밖으로 나가지 않는다 (앞뒤 모두)
async function assertFocusTrapped(name) {
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let index = 0; index < 30; index += 1) {
      await page.keyboard.press(key);
      assert(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))), `${name}: ${key} ${index + 1}번째에 창 밖으로 나감`);
    }
  }
  console.log(`PASS 포커스 가두기 ${name} (Tab·Shift+Tab 각 30번)`);
}

async function shoot(name) {
  if (!shotDir) return;
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(shotDir, `overlay_${name}_${width}.png`), fullPage: width === 1440 ? false : true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

try {
  await signIn(page, origin);
  await page.locator('#summary-title').waitFor();

  // 지원 추가 창: 열기 → 포커스 가두기 → 빈 회사명 제출 → 첫 오류 칸 포커스 → Esc → 연 버튼으로 복귀
  const addButton = page.getByRole('button', { name: '지원 추가', exact: true });
  await addButton.click();
  const addDialog = page.getByRole('dialog', { name: '지원 추가' });
  await addDialog.waitFor();
  await scan('지원 추가 창');
  await assertFocusTrapped('지원 추가 창');
  await addDialog.getByRole('button', { name: '지원 추가', exact: true }).click();
  const company = addDialog.getByLabel('회사명 (필수)', { exact: true });
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-invalid') === 'true');
  assert.equal(await company.evaluate((element) => element === document.activeElement), true, '첫 오류 칸(회사명)으로 포커스');
  await addDialog.getByText('회사명을 입력해 주세요.', { exact: true }).waitFor();
  await scan('지원 추가 창·오류');
  await shoot('add');
  await page.keyboard.press('Escape');
  await addDialog.waitFor({ state: 'detached' });
  assert.equal(await addButton.evaluate((element) => element === document.activeElement), true, 'Esc 뒤 연 버튼으로 포커스');

  // 실제 추가 → 토스트
  await addButton.click();
  await addDialog.getByLabel('회사명 (필수)', { exact: true }).fill('검증소프트');
  await addDialog.getByLabel('공고명', { exact: true }).fill('프론트엔드 개발자');
  await addDialog.getByLabel('단계', { exact: true }).selectOption('screening');
  await addDialog.getByRole('button', { name: '지원 추가', exact: true }).click();
  await addDialog.waitFor({ state: 'detached' });
  await page.getByRole('status').filter({ hasText: '검증소프트 지원을 추가했어요' }).waitFor();
  console.log('PASS 지원 추가 저장·토스트');

  // 상세 패널: 지원 보드 주간의 연필 버튼으로 연다
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: /지원 보드/ }).click();
  await page.getByRole('heading', { level: 1, name: '지원 보드' }).waitFor();
  const openButton = page.getByRole('region', { name: /결과 기다리는 중/ }).getByRole('button', { name: / 상세 보기$/ }).first();
  const openName = await openButton.getAttribute('aria-label');
  const companyName = openName.replace(/ 상세 보기$/, '');
  await openButton.click();
  const panel = page.getByRole('dialog', { name: companyName });
  await panel.waitFor();
  await scan('상세 패널');
  await assertFocusTrapped('상세 패널');
  await shoot('panel');

  // 기록 남기기 → 패널 안 알림(창이 열린 동안의 결과는 창 안에서 알린다), 지나온 기록에 보임
  await panel.getByRole('form', { name: '기록 남기기' }).getByRole('textbox').fill('포트폴리오 링크를 다시 확인하기');
  await panel.getByRole('button', { name: '기록 남기기', exact: true }).click();
  await panel.getByRole('status').filter({ hasText: '기록을 남겼어요.' }).waitFor();
  await panel.getByText('포트폴리오 링크를 다시 확인하기', { exact: true }).waitFor();

  // 정보 수정 화면 → 첫 칸 포커스 → 취소하면 "정보 수정" 버튼으로 돌아옴
  await panel.getByRole('button', { name: '정보 수정', exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.tagName === 'INPUT');
  await scan('상세 패널·정보 수정');
  await panel.getByRole('button', { name: '취소', exact: true }).click();
  assert.equal(await activeLabel(), '정보 수정');
  // 저장하면 상세로 돌아오고 패널 안에서 알린다
  await panel.getByRole('button', { name: '정보 수정', exact: true }).click();
  await panel.getByLabel('공고명', { exact: true }).fill('웹 프론트엔드 개발자');
  await panel.getByRole('button', { name: '저장', exact: true }).click();
  await panel.getByRole('status').filter({ hasText: '정보를 고쳤어요.' }).waitFor();
  assert.equal(await activeLabel(), '정보 수정');
  await page.keyboard.press('Escape');
  await panel.waitFor({ state: 'detached' });
  assert.equal(await activeLabel(), openName, 'Esc 뒤 연 버튼(연필)으로 포커스');
  console.log('PASS 상세 패널 기록 남기기·정보 수정 전환·Esc·포커스 되돌리기');

  // 계정 설정: 빈 제출은 첫 오류 칸으로, 탈퇴는 확인 문구가 다르면 칸으로
  await page.getByRole('button', { name: '내 계정', exact: true }).click();
  await page.getByRole('link', { name: '계정 설정', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: '계정 설정' }).waitFor();
  await scan('계정 설정');
  await page.getByRole('button', { name: '비밀번호 바꾸기', exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.id === 'currentPassword');
  await page.getByText('지금 비밀번호를 입력해 주세요.', { exact: true }).waitFor();
  await page.getByRole('button', { name: '회원 탈퇴', exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.id === 'deleteConfirm');
  await page.getByText('"탈퇴합니다"를 그대로 입력해 주세요.', { exact: true }).waitFor();
  await scan('계정 설정·오류');
  await shoot('account');
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `계정 설정 ${width}px 가로 넘침`);
  }

  assert.deepEqual(pageErrors, []);
  console.log('PASS 지원 추가 창·상세 패널 포커스 가두기·Esc·되돌리기, 칸별 오류 포커스, 토스트, 계정 설정 3개 너비, 브라우저 예외 0건');
} finally {
  await browser.close();
}
