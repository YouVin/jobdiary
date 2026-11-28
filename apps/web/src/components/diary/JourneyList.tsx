import { clsx } from 'clsx';
import { Badge, STAGE_DOT_CLASS } from '@/components/ui/Badge';
import { STATUS_INFO } from '@/constants/status';
import type { Application } from '@/types/application';
import { getApplicationJourney, type JourneyItem } from '@/utils/applicationJourney';
import { formatDateWithWeekday } from '@/utils/format';
import { isInterviewReview } from '@/utils/interviewReview';
import type { StatusStep } from '@/utils/statusHistory';

const KIND_LABEL: Record<JourneyItem['kind'], string> = {
  applied: '지원했어요',
  interview: '면접',
  deadline: '공고 마감',
  status: '단계 변경',
  note: '기록',
};

// 단계 변경을 누가 했는지. 직접 옮긴 것은 따로 쓰지 않는다
function stepDetail(step: StatusStep): string | null {
  if (step.source === 'deadline') return '마감일이 지나 자동으로';
  if (step.isFirst) return '처음 저장할 때';
  if (step.source === 'extension') return '사이트에서 가져옴';
  return null;
}

// 점 색 (#205 디자인 시스템): 기록은 주요 파랑, 면접·마감은 일정 색, 지원은 지원 완료 단계 색
const DOT_CLASS: Record<JourneyItem['kind'], string> = {
  applied: 'bg-stage-applied',
  interview: 'bg-event-interview',
  deadline: 'bg-event-deadline',
  status: 'bg-stage-applied',
  note: 'bg-action-primary',
};

// 지나온 기록. 일정·단계가 바뀐 날(#283)·내가 쓴 기록. 단계 변경 점은 그 단계 색이다.
// 이력은 2026-11-26부터 남으므로, 그 전에 단계가 바뀐 지원에는 아래에 한 줄 안내를 둔다.
export function JourneyList({ application }: { application: Application }) {
  const items = getApplicationJourney(application);
  const hasNoHistory = (application.statusHistory ?? []).length === 0 && application.status !== 'applied';

  return (
    <section aria-labelledby="journey-title" className="flex flex-col gap-3">
      <h3 id="journey-title" className="text-label font-semibold text-text-secondary">
        지나온 기록
      </h3>
      <ol className="relative flex flex-col gap-4 border-l border-line-divider pl-4">
        {items.map((item) => (
          <li key={item.key} className="relative">
            <span className={clsx('absolute top-1 -left-5 h-2 w-2 rounded-full ring-4 ring-surface', item.step ? STAGE_DOT_CLASS[item.step.status] : DOT_CLASS[item.kind])} aria-hidden="true" />
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label text-text-secondary tabular-nums">
              {formatDateWithWeekday(item.date)}
              <span className="font-semibold text-text-primary">
                {item.step ? STATUS_INFO[item.step.status].label : item.entry && isInterviewReview(item.entry) ? '면접 후기' : KIND_LABEL[item.kind]}
              </span>
              {item.entry?.status && <span>{STATUS_INFO[item.entry.status].label} 때</span>}
              {item.step && stepDetail(item.step) && <span>{stepDetail(item.step)}</span>}
              {item.isUpcoming && <Badge tone="info">예정</Badge>}
            </p>
            {item.entry && <p className="mt-1 text-body break-words whitespace-pre-wrap text-text-primary">{item.entry.content}</p>}
          </li>
        ))}
      </ol>
      {hasNoHistory && <p className="text-label text-text-secondary">11월 26일 전에 바뀐 단계는 날짜가 남아 있지 않아요. 앞으로 바뀌는 단계는 자동으로 남아요.</p>}
    </section>
  );
}
