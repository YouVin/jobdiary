import { clsx } from 'clsx';

// 디자인 시스템 비율 막대 (#201). 높이 12, 알약 모양, 조각 사이 2. 단계 비율·진행률에 쓴다.
// 강조는 chart-1 하나, 나머지는 chart-2 → chart-3 → chart-rest로 옅게. 빈 부분은 chart-empty.
// 스크린리더는 막대 대신 label(값을 모두 담은 문장)을 읽는다. 옆이나 아래에 글자 범례를 함께 둔다.
export interface RatioSegment {
  key: string;
  value: number;
  colorClass: string; // bg-chart-1 같은 토큰 클래스
}

interface RatioBarProps {
  label: string; // 예: "진행 중 9건: 지원 완료 9, 서류 통과 0, 면접 0"
  segments: RatioSegment[];
  total?: number; // 주면 남은 부분을 빈 칸으로 둔다
  className?: string;
}

export function RatioBar({ label, segments, total, className }: RatioBarProps) {
  const filled = segments.reduce((sum, segment) => sum + segment.value, 0);
  const rest = total !== undefined ? Math.max(total - filled, 0) : 0;
  return (
    <div role="img" aria-label={label} className={clsx('flex h-3 gap-px overflow-hidden rounded-full bg-chart-empty', className)}>
      {segments
        .filter((segment) => segment.value > 0)
        .map((segment) => (
          // 조각 길이는 데이터로 정해지는 값이라 inline style로 준다.
          <span key={segment.key} className={segment.colorClass} style={{ flexGrow: segment.value }} />
        ))}
      {rest > 0 && <span style={{ flexGrow: rest }} />}
    </div>
  );
}
