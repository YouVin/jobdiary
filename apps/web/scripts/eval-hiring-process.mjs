// 전형 절차 AI 실측 (#295). 공고 화면 이미지(.eval/process/*.png, 커밋하지 않는 폴더)로 지시문을 확인한다.
// 실행 (apps/web에서): node scripts/eval-hiring-process.mjs        → 입력 토큰만(무료 count_tokens)
//                    node scripts/eval-hiring-process.mjs --run  → 실제 호출(유료, 1장 약 0.3원). 지시문을 바꾸면 다시 돌린다
// 키: apps/web/.env.local의 ANTHROPIC_API_KEY (출력하지 않음)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { createSourceLoader } from '../tests/loadSource.mjs';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(webRoot);
const shared = createSourceLoader()('../../supabase/functions/_shared/hiringProcess/process.ts');
const keyLine = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*ANTHROPIC_API_KEY\s*=\s*"?([^"\s]+)"?/)).find(Boolean);
if (!keyLine) throw new Error('apps/web/.env.local에 ANTHROPIC_API_KEY가 없어요.');
const client = new Anthropic({ apiKey: keyLine[1] });
const run = process.argv.includes('--run');
const dir = path.join('.eval', 'process');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((file) => /\.(png|jpe?g)$/i.test(file)).sort() : [];
if (files.length === 0) console.log('.eval/process에 공고 화면 이미지(png·jpg)를 넣어 주세요.');

let totalUsd = 0;
for (const file of files) {
  const mediaType = file.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  const request = shared.buildProcessRequest({ text: '', images: [{ mediaType, data: fs.readFileSync(path.join(dir, file)).toString('base64') }] });
  if (!run) {
    const { input_tokens: inputTokens } = await client.messages.countTokens({ model: request.model, system: request.system, messages: request.messages, output_config: request.output_config });
    console.log(file, '입력', inputTokens);
    continue;
  }
  const started = Date.now();
  const response = await client.messages.create(request);
  const text = response.content.find((block) => block.type === 'text')?.text ?? '{}';
  const steps = shared.normalizeProcess(JSON.parse(text));
  const usd = shared.estimateProcessCostUsd(response.usage);
  totalUsd += usd;
  console.log(file, `${((Date.now() - started) / 1000).toFixed(1)}초`, `입력 ${response.usage.input_tokens} 출력 ${response.usage.output_tokens}`, `${(usd * 1400).toFixed(2)}원`, '|', steps.map((step) => `${step.name}(${step.kind})`).join(' → ') || '(없음)');
}
if (run && files.length > 0) console.log('합계', `${(totalUsd * 1400).toFixed(2)}원`);
