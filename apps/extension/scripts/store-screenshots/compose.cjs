// 브라우저로 스토어·GitHub용 소개 이미지와 사용 방법 도식을 렌더링한다. 원본 UI는 capture.cjs·capture-company-info.mjs 결과다.
// #253: 웹앱 디자인 시스템(회색 바탕·흰 카드·파랑 하나, Pretendard)으로 바꿨다. 색은 apps/web/tailwind.config.ts 토큰 값이다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, loadBrowser, browserOptions } = require('./browser.cjs');
const base = path.join(root, 'apps/extension/docs');
const output = path.join(base, 'store-screenshots');
const raw = path.join(output, 'raw');
const data = file => 'data:image/png;base64,' + fs.readFileSync(path.join(raw, file + '.png')).toString('base64');
// 글꼴·로고는 저장소 파일을 data URL로 넣는다(외부 요청 없음).
const font = 'data:font/woff2;base64,' + fs.readFileSync(path.join(root, 'node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2')).toString('base64');
const logo = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'apps/web/public/brand/logo-mark.svg')).toString('base64');
// 토큰: page #F5F7FA · surface #FFFFFF · text-primary #1B2230 · text-secondary #5A6478 · text-brand #3461D1 · selected #EAF0FB · line-divider #E6E9EF
const baseCss = '@font-face{font-family:Pretendard;src:url(' + font + ') format("woff2");font-weight:45 920}*{box-sizing:border-box}'
  + 'body{margin:0;background:#F5F7FA;color:#1B2230;font-family:Pretendard,system-ui,sans-serif;-webkit-font-smoothing:antialiased}'
  + '.brand{display:flex;align-items:center;gap:10px;font-size:17px;font-weight:700}.brand img{width:28px;height:28px}';
const slides = [
  { out: '1-overview.png', raw: 'popup-collected', label: '지원내역 수집', title: '지원 기록을<br>한곳에 모으세요', text: '사람인·잡코리아·원티드의 지원내역을 수집하고<br>취준일기 웹앱으로 가져와요.', note: '수집 → 확인 → 취준일기로 가져오기', caption: '실제 팝업 화면' },
  { out: '2-copy.png', raw: 'popup-copied', label: '전체 복사', title: '모아 둔 지원내역을<br>표로 복사하세요', text: '글과 표를 함께 복사해<br>원하는 문서나 스프레드시트에 정리할 수 있어요.', note: '세 사이트 15건을 한 번에 복사', caption: '실제 팝업 화면' },
  { out: '3-start.png', raw: 'popup-empty', label: '시작하기', title: '지원현황을 열고<br>수집 버튼 한 번', text: '로그인한 지원현황 페이지에서 시작하세요.<br>아이디나 비밀번호는 입력받지 않아요.', note: '수집은 버튼을 눌렀을 때만 실행돼요.', caption: '실제 팝업 화면' },
  { out: '4-company.png', raw: 'company-info', label: '회사 정보 정리', title: '서류 통과한 공고,<br>회사부터 알아보세요', text: '취준일기 웹앱이 요청하면 저장된 공고 페이지를 읽어<br>회사 소개·원하는 강점·근무 조건을 정리해요.', note: '공개된 공고 페이지만 읽고 채용 사이트 로그인 정보는 쓰지 않아요.', caption: '취준일기 웹앱의 실제 화면', imageWidth: 400 },
  { out: '5-history.png', raw: 'history-site', label: '지원 이력 표시', title: '지원했던 공고,<br>한눈에 확인', text: '취준일기에 저장한 지원과 같은 공고면<br>지원·지원취소 이력을 표시해요.', note: '잡코리아·사람인 지원 · 원티드는 아직 표시하지 않아요.', caption: '예시 페이지 + 실제 확장 배지', wide: true },
];
function html(slide) {
  const imageWidth = slide.wide ? 680 : slide.imageWidth || 360;
  const css = baseCss + 'body{width:1280px;height:800px}.brand{position:absolute;left:80px;top:44px}'
    + '.layout{display:grid;grid-template-columns:' + (slide.wide ? '370px 680px' : '1fr ' + imageWidth + 'px') + ';gap:' + (slide.wide ? '30px' : '72px') + ';align-items:center;height:100%;padding:104px 80px 88px}'
    + '.label{display:inline-block;font-size:15px;font-weight:700;color:#3461D1;background:#EAF0FB;border-radius:8px;padding:6px 12px}'
    + '.title{font-size:' + (slide.wide ? '42px' : '48px') + ';font-weight:700;line-height:1.35;letter-spacing:-.02em;margin:24px 0 20px}'
    + '.description{font-size:19px;line-height:1.7;color:#5A6478;margin:0}'
    + '.note{font-size:14px;color:#5A6478;line-height:1.6;background:#FFFFFF;border-radius:12px;padding:14px 18px;margin-top:32px}'
    + '.frame{justify-self:center;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(27,34,48,.08)}'
    + '.frame img{display:block;width:' + imageWidth + 'px;height:auto}.caption{border-top:1px solid #E6E9EF;padding:10px 16px;color:#5A6478;font-size:12px}'
    + '.footer{position:absolute;bottom:32px;left:80px;right:80px;display:flex;justify-content:space-between;font-size:12px;color:#5A6478}';
  return '<!doctype html><html lang="ko"><meta charset="utf-8"><style>' + css + '</style><div class="brand"><img alt="" src="' + logo + '">취준일기</div>'
    + '<main class="layout"><section><div class="label">' + slide.label + '</div><h1 class="title">' + slide.title + '</h1><p class="description">' + slide.text + '</p><p class="note">' + slide.note + '</p></section>'
    + '<div class="frame"><img alt="실제 화면 예시" src="' + data(slide.raw) + '"><div class="caption">' + slide.caption + '</div></div></main>'
    + '<footer class="footer"><span>취준일기 Chrome 확장 프로그램</span><span>화면 속 회사·지원 정보는 모두 예시입니다</span></footer></html>';
}
function guide(site, name, location) {
  const css = baseCss + 'body{padding:28px 40px;width:1120px;height:760px}h1{font-size:28px;font-weight:700;letter-spacing:-.02em;margin:12px 0 16px}'
    + '.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;font-size:14px;margin-bottom:16px}.steps>div{border-radius:12px;background:#FFFFFF;padding:14px 16px}.steps b{color:#3461D1;margin-right:8px}'
    + '.browser{border-radius:16px;background:#FFFFFF;overflow:hidden;box-shadow:0 8px 24px rgba(27,34,48,.06)}'
    + '.bar{height:40px;border-bottom:1px solid #E6E9EF;padding:11px 20px;font-size:12px;color:#5A6478;display:flex;justify-content:space-between}.bar strong{color:#3461D1}'
    + '.scene{display:grid;grid-template-columns:1fr 240px;gap:24px;padding:20px 24px}.page h2{font-size:18px;margin:0 0 12px}.page p{font-size:13px;color:#5A6478;margin:0 0 8px}'
    + '.row{display:grid;grid-template-columns:100px 1fr 80px;gap:8px;padding:14px 0;border-bottom:1px solid #E6E9EF;font-size:13px}'
    + '.popup img{display:block;width:240px;border-radius:12px;box-shadow:0 4px 16px rgba(27,34,48,.08)}footer{font-size:12px;color:#5A6478;margin-top:14px;line-height:1.8}';
  return '<!doctype html><html lang="ko"><meta charset="utf-8"><style>' + css + '</style><div class="brand"><img alt="" src="' + logo + '">취준일기 · 수집 위치 안내</div>'
    + '<h1>' + name + '에서 지원내역 수집하기</h1><div class="steps"><div><b>01</b>' + location + ' 열기</div><div><b>02</b>툴바에서 취준일기 열기</div><div><b>03</b>지원내역 수집하기 누르기</div></div>'
    + '<div class="browser"><div class="bar"><span>사이트 영역은 사용 방법을 설명하는 예시입니다.</span><strong>취준일기 확장 →</strong></div><div class="scene"><section class="page"><h2>' + location + '</h2>'
    + '<p>로그인한 뒤 지원현황 페이지에서 확장을 열어 주세요.</p><div class="row"><span>지원일</span><span>회사 · 공고명</span><span>상태</span></div>'
    + '<div class="row"><span>2026.11.01</span><span>가상회사 01 · 프론트엔드 개발자</span><span>지원완료</span></div><div class="row"><span>2026.10.30</span><span>가상회사 02 · 백엔드 개발자</span><span>지원완료</span></div></section>'
    + '<div class="popup"><img alt="실제 팝업" src="' + data('popup-empty-' + site) + '"></div></div></div>'
    + '<footer>왼쪽 사이트 영역은 실제 로그인 화면이 아닌 안내 도식이며, 회사·지원 정보는 모두 예시입니다.<br>오른쪽 팝업은 실제 확장에서 직접 촬영했습니다.</footer></html>';
}
async function main() {
  const chromium = await loadBrowser(); const browser = await chromium.launch({ ...browserOptions(), headless: true });
  const manifest = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await page.route('**/*', route => { throw new Error('외부 요청이 없는 문서 이미지여야 합니다: ' + new URL(route.request().url()).origin); });
    for (const slide of slides) {
      await page.setContent(html(slide));
      await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map(img => img.decode())]));
      const bounds = await page.locator('.frame').boundingBox(); assert(bounds.y >= 70 && bounds.y + bounds.height < 760, '소개 이미지 잘림 없음: ' + slide.out);
      await page.screenshot({ path: path.join(output, slide.out) }); manifest.push({ file: slide.out, width: 1280, height: 800 });
    }
    await page.setViewportSize({ width: 1120, height: 760 });
    for (const [site, name, location] of [['saramin','사람인','입사지원 현황'],['jobkorea','잡코리아','입사지원 현황'],['wanted','원티드','지원 현황']]) {
      await page.setContent(guide(site, name, location));
      await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map(img => img.decode())]));
      const height = await page.evaluate(() => document.documentElement.scrollHeight); assert(height <= 760, '안내 도식 높이 ' + height + 'px: ' + site);
      const file = 'guide-' + site + '.png'; await page.screenshot({ path: path.join(base, 'usage-guides', file) }); manifest.push({ file: '../usage-guides/' + file, width: 1120, height: 760 });
    }
    fs.writeFileSync(path.join(output,'render-manifest.json'),JSON.stringify({ renderedAt: new Date().toISOString(), exampleData: true, files: manifest },null,2)+'\n');
    console.log(JSON.stringify(manifest,null,2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
