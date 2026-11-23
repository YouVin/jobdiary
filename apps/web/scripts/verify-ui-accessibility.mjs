// 공통 부품 견본(/dev/ui)의 접근성 검사 (#201). 실행 중인 개발 서버에 붙는다.
// 사용: apps/web에서 `npm run dev` 후 `npm run verify:ui` (다른 주소면 TEST_ORIGIN=http://localhost:3100)
// 검사: axe(WCAG 2.2 AA + best-practice), ARIA 참조 대상, 본문 건너뛰기, 창 포커스 가두기·Esc·되돌리기, 토스트 읽기, 눌림 상태.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '../node_modules/.release-tools/node_modules/playwright/index.mjs';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3000';
const axeSource = fs.readFileSync('node_modules/.release-tools/node_modules/axe-core/axe.min.js', 'utf8');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.setDefaultTimeout(10000);

async function scan(name) {
  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    });
    return result.violations.map((item) => ({ id: item.id, impact: item.impact, targets: item.nodes.map((node) => node.target.join(' ')) }));
  });
  assert.deepEqual(violations, [], `axe ${name}`);
  const missing = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[aria-describedby], [aria-controls], [aria-labelledby]')).flatMap((element) =>
      ['aria-describedby', 'aria-controls', 'aria-labelledby'].flatMap((attribute) =>
        (element.getAttribute(attribute) || '').split(' ').filter(Boolean).filter((id) => !document.getElementById(id)),
      ),
    ),
  );
  assert.deepEqual(missing, [], `ARIA 참조 대상 ${name}`);
  console.log(`PASS axe·ARIA ${name}`);
}

const activeInfo = () => page.evaluate(() => ({
  text: document.activeElement?.textContent?.trim() ?? '',
  label: document.activeElement?.getAttribute('aria-label') ?? '',
  inDialog: Boolean(document.activeElement?.closest('[role="dialog"]')),
  id: document.activeElement?.id ?? '',
}));

try {
  await page.goto(`${origin}/dev/ui`);
  await page.getByRole('heading', { name: '공통 부품 견본' }).waitFor();
  await page.waitForLoadState('networkidle');
  await scan('견본 전체');

  // 본문으로 건너뛰기: 첫 Tab에 보이고, Enter로 본문에 포커스
  await page.keyboard.press('Tab');
  assert.equal((await activeInfo()).text, '본문으로 건너뛰기');
  await page.keyboard.press('Enter');
  assert.equal((await activeInfo()).id, 'main-content');
  console.log('PASS 본문으로 건너뛰기');

  // 로딩 버튼: aria-busy와 이름
  const loading = page.getByRole('button', { name: /저장하는 중/ });
  assert.equal(await loading.getAttribute('aria-busy'), 'true');
  assert.equal(await page.getByRole('button', { name: '지원 추가', exact: true }).first().getAttribute('aria-disabled'), null);
  console.log('PASS 로딩·비활성 버튼');

  // 탭·칩 눌림 상태
  await page.getByRole('button', { name: '보드', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: '보드', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: /^사람인/ }).click();
  assert.equal(await page.getByRole('button', { name: /^사람인/ }).getAttribute('aria-pressed'), 'true');
  console.log('PASS 탭·칩 눌림 상태');

  // 가운데 창: 키보드로 열면 안의 첫 입력칸으로, Tab은 창 안에서 돌고, Esc로 닫히면 연 버튼으로 돌아온다
  const dialogOpener = page.getByRole('button', { name: '가운데 창 열기' });
  await dialogOpener.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('dialog', { name: '지원 추가' }).waitFor();
  assert.equal((await activeInfo()).inDialog, true);
  await scan('가운데 창 열림');
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Tab');
    assert.equal((await activeInfo()).inDialog, true, `Tab ${i + 1}번째도 창 안`);
  }
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  assert.equal((await activeInfo()).text, '가운데 창 열기');
  console.log('PASS 가운데 창 포커스 가두기·Esc·되돌리기');

  // 오른쪽 패널: 패널 자체에 포커스, Esc로 닫고 되돌리기
  const panelOpener = page.getByRole('button', { name: '오른쪽 패널 열기' });
  await panelOpener.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('dialog', { name: 'A사' }).waitFor();
  assert.equal((await activeInfo()).inDialog, true);
  // 패널은 투명 → 불투명으로 나타난다(duration-base 250ms). 나타나는 도중에 재면 글자를 반투명으로 읽어 대비 오류로 잘못 잡는다.
  await page.waitForTimeout(400);
  await scan('오른쪽 패널 열림');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  assert.equal((await activeInfo()).text, '오른쪽 패널 열기');
  console.log('PASS 오른쪽 패널 포커스·Esc·되돌리기');

  // 토스트: 항상 있는 role=status 영역에 문구가 들어간다
  await page.getByRole('button', { name: '알림 보기' }).click();
  await page.getByRole('status').filter({ hasText: '지원 3건을 가져왔어요' }).waitFor();
  console.log('PASS 토스트 읽기 영역');

  // 비밀번호 보기 버튼: 눌림 상태와 이름이 바뀐다
  const toggle = page.getByRole('button', { name: '비밀번호 보기' });
  await toggle.click();
  assert.equal(await page.getByRole('button', { name: '비밀번호 숨기기' }).getAttribute('aria-pressed'), 'true');
  console.log('PASS 비밀번호 보기 버튼');

  assert.deepEqual(pageErrors, [], '페이지 오류 없음');
  console.log('모든 부품 접근성 검사 통과');
} finally {
  await browser.close();
}
