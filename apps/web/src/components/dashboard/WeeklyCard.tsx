import { BarChart } from '@/components/charts/BarChart';
import { Card, CardHeader, CardSummary } from '@/components/ui/Card';
import type { WeeklyCount } from '@/utils/applicationStats';

interface WeeklyCardProps {
  weeks: WeeklyCount[]; // 오래된 주부터, 마지막이 이번 주
  style?: React.CSSProperties;
}

// 축 이름: 그 주 월요일을 "10.5"처럼, 마지막 주는 "이번 주".
function weekLabel(week: WeeklyCount): string {
  if (week.isThisWeek) return '이번 주';
  return `${Number(week.weekStart.slice(5, 7))}.${Number(week.weekStart.slice(8, 10))}`;
}

// 주간 지원 (#203): 최근 8주 막대. 이번 주에 지원했으면 이번 주를, 아직이면 지난주를 강조하고 한 줄로 말한다.
export function WeeklyCard({ weeks, style }: WeeklyCardProps) {
  const thisWeek = weeks[weeks.length - 1];
  const lastWeek = weeks[weeks.length - 2];
  const total = weeks.reduce((sum, week) => sum + week.count, 0);
  const average = Math.round(total / weeks.length);
  const focus = thisWeek.count > 0 ? thisWeek : lastWeek;

  let summary: React.ReactNode;
  let detail: string;
  if (total === 0) {
    summary = '최근 8주 동안 지원이 없어요';
    detail = '지원을 기록하면 주마다 몇 곳에 지원했는지 보여드려요';
  } else if (thisWeek.count > 0) {
    summary = (
      <>
        이번 주 <span className="text-text-brand tabular-nums">{thisWeek.count}곳</span> 지원했어요
      </>
    );
    const diff = thisWeek.count - lastWeek.count;
    detail = diff === 0 ? '지난주와 같아요' : `지난주보다 ${Math.abs(diff)}곳 ${diff > 0 ? '많아요' : '적어요'}`;
  } else {
    summary = (
      <>
        지난주 <span className="text-text-brand tabular-nums">{lastWeek.count}곳</span> 지원했어요
      </>
    );
    detail = '이번 주는 아직 지원이 없어요';
  }

  const bars = weeks.map((week) => ({
    key: week.weekStart,
    label: weekLabel(week),
    value: week.count,
    isHighlighted: total > 0 && week === focus,
  }));
  const chartLabel = `최근 8주 주간 지원 수: ${weeks.map((week) => `${week.isThisWeek ? '이번 주' : `${weekLabel(week)} 주`} ${week.count}곳`).join(', ')}`;

  return (
    <Card aria-labelledby="weekly-title" className="h-full motion-safe:animate-rise" style={style}>
      {/* ── 머리·요약 ── */}
      <CardHeader title="주간 지원" titleId="weekly-title" />
      <div className="flex flex-col gap-1">
        <CardSummary>{summary}</CardSummary>
        <p className="text-label text-text-secondary">{detail}</p>
      </div>
      {/* ── 최근 주별 막대 ── */}
      {/* 막대 높이는 고정(휴대폰 160·태블릿 이상 224px). 옆 카드(달력 날짜 목록 등)로 줄이 높아져도 막대는 그대로이고,
          남는 공간은 그래프(아래 합계 줄 포함) 위아래 여백으로 나눈다(#320, 사용자 결정. 예전에는 막대가 남는 높이를 채웠다 #293) */}
      <div className="my-auto flex flex-col gap-3">
        <BarChart label={chartLabel} bars={bars} heightClass="h-40 md:h-56" />
        <p className="text-label text-text-secondary tabular-nums">
          8주 동안 {total}곳 · 주 평균 {average}곳
        </p>
      </div>
    </Card>
  );
}
