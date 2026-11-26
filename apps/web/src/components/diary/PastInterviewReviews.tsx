'use client';

import { useMemo } from 'react';
import { useApplicationStore } from '@/store/applicationStore';
import type { Application, Status } from '@/types/application';
import { formatKoreanDateTime } from '@/utils/format';
import { getPastInterviewReviews } from '@/utils/interviewReview';

// 면접을 준비하는 단계에서만 보여 준다(서류 통과 → 면접 예정 → 면접 완료)
const SHOW_STATUSES: Status[] = ['screening', 'interview', 'interviewed'];

const SUMMARY_CLASS =
  'flex cursor-pointer list-none flex-col gap-1 rounded-md px-3 py-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring [&::-webkit-details-marker]:hidden';

// 같은 회사에 예전에 지원했을 때 남긴 면접 후기 (#276). 다시 지원한 회사의 면접을 준비할 때 지난 질문을 바로 본다.
// 후기가 없으면 구역을 그리지 않는다. 긴 글이라 첫 줄만 보이고 눌러서 펼친다.
export function PastInterviewReviews({ application }: { application: Application }) {
  const applications = useApplicationStore((state) => state.applications);
  const reviews = useMemo(() => getPastInterviewReviews(applications, application), [applications, application]);
  if (!SHOW_STATUSES.includes(application.status) || reviews.length === 0) return null;

  return (
    <section aria-labelledby="past-reviews-title" className="flex flex-col gap-2">
      {/* ── 머리: 제목·개수 ── */}
      <h3 id="past-reviews-title" className="text-label font-semibold text-text-secondary">
        이 회사 지난 면접 후기 <span className="tabular-nums">{reviews.length}</span>
      </h3>
      {/* ── 후기 목록(첫 줄 → 펼치면 전체) ── */}
      <ul className="flex flex-col gap-2">
        {reviews.map(({ entry, position }) => {
          const firstLine = entry.content.split('\n').find((line) => line.trim() && line.trim() !== '받은 질문')?.replace(/^-\s*/, '') ?? '';
          return (
            <li key={entry.id} className="rounded-md bg-subtle">
              <details className="group">
                <summary className={SUMMARY_CLASS}>
                  <span className="text-caption font-normal text-text-secondary tabular-nums">
                    {formatKoreanDateTime(entry.createdAt)}
                    {position && ` · ${position}`}
                  </span>
                  <span className="truncate text-label text-text-primary group-open:hidden">{firstLine}</span>
                </summary>
                <p className="px-3 pb-3 text-label break-words whitespace-pre-wrap text-text-primary">{entry.content}</p>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
