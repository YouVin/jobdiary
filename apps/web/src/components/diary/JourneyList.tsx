import { clsx } from 'clsx';
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

// 점 색: 기록은 브랜드, 면접은 면접 상태색, 마감은 탈락 상태색, 지원은 회색
const DOT_CLASS: Record<JourneyItem['kind'], string> = {
  applied: 'bg-status-applied',
  interview: 'bg-event-interview',
  deadline: 'bg-event-deadline',
  note: 'bg-brand',
};

// 지나온 기록. 단계 변경 이력은 저장하지 않으므로 날짜가 있는 일정과 내가 쓴 기록만 보여준다.
export function JourneyList({ application }: { application: Application }) {
  const items = getApplicationJourney(application);

  return (
    <section aria-labelledby="journey-title">
      <h3 id="journey-title" className="mb-3 text-label font-semibold text-text-muted">지나온 기록</h3>
      <ol className="relative flex flex-col gap-4 border-l border-card-border pl-4">
        {items.map((item) => (
          <li key={item.key} className="relative">
            <span className={clsx('absolute top-1 -left-5 h-2 w-2 rounded-full ring-4 ring-card', DOT_CLASS[item.kind])} aria-hidden="true" />
            <p className="flex flex-wrap items-baseline gap-x-2 text-caption text-text-muted tabular-nums">
              {formatDateWithWeekday(item.date)}
              <span className="font-semibold text-text-secondary">
                {KIND_LABEL[item.kind]}
                {item.entry?.status && ` · ${STATUS_INFO[item.entry.status].label} 때`}
              </span>
              {item.isUpcoming && <span className="rounded-full bg-brand-tint px-2 text-badge text-brand-text">예정</span>}
            </p>
            {item.entry && (
              <p className="mt-1 text-small break-words whitespace-pre-wrap text-text-primary">{item.entry.content}</p>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-caption text-text-muted">단계가 바뀐 시점은 아직 저장되지 않아요. 남기고 싶은 일은 기록으로 적어 두세요.</p>
    </section>
  );
}
