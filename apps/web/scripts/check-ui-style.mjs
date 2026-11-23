import fs from 'node:fs';
import path from 'node:path';

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(filename) : [filename];
  });
}

// docs/DESIGN_SYSTEM.md의 합의된 규칙만 검사한다. SVG 좌표와 반응형 비율은 대상이 아니다.
const rules = [
  [/\b(?:(?:min-|max-)?[wh]|size|[mp][trblxyse]?|gap(?:-[xy])?|space-[xy]|top|bottom|left|right|inset(?:-[xy])?)-\d+\.\d+\b/, '간격·크기는 정수 Tailwind 단위를 사용하세요.'],
  [/\b(?:(?:min-|max-)?[wh]|size|[mp][trblxyse]?|gap(?:-[xy])?|space-[xy]|top|bottom|left|right|inset(?:-[xy])?)-\[\d+(?:\.\d+)?(?:px|rem)\]/, '임의 픽셀 크기 대신 정수 Tailwind 단위를 사용하세요.'],
  [/\b(?:text|rounded(?:-[a-z]+)?|border)-\[\d+(?:\.\d+)?(?:px|rem)\]/, '글자·모서리·테두리는 디자인 토큰을 사용하세요.'],
  [/<(?:svg|path)\b/, 'SVG는 public/icons 파일과 공통 Icon을 사용하세요.'],
  [/\b(?:bg|text|border|fill|stroke)-\[#[\da-fA-F]+\]/, '색상은 디자인 토큰을 사용하세요.'],
  // 디자인 시스템 글자 7단계(display·title-1~3·body·label·caption)만 쓴다 (#200).
  [/\btext-(?:xs|sm|base|lg|xl|[2-9]xl)\b/, '글자 크기는 디자인 시스템 단계(text-display~text-caption)를 사용하세요.'],
];

// 예전 토큰 이름 (#200에서 새 값으로 연결, #206에서 설정에서 지움). 설정에 없는 이름은 Tailwind가 조용히 CSS를 만들지 않아
// 화면이 깨져도 빌드는 통과하므로 여기서 실패로 막는다(#206, 645곳 → 0곳).
// 클래스 이름 전체만 센다. \b로 시작하면 새 이름 text-text-brand 안의 text-brand도 예전 이름으로 잘못 센다(#201).
const LEGACY_TOKEN = /(?<![\w-])(?:text-legacy-(?:body|label|caption)|text-(?:heading-(?:xl|lg|md)|small|card-company|badge|lead|diary-[a-z]+|illustration-[a-z]+)|(?:bg|text|border|outline|ring|fill|stroke|from|via|to)-(?:brand(?:-[a-z0-9]+)*|status-[a-z-]+|platform-[a-z-]+|highlight-[a-z]+|column|card|raised|card-border|border-strong|on-brand|heat-\d|text-muted|overlay|event-(?:interview|deadline)-(?:tint|text))|rounded-(?:card|section)|shadow-(?:card|float)|animate-mark)\b/g;

// 데이터로 모양이 정해지는 차트(도넛 등)는 아이콘 파일로 만들 수 없어 src/components/charts/에서만 SVG 작성을 허용한다.
// 색은 여전히 토큰 클래스만 쓴다(HEX 규칙은 그대로 적용).
const SVG_RULE = rules[3];
const chartDirectory = path.join('src', 'components', 'charts') + path.sep;

let failures = 0;
for (const filename of listFiles('src').filter((file) => /\.(tsx|ts)$/.test(file))) {
  const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
  const fileRules = filename.startsWith(chartDirectory) ? rules.filter((rule) => rule !== SVG_RULE) : rules;
  lines.forEach((line, index) => {
    for (const legacy of line.match(LEGACY_TOKEN) ?? []) {
      console.error(`${filename}:${index + 1}: 예전 토큰 ${legacy}은 지웠어요. docs/DESIGN_SYSTEM.md의 새 이름을 쓰세요.`);
      failures += 1;
    }
    for (const [pattern, message] of fileRules) {
      if (pattern.test(line)) {
        console.error(`${filename}:${index + 1}: ${message}`);
        failures += 1;
      }
    }
  });
}
if (failures) process.exitCode = 1;
else console.log('UI 스타일 규칙 검사 통과');
