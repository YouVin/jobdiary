// 공고 분석 비용·품질 실측 (#226, 결정 기록 docs/decisions/001-posting-analysis-model.md).
//
// 준비 (커밋하지 않는 폴더 apps/web/.eval/):
//   .eval/postings/회사이름.txt        공고 본문 (필수, 파일 이름이 회사 이름)
//   .eval/postings/회사이름.facts.json  공고 기업정보 등 회사 자료 (선택, {"직원수": 18, ...})
//   .eval/postings/회사이름.home.txt    홈페이지 본문 (선택)
//   apps/web/.env.local                 ANTHROPIC_API_KEY=...
//
// 실행 (apps/web에서):
//   node scripts/eval-posting-analysis.mjs                       # 미리보기: 돈 안 듦. 키가 있으면 입력 토큰을 무료 API로 셈
//   node scripts/eval-posting-analysis.mjs --yes                 # 실제 호출 (Haiku 5.5, baseline·lean)
//   node scripts/eval-posting-analysis.mjs --yes --models haiku,sonnet,opus --repeat 2 --limit 3
//
// 결과: .eval/results/<시각>.json (전체 기록), <시각>-review.md (강점 연결이 맞는지 사람이 표시하는 표)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { createSourceLoader } from '../tests/loadSource.mjs';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(webRoot);
const load = createSourceLoader();
const { buildAnalysisRequest, verifyQuotes, estimateCostUsd, MODEL_PRICES, MAX_OUTPUT_TOKENS, USD_TO_KRW } = load('../../supabase/functions/_shared/postingAnalysis/analysis.ts');

const MODEL_IDS = { haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5', opus: 'claude-opus-5-5' };
const POSTINGS_DIR = path.join(webRoot, '.eval', 'postings');
const RESULTS_DIR = path.join(webRoot, '.eval', 'results');

// ── 인자 ──
function readArgs(argv) {
  const args = { models: ['haiku'], variants: ['baseline', 'lean'], repeat: 1, limit: Infinity, yes: false };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const next = () => argv[++index];
    if (flag === '--yes') args.yes = true;
    else if (flag === '--models') args.models = next().split(',');
    else if (flag === '--variants') args.variants = next().split(',');
    else if (flag === '--repeat') args.repeat = Number(next());
    else if (flag === '--limit') args.limit = Number(next());
    else throw new Error(`모르는 인자: ${flag}`);
  }
  for (const model of args.models) if (!MODEL_IDS[model]) throw new Error(`모델은 haiku·sonnet·opus 중에서: ${model}`);
  for (const variant of args.variants) if (variant !== 'baseline' && variant !== 'lean') throw new Error(`방식은 baseline·lean: ${variant}`);
  return args;
}

// .env.local에서 키만 읽는다. 값은 출력하지 않는다.
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

function readPostings(limit) {
  if (!fs.existsSync(POSTINGS_DIR)) return [];
  const names = fs.readdirSync(POSTINGS_DIR)
    .filter((file) => file.endsWith('.txt') && !file.endsWith('.home.txt'))
    .map((file) => file.slice(0, -'.txt'.length))
    .sort((a, b) => a.localeCompare(b, 'ko'));
  const postings = [];
  for (const name of names.slice(0, limit)) {
    const factsPath = path.join(POSTINGS_DIR, `${name}.facts.json`);
    const homePath = path.join(POSTINGS_DIR, `${name}.home.txt`);
    postings.push({
      companyName: name,
      postingText: fs.readFileSync(path.join(POSTINGS_DIR, `${name}.txt`), 'utf8'),
      facts: fs.existsSync(factsPath) ? JSON.parse(fs.readFileSync(factsPath, 'utf8')) : undefined,
      homepageText: fs.existsSync(homePath) ? fs.readFileSync(homePath, 'utf8') : undefined,
    });
  }
  return postings;
}

const won = (usd) => `${Math.round(usd * USD_TO_KRW).toLocaleString('ko-KR')}원`;
const average = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

// Sonnet·Opus 5.5는 안전 분류기가 거절하면 서버에서 다른 모델로 다시 돌리는 fallbacks를 켠다.
// 다른 모델이 응답하면 측정이 섞이므로 servedBy로 기록하고 요약에서 따로 센다. Haiku 5.5에는 이 기능이 없다.
async function callModel(client, request) {
  if (request.model === 'claude-haiku-5-5') return client.messages.create(request);
  return client.beta.messages.create({ ...request, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
}

function parseResult(response) {
  for (const block of response.content) {
    if (block.type === 'text') return JSON.parse(block.text);
  }
  throw new Error('text 블록이 없음');
}

async function preview(client, postings, args) {
  console.log('미리보기 (호출 비용 없음)\n');
  let maxUsd = 0;
  for (const posting of postings) {
    for (const modelKey of args.models) {
      for (const variant of args.variants) {
        const request = buildAnalysisRequest(MODEL_IDS[modelKey], variant, posting);
        const chars = request.system.length + request.messages[0].content.length;
        let inputTokens = null;
        if (client) {
          // 토큰 세기 API는 무료다(요청 수 제한만 있음). 결과 형식 스키마 토큰은 포함되지 않을 수 있다.
          const counted = await client.messages.countTokens({ model: request.model, system: request.system, messages: request.messages });
          inputTokens = counted.input_tokens;
        }
        const price = MODEL_PRICES[request.model];
        const estimatedInput = inputTokens ?? chars; // 키가 없으면 글자 수를 토큰 상한으로 본다
        const worst = (estimatedInput * price.input + MAX_OUTPUT_TOKENS * price.output) / 1_000_000;
        maxUsd += worst * args.repeat;
        console.log(`${posting.companyName} · ${modelKey} · ${variant}: 보낼 글자 ${chars.toLocaleString()}자` +
          `${inputTokens === null ? '' : ` · 입력 ${inputTokens.toLocaleString()}토큰`} · 1번 최대 ${won(worst)}`);
      }
    }
  }
  const calls = postings.length * args.models.length * args.variants.length * args.repeat;
  console.log(`\n호출 ${calls}번, 최대 비용(출력이 ${MAX_OUTPUT_TOKENS}토큰 상한까지 나온다고 볼 때) 약 $${maxUsd.toFixed(3)} (${won(maxUsd)})`);
  console.log('실제로 돌리려면 --yes를 붙이세요.');
}

async function run(client, postings, args) {
  const rows = [];
  for (const posting of postings) {
    for (const modelKey of args.models) {
      for (const variant of args.variants) {
        for (let attempt = 1; attempt <= args.repeat; attempt += 1) {
          const request = buildAnalysisRequest(MODEL_IDS[modelKey], variant, posting);
          const row = { company: posting.companyName, model: request.model, variant, attempt };
          const started = performance.now();
          try {
            const response = await callModel(client, request);
            row.seconds = (performance.now() - started) / 1000;
            row.stopReason = response.stop_reason;
            row.servedBy = response.model;
            row.usage = response.usage;
            row.costUsd = estimateCostUsd(request.model, response.usage);
            if (response.stop_reason === 'refusal') {
              row.error = `거절: ${response.stop_details?.category ?? '분류 없음'}`;
            } else {
              row.result = parseResult(response);
              row.quotes = verifyQuotes(row.result, posting.postingText);
            }
          } catch (error) {
            row.seconds = (performance.now() - started) / 1000;
            row.error = error instanceof Anthropic.APIError ? `API ${error.status}: ${error.message}` : String(error);
          }
          rows.push(row);
          const quoteText = row.quotes ? ` · 인용 ${row.quotes.verified}/${row.quotes.total}` : '';
          console.log(`${row.company} · ${modelKey} · ${variant} #${attempt}: ` +
            (row.error ? `실패 (${row.error})` : `${row.usage.input_tokens}+${row.usage.output_tokens}토큰 · ${won(row.costUsd)} · ${row.seconds.toFixed(1)}초${quoteText}`));
        }
      }
    }
  }
  return rows;
}

function summarize(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.model} · ${row.variant}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const lines = [
    '| 모델 · 방식 | 건수 | 평균 입력 | 평균 출력 | 1건 평균 비용 | 평균 응답 | 인용 정확도 | 강점 평균 | 형식 오류·실패 | 다른 모델 응답 |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const [key, group] of groups) {
    const ok = group.filter((row) => row.result);
    const quotes = ok.reduce((sum, row) => sum + row.quotes.total, 0);
    const verified = ok.reduce((sum, row) => sum + row.quotes.verified, 0);
    const cost = average(ok.map((row) => row.costUsd));
    lines.push(`| ${key} | ${group.length} | ${Math.round(average(ok.map((row) => row.usage.input_tokens)))} | ` +
      `${Math.round(average(ok.map((row) => row.usage.output_tokens)))} | $${cost.toFixed(4)} (${won(cost)}) | ` +
      `${average(ok.map((row) => row.seconds)).toFixed(1)}초 | ${quotes ? `${Math.round((verified / quotes) * 100)}% (${verified}/${quotes})` : '-'} | ` +
      `${average(ok.map((row) => row.result.strengths.length)).toFixed(1)} | ${group.length - ok.length} | ` +
      `${ok.filter((row) => row.servedBy && row.servedBy !== row.model).length} |`);
  }
  return lines.join('\n');
}

// 강점 연결이 맞는지 사람이 표시하는 표. "맞다" 칸에 O/X를 적는다.
function reviewMarkdown(rows) {
  const lines = ['# 강점 연결 검토', '', '"맞다" 칸에 O 또는 X를 적는다. 결정 기록 001 5절 기준: O 비율 80% 이상.', ''];
  for (const row of rows) {
    if (!row.result) continue;
    const { company, workplace } = row.result;
    lines.push(`## ${row.company} · ${row.model} · ${row.variant} #${row.attempt}`, '', `이 회사는: ${company.about}`, `대표 서비스: ${company.products.join(', ') || '-'} · 사이트: ${company.website || '-'}`, '');
    lines.push('| 강점 | 회사가 원하는 것 | 넣으면 좋은 경험 | 공고 인용 | 원문에 있음 | 맞다 |', '|---|---|---|---|---|---|');
    const cell = (value) => value.replace(/\|/g, '/');
    for (const item of row.result.strengths) {
      const inPosting = row.quotes.missing.includes(item.quote) ? 'X' : 'O';
      lines.push(`| ${item.strength} | ${cell(item.wants)} | ${cell(item.experiences.join(' / '))} | ${cell(item.quote)} | ${inPosting} |  |`);
    }
    lines.push('', `근무지: ${workplace.location || '-'} · 근무일: ${workplace.workDays || '-'} · 근무 시간: ${workplace.workHours || '-'}`, '');
  }
  return lines.join('\n');
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const postings = readPostings(args.limit);
  if (postings.length === 0) {
    console.log(`공고가 없습니다. ${path.relative(webRoot, POSTINGS_DIR)}/회사이름.txt 로 공고 본문을 넣어 주세요.`);
    return;
  }
  const apiKey = readApiKey();
  const client = apiKey ? new Anthropic({ apiKey }) : null;
  if (!args.yes) {
    await preview(client, postings, args);
    return;
  }
  if (!client) {
    console.log('ANTHROPIC_API_KEY가 없습니다. apps/web/.env.local에 넣어 주세요.');
    process.exitCode = 1;
    return;
  }
  const rows = await run(client, postings, args);
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(RESULTS_DIR, `${stamp}.json`), JSON.stringify(rows, null, 2));
  fs.writeFileSync(path.join(RESULTS_DIR, `${stamp}-review.md`), reviewMarkdown(rows));
  const total = rows.reduce((sum, row) => sum + (row.costUsd ?? 0), 0);
  console.log(`\n${summarize(rows)}\n\n이번 실행 비용 합계 약 $${total.toFixed(4)} (${won(total)})`);
  console.log(`기록: ${path.relative(webRoot, RESULTS_DIR)}/${stamp}.json · 검토표: ${stamp}-review.md`);
}

await main();
