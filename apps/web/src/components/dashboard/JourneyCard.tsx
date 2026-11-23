import { clsx } from 'clsx';
import Link from 'next/link';
import { RatioBar } from '@/components/charts/RatioBar';
import { Card, CardHeader, CardSummary } from '@/components/ui/Card';
import { CountUp } from '@/components/ui/CountUp';
import { textLinkClassName } from '@/components/ui/TextLink';
import type { StageSummary } from '@/utils/applicationStats';

interface JourneyCardProps {
  stage: StageSummary;
  style?: React.CSSProperties;
}

// 한 줄 요약은 가장 앞선 단계부터 숫자를 먼저 쓴다 ("2건이 면접 단계예요").
function journeySummary(applied: number, screening: number, interview: number, offer: number): string {
  if (offer > 0) return `${offer}건 합격했어요`;
  if (interview > 0) return `${interview}건이 면접 단계예요`;
  if (screening > 0) return `${screening}건이 서류를 통과했어요`;
  if (applied > 0) return `${applied}건 모두 서류 결과를 기다리고 있어요`;
  return '진행 중인 지원이 없어요';
}

// 전형 여정 (#203): 한 줄 요약 → 비율 막대 → 단계별 숫자 → 끝난 지원 줄.
// 단계 색은 stage 토큰(막대 조각과 숫자 앞 네모가 같은 색). 색만으로 구분하지 않게 이름을 함께 쓴다.
export function JourneyCard({ stage, style }: JourneyCardProps) {
  const { counts } = stage;
  const steps = [
    { key: 'applied', label: '지원 완료', value: counts.applied, colorClass: 'bg-stage-applied' },
    { key: 'screening', label: '서류 통과', value: counts.screening, colorClass: 'bg-stage-screening' },
    { key: 'interview', label: '면접', value: counts.interview + counts.interviewed, colorClass: 'bg-stage-interview' },
    { key: 'offer', label: '합격', value: counts.offer, colorClass: 'bg-stage-offer' },
  ];
  const [applied, screening, interview, offer] = steps.map((step) => step.value);
  const barLabel = `진행 중 ${stage.inProgress}건과 합격 ${offer}건: ${steps.map((step) => `${step.label} ${step.value}`).join(', ')}`;

  return (
    <Card aria-labelledby="journey-title" className="h-full motion-safe:animate-rise" style={style}>
      <CardHeader title="전형 여정" titleId="journey-title" meta={`진행 중 ${stage.inProgress}건`} />
      <CardSummary>{journeySummary(applied, screening, interview, offer)}</CardSummary>
      <RatioBar label={barLabel} segments={steps.map(({ key, value, colorClass }) => ({ key, value, colorClass }))} />
      <dl className="grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-4">
        {steps.map((step) => (
          <div key={step.key} className="flex flex-col gap-1">
            <dt className="flex items-center gap-2 text-label text-text-secondary">
              <span aria-hidden="true" className={clsx('h-2 w-2 shrink-0 rounded-xs', step.colorClass)} />
              {step.label}
            </dt>
            <dd className={clsx('text-title-1 tabular-nums', step.value === 0 ? 'text-text-secondary' : 'text-text-primary')}>
              <CountUp value={step.value} />
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md bg-subtle px-4 py-3">
        <span className="text-label text-text-secondary tabular-nums">
          끝난 지원 {stage.closed}건{stage.autoRejected > 0 && ` · 마감 자동 탈락 ${stage.autoRejected}건 포함`}
        </span>
        <Link href="/board" className={textLinkClassName('brand', 'text-label whitespace-nowrap')}>
          지원 보드에서 보기
        </Link>
      </div>
    </Card>
  );
}
