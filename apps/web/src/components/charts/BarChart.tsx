import { clsx } from 'clsx';

// 디자인 시스템 막대그래프 (#201). 강조 막대 하나만 chart-1, 나머지는 chart-rest.
// 막대 폭 최대 24, 위쪽 모서리 4, 0은 바닥에 얇은 선. 막대 위에 값, 아래에 축 이름(12).
// 그래프 위에는 화면 쪽에서 한 줄 요약을 둔다. 스크린리더는 label(모든 값)을 읽는다.
export interface BarDatum {
  key: string;
  label: string; // 축 이름 (예: 11.16, 이번 주)
  value: number;
  isHighlighted?: boolean;
}

interface BarChartProps {
  label: string; // 예: "최근 8주 주간 지원 수: 10.5 8곳, …"
  bars: BarDatum[];
  heightClass?: string; // 막대 영역 높이 (기본 h-40)
  className?: string;
}

export function BarChart({ label, bars, heightClass = 'h-40', className }: BarChartProps) {
  const max = Math.max(...bars.map((bar) => bar.value), 1);
  const columns = { gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` };

  return (
    <div role="img" aria-label={label} className={clsx('flex flex-col gap-2', className)}>
      <div className={clsx('grid items-end gap-2 border-b border-line-divider', heightClass)} style={columns}>
        {bars.map((bar) => (
          <div key={bar.key} className="flex h-full flex-col items-center justify-end gap-1">
            <span className={clsx('text-caption tabular-nums', bar.isHighlighted ? 'text-text-brand' : 'font-normal text-text-secondary')}>
              {bar.value}
            </span>
            {bar.value > 0 ? (
              // 막대 높이는 데이터로 정해지는 값이라 inline style로 준다. 위 값 글자 자리(24px)를 뺀 높이 안에서 비율을 잡는다.
              <span
                className={clsx('w-full max-w-6 rounded-t-xs', bar.isHighlighted ? 'bg-chart-1' : 'bg-chart-rest')}
                style={{ height: `calc((100% - 1.5rem) * ${bar.value / max})` }}
              />
            ) : (
              <span className="h-px w-full max-w-6 bg-chart-rest" />
            )}
          </div>
        ))}
      </div>
      <div className="grid gap-2 text-center text-caption font-normal text-text-secondary tabular-nums" style={columns}>
        {bars.map((bar) => (
          <span key={bar.key} className={clsx(bar.isHighlighted && 'font-semibold text-text-brand-strong')}>
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}
