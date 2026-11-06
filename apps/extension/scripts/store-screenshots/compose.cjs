// 브라우저로 GitHub용 소개 이미지와 사용 방법 도식을 렌더링한다. 원본 UI는 capture.cjs 결과다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, loadBrowser, browserOptions } = require('./browser.cjs');
const base = path.join(root, 'apps/extension/docs');
const output = path.join(base, 'store-screenshots');
const raw = path.join(output, 'raw');
const data = file => 'data:image/png;base64,' + fs.readFileSync(path.join(raw, file + '.png')).toString('base64');
const slides = [
  { out: '1-overview.png', raw: 'popup-collected', label: '01 / 지원내역 수집', title: '지원 기록을<br>한곳에 모으세요.', text: '사람인·잡코리아·원티드의 지원내역을 수집하고<br>취준일기 웹앱으로 가져옵니다.', note: '수집 → 확인 → 취준일기로 가져오기' },
  { out: '2-copy.png', raw: 'popup-copied', label: '02 / 전체 복사', title: '모아둔 지원내역을<br>표로 복사하세요.', text: '텍스트와 HTML 표를 함께 복사해<br>원하는 문서나 스프레드시트에 정리할 수 있어요.', note: '실제 UI · 예시 데이터 · 클립보드 어댑터 모의 처리' },
  { out: '3-start.png', raw: 'popup-empty', label: '03 / 시작하기', title: '지원현황을 열고,<br>수집 버튼 한 번.', text: '로그인한 지원현황 페이지에서 시작하세요.<br>아이디나 비밀번호를 입력받지 않아요.', note: '수집은 사용자가 버튼을 눌렀을 때 실행됩니다.' },
  { out: '4-sites.png', raw: 'popup-collected', label: '04 / 세 사이트, 한 기록', title: '사이트는 달라도<br>지원 기록은 함께.', text: '사람인 5건 · 잡코리아 7건 · 원티드 3건<br>같은 사이트를 다시 수집하면 그 슬롯만 교체해요.', note: '세 사이트 수집 지원 · 표시 기능의 지원 범위와는 별개입니다.' },
  { out: '5-history.png', raw: 'history-site', label: '05 / 지원 이력 자동 표시', title: '지원했던 공고,<br>한눈에 확인.', text: '웹앱 이력과 정확한 공고 ID가 일치하면<br>지원·지원취소 이력을 표시합니다.', note: '잡코리아·사람인 지원 · 원티드 자동 표시는 보류', wide: true },
];
function html(slide) {
  return '<!doctype html><html lang="ko"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:1280px;height:800px;background:#f4f4f2;color:#18181b;font-family:"Malgun Gothic",system-ui,sans-serif}.brand{position:absolute;left:80px;top:46px;font-size:13px;letter-spacing:3px}.layout{display:grid;grid-template-columns:' + (slide.wide ? '370px 680px' : '1fr 400px') + ';gap:' + (slide.wide ? '30px' : '64px') + ';align-items:center;height:100%;padding:96px 80px 88px}.label{font-size:13px;color:#52525b;letter-spacing:1px}.title{font-size:' + (slide.wide ? '42px' : '48px') + ';font-weight:600;line-height:1.4;letter-spacing:-2px;margin:22px 0}.description{font-size:18px;line-height:1.9;color:#52525b;letter-spacing:-.5px}.note{font-size:12px;color:#52525b;line-height:1.7;border-top:1px solid #b8b8b5;padding-top:18px;margin-top:28px}.frame{justify-self:center;background:white;border:1px solid #d4d4d2;border-radius:12px;overflow:hidden;box-shadow:0 12px 30px #0000000b}.frame img{display:block;width:' + (slide.wide ? '680px' : '360px') + ';height:auto}.caption{border-top:1px solid #e4e4e2;padding:10px 14px;color:#52525b;font-size:11px}.footer{position:absolute;bottom:32px;left:80px;right:80px;display:flex;justify-content:space-between;font-size:11px;color:#52525b}</style><div class="brand">JOBDIARY / 취준일기</div><main class="layout"><section><div class="label">' + slide.label + '</div><h1 class="title">' + slide.title + '</h1><p class="description">' + slide.text + '</p><p class="note">' + slide.note + '</p></section><div class="frame"><img alt="실제 확장 UI 예시" src="' + data(slide.raw) + '"><div class="caption">' + (slide.wide ? '예시 사이트 구성 + 실제 확장 배지' : '현재 개발 버전의 실제 팝업') + '</div></div></main><footer class="footer"><span>Chrome Extension · Manifest V3 · React · TypeScript</span><span>개발 화면 · 예시 데이터 · 스토어 게시 전</span></footer></html>';
}
function guide(site, name, location) {
  return '<!doctype html><html lang="ko"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#f4f4f2;color:#18181b;font-family:"Malgun Gothic",system-ui,sans-serif;padding:32px 40px;width:1120px;height:760px}.eyebrow{font-size:11px;letter-spacing:2px;color:#52525b}h1{font-size:28px;letter-spacing:-1px;margin:12px 0 20px}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;font-size:12px;margin-bottom:22px}.steps>div{border:1px solid #cfcfcd;border-radius:6px;background:white;padding:12px}.steps b{margin-right:8px}.browser{border:1px solid #cfcfcd;border-radius:10px;background:white;overflow:hidden}.bar{height:38px;border-bottom:1px solid #dedee2;padding:10px 20px;font-size:11px;color:#52525b;display:flex;justify-content:space-between}.scene{display:grid;grid-template-columns:1fr 280px;gap:24px;padding:24px}.page h2{font-size:18px;margin:0 0 20px}.page p{font-size:12px;color:#52525b}.row{display:grid;grid-template-columns:100px 1fr 80px;gap:8px;padding:20px 0;border-bottom:1px solid #dedee2;font-size:12px}.popup img{display:block;width:280px;border:1px solid #dedee2;border-radius:6px}footer{font-size:11px;color:#52525b;margin-top:14px;line-height:1.8}</style><p class="eyebrow">JOBDIARY / 수집 위치 안내</p><h1>' + name + '에서 지원내역 수집하기</h1><div class="steps"><div><b>01</b>' + location + ' 열기</div><div><b>02</b>툴바에서 취준일기 열기</div><div><b>03</b>지원내역 수집하기 클릭</div></div><div class="browser"><div class="bar"><span>사이트 영역은 사용 방법을 설명하는 예시입니다.</span><strong>취준일기 확장 →</strong></div><div class="scene"><section class="page"><h2>' + location + '</h2><p>로그인한 뒤 지원현황 페이지에서 확장을 열어 주세요.</p><div class="row"><span>지원일</span><span>회사 · 공고명</span><span>상태</span></div><div class="row"><span>2026.11.01</span><span>가상회사 01 · 프론트엔드 개발자</span><span>지원완료</span></div><div class="row"><span>2026.10.30</span><span>가상회사 02 · 백엔드 개발자</span><span>지원완료</span></div></section><div class="popup"><img alt="현재 개발 팝업" src="' + data('popup-empty-' + site) + '"></div></div></div><footer>왼쪽 사이트 영역은 실제 로그인 화면이 아닌 안내 도식이며, 회사·지원 정보는 모두 예시입니다.<br>오른쪽 팝업은 현재 개발 확장에서 직접 촬영했습니다.</footer></html>';
}
async function main() {
  const chromium = await loadBrowser(); const browser = await chromium.launch({ ...browserOptions(), headless: true });
  const manifest = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await page.route('**/*', route => { throw new Error('외부 요청이 없는 문서 이미지여야 합니다: ' + new URL(route.request().url()).origin); });
    for (const slide of slides) {
      await page.setContent(html(slide));
      await page.locator('img').evaluate(img => img.decode());
      const bounds = await page.locator('.frame').boundingBox(); assert(bounds.y >= 70 && bounds.y + bounds.height < 744, '소개 이미지 잘림 없음');
      await page.screenshot({ path: path.join(output, slide.out) }); manifest.push({ file: slide.out, width: 1280, height: 800 });
    }
    await page.setViewportSize({ width: 1120, height: 760 });
    for (const [site, name, location] of [['saramin','사람인','입사지원 현황'],['jobkorea','잡코리아','입사지원 현황'],['wanted','원티드','지원 현황']]) {
      await page.setContent(guide(site, name, location)); await page.locator('img').evaluate(img => img.decode());
      assert(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight));
      const file = 'guide-' + site + '.png'; await page.screenshot({ path: path.join(base, 'usage-guides', file) }); manifest.push({ file: '../usage-guides/' + file, width: 1120, height: 760 });
    }
    fs.writeFileSync(path.join(output,'render-manifest.json'),JSON.stringify({ renderedAt: new Date().toISOString(), exampleData: true, files: manifest },null,2)+'\n');
    console.log(JSON.stringify(manifest,null,2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
