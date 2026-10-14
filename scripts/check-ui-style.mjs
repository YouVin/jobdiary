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
];

let failures = 0;
for (const filename of listFiles('src').filter((file) => /\.(tsx|ts)$/.test(file))) {
  const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const [pattern, message] of rules) {
      if (pattern.test(line)) {
        console.error(`${filename}:${index + 1}: ${message}`);
        failures += 1;
      }
    }
  });
}
if (failures) process.exitCode = 1;
else console.log('UI 스타일 규칙 검사 통과');
