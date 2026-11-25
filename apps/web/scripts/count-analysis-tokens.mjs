// 회사 정보 AI 요청의 입력 토큰을 부분별로 센다 (#260). 무료 count_tokens만 부른다(모델 실행·비용 없음).
//
// 실행 (apps/web에서): node scripts/count-analysis-tokens.mjs [--json]
//   공고: .eval/postings/*.txt (커밋하지 않는 폴더). 없으면 저장소의 예시 공고 한 건.
//   키: apps/web/.env.local의 ANTHROPIC_API_KEY (출력하지 않음)
//
// 부분은 차이로 구한다.
//   결과 형식(스키마) = 전체 − 형식 없이
//   공고·회사 자료(postingTokens) = 형식 없이 − 지시문 + 한 글자 메시지
//   지시문              = 지시문 + 한 글자 메시지 (메시지 틀 몇 토큰 포함)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { createSourceLoader } from '../tests/loadSource.mjs';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(webRoot);
const analysis = createSourceLoader()('../../supabase/functions/_shared/postingAnalysis/analysis.ts');
const MODEL = 'claude-haiku-5-5';

function readApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const envPath = path.join(webRoot, '.env.local');
  if (!fs.existsSync(envPath)) return null;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*ANTHROPIC_API_KEY\s*=\s*"?([^"\s]+)"?\s*$/);
    if (match) return match[1];
  }
  return null;
}

// 공고 읽기: 측정용 공고가 있으면 그것, 없으면 예시 한 건
function readPostings() {
  const dir = path.join(webRoot, '.eval', 'postings');
  const postings = [];
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir).filter((name) => /(?<!\.home)\.txt$/.test(name))) {
      const name = file.replace(/\.txt$/, '');
      const factsPath = path.join(dir, `${name}.facts.json`);
      const homePath = path.join(dir, `${name}.home.txt`);
      postings.push({
        name,
        input: {
          companyName: name.replace(/_.*$/, ''),
          postingText: fs.readFileSync(path.join(dir, file), 'utf8'),
          facts: fs.existsSync(factsPath) ? JSON.parse(fs.readFileSync(factsPath, 'utf8')) : undefined,
          homepageText: fs.existsSync(homePath) ? fs.readFileSync(homePath, 'utf8') : undefined,
        },
      });
    }
  }
  if (postings.length === 0) {
    postings.push({
      name: '예시 공고',
      input: {
        companyName: '가상회사',
        postingText: '[주요업무]\n- React로 사용자 화면을 만들어요\n[자격요건]\n- 다양한 직군의 동료와 원활하게 소통하는 분\n- 맡은 기능을 기획부터 배포까지 책임지고 완수해 본 경험\n[근무조건]\n- 서울 서초구 동산로 13, 주 5일(월~금) 10:00~19:00',
      },
    });
  }
  return postings;
}

const apiKey = readApiKey();
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY가 없습니다(apps/web/.env.local). 토큰 세기는 무료지만 키가 필요합니다.');
  process.exit(1);
}
const client = new Anthropic({ apiKey });
const count = async (body) => (await client.messages.countTokens({ model: MODEL, ...body })).input_tokens;

// 글 공고(공고 페이지 글 포함)와 이미지 공고 형식을 각각 센다. 이미지 자체 토큰은 빼고 형식·지시문만 비교한다.
async function measure(input, source) {
  const request = analysis.buildAnalysisRequest(MODEL, 'lean', input);
  const system = analysis.buildSystemPrompt('lean', source);
  const schema = source === 'image' ? analysis.IMAGE_ANALYSIS_SCHEMA : analysis.ANALYSIS_SCHEMA;
  const messages = request.messages;
  const format = { format: { type: 'json_schema', schema } };
  const total = await count({ system, messages, output_config: format });
  const withoutFormat = await count({ system, messages });
  const systemOnly = await count({ system, messages: [{ role: 'user', content: '.' }] });
  return {
    total,
    schema: total - withoutFormat,
    postingTokens: withoutFormat - systemOnly,
    system: systemOnly,
    schemaChars: JSON.stringify(schema).length,
    systemChars: system.length,
  };
}

const rows = [];
for (const posting of readPostings()) {
  rows.push({ posting: posting.name, source: 'text', ...(await measure(posting.input, 'text')) });
  rows.push({ posting: posting.name, source: 'image', ...(await measure(posting.input, 'image')) });
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log('공고 | 형식 | 전체 | 결과 형식 | 지시문 | 공고·자료 | 결과 형식 비율');
  for (const row of rows) {
    const share = ((row.schema / row.total) * 100).toFixed(1);
    console.log(`${row.posting} | ${row.source} | ${row.total} | ${row.schema} | ${row.system} | ${row.postingTokens} | ${share}%`);
  }
}
