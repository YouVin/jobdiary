import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { OG_IMAGE } from '@/lib/siteMetadata';
import tailwindConfig from '../../tailwind.config';

// 링크 미리보기 카드 (#288). 쓰레드·카카오톡 등에 주소를 붙이면 뜨는 1200×630 이미지.
// 모든 페이지가 같이 쓰고, 요청할 때가 아니라 빌드 때 한 번 만든다. 색은 디자인 시스템 토큰(tailwind.config.ts) 값을 그대로 쓴다.
// 오른쪽 카드 숫자는 홈 "지금까지 지나온 단계"를 본뜬 예시다.
// 크기·대체 글은 공개 페이지 메타데이터(OG_IMAGE)와 같은 값을 쓴다
export const alt = OG_IMAGE.alt;
export const size = { width: OG_IMAGE.width, height: OG_IMAGE.height };
export const contentType = 'image/png';

type Colors = Record<string, string | Record<string, string>>;
const colors = (tailwindConfig.theme?.extend?.colors ?? {}) as Colors;
const color = (name: string, shade?: string): string => {
  const value = colors[name];
  return typeof value === 'string' ? value : (value?.[shade ?? 'DEFAULT'] ?? '');
};

const FUNNEL = [
  { label: '지원', value: 45, stage: 'applied' },
  { label: '서류 통과', value: 20, stage: 'screening' },
  { label: '면접', value: 15, stage: 'interview' },
  { label: '합격', value: 5, stage: 'offer' },
];

export default async function OpengraphImage() {
  // 빌드는 apps/web에서 돈다. 글꼴은 저장소 맨 위 node_modules(워크스페이스)에 있다.
  const fontDir = join(process.cwd(), '../../node_modules/pretendard/dist/public/static');
  const [bold, semibold, logo] = await Promise.all([
    readFile(join(fontDir, 'Pretendard-Bold.otf')),
    readFile(join(fontDir, 'Pretendard-SemiBold.otf')),
    readFile(join(process.cwd(), 'public/brand/logo-full.svg')),
  ]);
  const logoSrc = `data:image/svg+xml;base64,${logo.toString('base64')}`;
  const max = FUNNEL[0].value;

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', padding: 72, gap: 56, background: color('page'), fontFamily: 'Pretendard' }}>
        {/* ── 왼쪽: 로고 → 한 줄 소개 → 지원 사이트 → 주소 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse 안에서는 일반 img만 쓴다 */}
          <img src={logoSrc} width={176} height={52} alt="" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: 60, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.02em', color: color('text', 'primary') }}>
              <span>여기저기 지원한 회사,</span>
              <span style={{ color: color('text', 'brand') }}>취준일기 한곳에 모아요</span>
            </div>
            <span style={{ fontSize: 28, fontWeight: 600, color: color('text', 'secondary') }}>사람인 · 잡코리아 · 원티드 지원 내역을 날짜별로</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ display: 'flex', padding: '8px 18px', borderRadius: 999, background: color('selected'), color: color('text', 'brand-strong'), fontSize: 24, fontWeight: 700 }}>무료</span>
            <span style={{ fontSize: 26, fontWeight: 600, color: color('text', 'secondary') }}>jobdiary.vercel.app</span>
          </div>
        </div>

        {/* ── 오른쪽: 지나온 단계 카드 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: 400, padding: 40, gap: 28, borderRadius: 32, background: color('surface') }}>
          <span style={{ fontSize: 24, fontWeight: 600, color: color('text', 'secondary') }}>지금까지 지나온 단계</span>
          {FUNNEL.map((step) => (
            <div key={step.label} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, fontWeight: 700, color: color('text', 'primary') }}>
                <span>{step.label}</span>
                <span>{step.value}</span>
              </div>
              <div style={{ display: 'flex', height: 14, borderRadius: 999, background: color('chart', 'empty') }}>
                <div style={{ display: 'flex', width: `${(step.value / max) * 100}%`, borderRadius: 999, background: color('stage', step.stage) }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Pretendard', data: bold, weight: 700, style: 'normal' },
        { name: 'Pretendard', data: semibold, weight: 600, style: 'normal' },
      ],
    },
  );
}
