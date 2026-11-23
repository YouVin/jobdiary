import { clsx } from 'clsx';
import { Badge } from '@/components/ui/Badge';
import { STATUS_INFO } from '@/constants/status';
import type { Application } from '@/types/application';
import { getApplicationJourney, type JourneyItem } from '@/utils/applicationJourney';
import { formatDateWithWeekday } from '@/utils/format';

const KIND_LABEL: Record<JourneyItem['kind'], string> = {
  applied: '지원했어요',
  interview: '면접',
  deadline: '공고 마감',
  note: '기록',
};

// 점 색 (#205 디자인 시스템): 기록은 주요 파랑, 면접·마감은 일정 색, 지원은 지원 완료 단계 색
const DOT_CLASS: Record<JourneyItem['kind'], string> = {
  applied: 'bg-stage-applied',
  interview: 'bg-event-interview',
  deadline: 'bg-event-deadline',
  note: 'bg-action-primary',
};

// 지나온 기록. 단계 변경 이력은 저장하지 않으므로 날짜가 있는 일정과 내가 쓴 기록만 보여준다.
export function JourneyList({ application }: { application: Application }) {
  const items = getApplicationJourney(application);

  return (
    <section aria-labelledby="journey-title" className="flex flex-col gap-3">
      <h3 id="journey-title" className="text-label font-semibold text-text-secondary">
        지나온 기록
      </h3>
      <ol className="relative flex flex-col gap-4 border-l border-line-divider pl-4">
        {items.map((item) => (
          <li key={item.key} className="relative">
            <span className={clsx('absolute top-1 -left-5 h-2 w-2 rounded-full ring-4 ring-surface', DOT_CLASS[item.kind])} aria-hidden="true" />
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label text-text-secondary tabular-nums">
              {formatDateWithWeekday(item.date)}
              <span className="font-semibold text-text-primary">
                {KIND_LABEL[item.kind]}
                {item.entry?.status && ` · ${STATUS_INFO[item.entry.status].label} 때`}
              </span>
              {item.isUpcoming && <Badge tone="info">예정</Badge>}
            </p>
            {item.entry && <p className="mt-1 text-body break-words whitespace-pre-wrap text-text-primary">{item.entry.content}</p>}
          </li>
        ))}
      </ol>
      <p className="text-label text-text-secondary">단계가 바뀐 시점은 아직 저장되지 않아요. 남기고 싶은 일은 기록으로 적어 두세요.</p>
    </section>
  );
}
