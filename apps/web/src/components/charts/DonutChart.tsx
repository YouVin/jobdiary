import { clsx } from 'clsx';

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  strokeClass: string; // 토큰 stroke 클래스 (예: stroke-platform-saramin-chart)
}

interface DonutChartProps {
  segments: DonutSegment[];
  activeKey: string | null;
  onActiveChange: (key: string | null) => void;
  label: string; // 차트 전체의 접근성 이름
  children?: React.ReactNode; // 가운데 표시
}

// 원티드 조각은 공식 아이콘처럼 파랑→분홍→주황 그라데이션으로 칠한다(#193). 도넛은 한 화면에 하나라 id를 고정한다.
const WANTED_GRADIENT_ID = 'jd-platform-wanted-gradient';
export const WANTED_GRADIENT_STROKE = 'stroke-[url(#jd-platform-wanted-gradient)]';

// 도넛 좌표. viewBox 기준 값이며 실제 크기는 부모(h-42 w-42 등)가 정한다.
const SIZE = 168;
const RADIUS = 70;
const THICKNESS = 16;
const GAP = 3; // 조각 사이 바탕색 간격
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// 0인 조각은 그리지 않는다. 조각이 하나뿐이면 간격 없이 한 바퀴를 채운다.
export function DonutChart({ segments, activeKey, onActiveChange, label, children }: DonutChartProps) {
  const visible = segments.filter((segment) => segment.value > 0);
  const total = visible.reduce((sum, segment) => sum + segment.value, 0);
  const gap = visible.length > 1 ? GAP : 0;
  // 각 조각의 시작 위치(앞 조각 길이의 누적)를 렌더 전에 계산한다.
  const arcs: { segment: DonutSegment; drawn: number; start: number }[] = [];
  let start = 0;
  for (const segment of visible) {
    const length = (segment.value / total) * CIRCUMFERENCE;
    arcs.push({ segment, drawn: Math.max(length - gap, 1), start });
    start += length;
  }

  return (
    <div className="relative h-42 w-42 shrink-0">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label} className="block h-full w-full">
        <defs>
          <linearGradient id={WANTED_GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" className="[stop-color:theme(colors.platform.wanted.chart)]" />
            <stop offset="0.5" className="[stop-color:theme(colors.platform.wanted.mid)]" />
            <stop offset="1" className="[stop-color:theme(colors.platform.wanted.end)]" />
          </linearGradient>
        </defs>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={THICKNESS} className="stroke-column" />
        {arcs.map(({ segment, drawn, start: arcStart }) => {
          const dashOffset = -arcStart;
          return (
            <circle
              key={segment.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={THICKNESS}
              strokeDasharray={`${drawn} ${CIRCUMFERENCE - drawn}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              onMouseEnter={() => onActiveChange(segment.key)}
              onMouseLeave={() => onActiveChange(null)}
              className={clsx(
                'transition-opacity motion-reduce:transition-none',
                segment.strokeClass,
                activeKey !== null && activeKey !== segment.key && 'opacity-30',
              )}
            >
              <title>{`${segment.label} ${segment.value}건`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
