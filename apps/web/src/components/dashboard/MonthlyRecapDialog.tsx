'use client';

import { clsx } from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { Button, buttonClassName } from '@/components/ui/Button';
import { CalendarCell } from '@/components/ui/CalendarCell';
import { IconButton } from '@/components/ui/IconButton';
import { Dialog } from '@/components/ui/Overlay';
import { TextAreaField } from '@/components/ui/TextField';
import { type MonthlyNoteStatus, useMonthlyNote } from '@/hooks/useMonthlyNote';
import { MONTHLY_NOTE_MAX_LENGTH } from '@/lib/monthlyNotesApi';
import { drawRecapImage, type RecapColors } from '@/lib/recapImage';
import type { Application } from '@/types/application';
import { getMonthCalendar, shiftMonth } from '@/utils/applicationStats';
import { describeMonthlyRecap, getMonthlyRecap, getRecapMonths, type MonthEvent, type MonthlyRecap, summarizeMonthlyRecap } from '@/utils/monthlyRecap';

interface MonthlyRecapDialogProps {
  applications: Application[];
  today: string;
  onClose: () => void;
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
const RECENT_EVENTS = 5;
const EVENT_LABEL: Record<MonthEvent['kind'], string> = { offer: '합격', screening: '서류 통과', interview: '면접', diary: '기록', applied: '지원' };
const NOTE_HINT: Record<MonthlyNoteStatus, string> = {
  loading: '불러오는 중이에요',
  idle: '칸을 벗어나면 이 달에 저장돼요',
  saving: '저장하는 중이에요',
  saved: '저장했어요',
  error: '',
};

// 디자인 토큰 클래스를 잠깐 붙여 실제 색을 읽는다. 캔버스는 CSS 클래스를 못 쓰므로 값을 화면에서 가져온다.
function readColors(): RecapColors {
  const probe = (className: string, property: 'color' | 'backgroundColor') => {
    const element = document.createElement('span');
    element.className = className;
    document.body.appendChild(element);
    const value = getComputedStyle(element)[property];
    element.remove();
    return value;
  };
  return {
    page: probe('bg-page', 'backgroundColor'),
    surface: probe('bg-surface', 'backgroundColor'),
    subtle: probe('bg-subtle', 'backgroundColor'),
    primary: probe('text-text-primary', 'color'),
    secondary: probe('text-text-secondary', 'color'),
    brand: probe('text-text-brand', 'color'),
  };
}

// 공유 이미지(보조): 회사 이름 없이 숫자만 담는다(#275). 달을 넘기면 그 달로 다시 그린다.
function useRecapImage(recap: MonthlyRecap) {
  // 만든 이미지에 달을 함께 둔다. 달을 넘기면 다른 달 것이라 새로 그릴 때까지 없는 것으로 본다
  const [made, setMade] = useState<{ month: string; url: string; file: File } | null>(null);
  const fileName = `취준일기-${recap.month}.png`;
  useEffect(() => {
    let url: string | null = null;
    let isCurrent = true;
    drawRecapImage(recap, readColors(), getComputedStyle(document.body).fontFamily)
      .then((blob) => {
        if (!isCurrent) return;
        url = URL.createObjectURL(blob);
        setMade({ month: recap.month, url, file: new File([blob], fileName, { type: 'image/png' }) });
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [recap, fileName]);
  return { image: made?.month === recap.month ? made : null, fileName };
}

// 숫자 한 칸: 값(0이면 "아직"/"없음")과 지난 달 비교
function StatCell({ label, value, unit, previous, previousMonth, isCurrentMonth }: { label: string; value: number; unit: string; previous: number; previousMonth: number; isCurrentMonth: boolean }) {
  return (
    <div className="flex flex-col gap-1 bg-surface px-4 py-3">
      <dt className="text-label text-text-secondary">{label}</dt>
      <dd className="flex flex-col gap-1">
        {value > 0 ? (
          <span className="text-title-3 text-text-primary tabular-nums">
            {value}
            <span className="ml-px text-label font-normal text-text-secondary">{unit}</span>
          </span>
        ) : (
          <span className="text-body text-text-secondary">{isCurrentMonth ? '아직' : '없음'}</span>
        )}
        <span className="text-caption font-normal text-text-secondary tabular-nums">
          {previousMonth}월 {previous}
          {unit}
        </span>
      </dd>
    </div>
  );
}

// 소식 한 줄: 날짜 | 종류 + 회사(기록은 첫 줄)
function EventRow({ event }: { event: MonthEvent }) {
  const isNews = event.kind === 'screening' || event.kind === 'offer';
  const label = event.kind === 'applied' ? `${event.companies.length}곳 지원` : EVENT_LABEL[event.kind];
  return (
    <li className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 border-t border-line-divider py-3 first:border-t-0">
      <span className="text-label text-text-secondary tabular-nums">
        {Number(event.date.slice(5, 7))}.{Number(event.date.slice(8, 10))}
      </span>
      <p className="text-label break-keep text-text-primary">
        <span className={clsx('mr-2', isNews ? 'font-semibold text-text-brand-strong' : 'text-text-secondary')}>{label}</span>
        {event.kind === 'diary' ? (
          <>
            {event.text || '기록'}
            <span className="ml-2 text-text-secondary">{event.companies[0]}</span>
          </>
        ) : (
          <span className={clsx(event.kind === 'applied' && 'text-text-secondary')}>{event.companies.join(', ')}</span>
        )}
      </p>
    </li>
  );
}

// 이번 달 돌아보기 (#275, #316): 앱 안에서 한 달을 한눈에 본다. 달을 넘겨 지난 달도 본다.
// 달력(홈 달력과 같은 칸, 생긴 일이 있던 날은 작은 점) | 숫자 4칸과 지난 달 비교 · 이번 달 소식 · 이번 달 한 줄.
// 차분하게: 회색 위에 파랑 하나(지원한 날·서류 통과·합격)만 쓴다. 공유 이미지는 아래 보조 버튼으로 남긴다.
export function MonthlyRecapDialog({ applications, today, onClose }: MonthlyRecapDialogProps) {
  const currentMonth = today.slice(0, 7);
  const months = useMemo(() => getRecapMonths(applications, today), [applications, today]);
  const [month, setMonth] = useState(currentMonth);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  // ── 이 달의 숫자·달력·소식, 지난 달 숫자 ──
  const recap = useMemo(() => getMonthlyRecap(applications, month), [applications, month]);
  const previous = useMemo(() => getMonthlyRecap(applications, shiftMonth(month, -1)), [applications, month]);
  const calendar = useMemo(() => getMonthCalendar(applications, today, month), [applications, today, month]);
  const isCurrentMonth = month === currentMonth;
  const year = Number(month.slice(0, 4));
  const monthLabel = year === Number(currentMonth.slice(0, 4)) ? `${recap.monthNumber}월` : `${year}년 ${recap.monthNumber}월`;
  const note = useMonthlyNote(month);
  const { image, fileName } = useRecapImage(recap);

  const moveMonth = (target: string) => {
    setMonth(target);
    setSelectedDay(null);
    setShowAll(false);
  };
  const monthIndex = months.indexOf(month);

  // ── 소식: 고른 날짜면 그날 것, 아니면 최근 5개(모두 보기로 펼침) ──
  const dayEvents = selectedDay === null ? recap.events : recap.events.filter((event) => Number(event.date.slice(8, 10)) === selectedDay);
  const visibleEvents = selectedDay === null && !showAll ? dayEvents.slice(0, RECENT_EVENTS) : dayEvents;
  const newsByDay = new Map<number, string>();
  for (const event of recap.events) {
    if (event.kind === 'applied' || event.kind === 'diary') continue;
    const day = Number(event.date.slice(8, 10));
    newsByDay.set(day, [newsByDay.get(day), EVENT_LABEL[event.kind]].filter(Boolean).join(', '));
  }

  // ── 공유: 파일 공유를 지원하는 브라우저(주로 휴대폰)만 ──
  const canShare = Boolean(image && typeof navigator.canShare === 'function' && navigator.canShare({ files: [image.file] }));
  const share = async () => {
    if (!image) return;
    try {
      await navigator.share({ files: [image.file], title: `${monthLabel} 돌아보기`, text: describeMonthlyRecap(recap) });
    } catch {
      // 공유 창을 닫은 경우도 여기로 온다. 알릴 것이 없다.
    }
  };

  return (
    <Dialog
      isOpen
      onClose={onClose}
      size="lg"
      initialFocus="container"
      title={`${monthLabel} 돌아보기`}
      description={summarizeMonthlyRecap(recap, isCurrentMonth)}
      headerAction={
        // 주간 보드의 주 이동과 같은 모양(#293)
        <div role="group" aria-label="달 이동" className="flex items-center gap-1 rounded-md border border-line-divider bg-surface p-1 shadow-sm">
          <IconButton label={`${Number(shiftMonth(month, -1).slice(5))}월 보기`} icon="chevron-left" size="sm" disabled={monthIndex <= 0} onClick={() => moveMonth(shiftMonth(month, -1))} />
          <button
            type="button"
            onClick={() => moveMonth(currentMonth)}
            aria-disabled={isCurrentMonth || undefined}
            className={clsx(
              'h-9 rounded-sm px-3 text-label font-semibold transition-colors duration-fast focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
              isCurrentMonth ? 'cursor-default bg-subtle text-text-primary' : 'cursor-pointer text-text-secondary hover:bg-subtle hover:text-text-primary',
            )}
          >
            이번 달
          </button>
          <IconButton label="다음 달 보기" icon="chevron-right" size="sm" disabled={isCurrentMonth} onClick={() => moveMonth(shiftMonth(month, 1))} />
        </div>
      }
      footer={
        <>
          {canShare && (
            <Button variant="secondary" size="sm" onClick={() => void share()}>
              공유하기
            </Button>
          )}
          {image ? (
            <a href={image.url} download={fileName} className={buttonClassName({ variant: 'secondary', size: 'sm' })}>
              이미지로 저장
            </a>
          ) : (
            <Button variant="secondary" size="sm" isLoading loadingLabel="이미지 만드는 중">
              이미지로 저장
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── 달력: 홈 달력과 같은 칸. 지원한 날·가장 많이 지원한 날·오늘, 생긴 일이 있던 날은 작은 점 ── */}
        <section aria-label={`${monthLabel} 달력`} className="flex flex-col gap-3">
          <div role="group" aria-label={`${monthLabel} 날짜별 지원과 소식`} className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} aria-hidden="true" className="pb-1 text-center text-caption font-normal text-text-secondary">
                {weekday}
              </span>
            ))}
            {calendar.weeks.flatMap((week, weekIndex) =>
              week.map((day, dayIndex) => {
                if (!day) return <span key={`${weekIndex}-${dayIndex}`} aria-hidden="true" />;
                const news = newsByDay.get(day.day);
                const hasSomething = day.count > 0 || Boolean(news);
                const isSelected = selectedDay === day.day;
                return (
                  <CalendarCell
                    key={day.date}
                    day={day.day}
                    fullLabel={`${recap.monthNumber}월 ${day.day}일 ${WEEKDAYS[dayIndex]}요일`}
                    count={day.count}
                    isTop={day.date === calendar.topDate}
                    isToday={day.isToday}
                    news={news}
                    onSelect={hasSomething ? () => setSelectedDay(isSelected ? null : day.day) : undefined}
                    isSelected={isSelected}
                    controls="recap-events"
                  />
                );
              }),
            )}
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-caption font-normal text-text-secondary">
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="h-3 w-3 rounded-xs bg-selected" />
              지원한 날(숫자는 곳 수)
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-action-primary" />
              서류 통과, 면접, 합격
            </span>
          </p>
        </section>

        <div className="flex flex-col gap-5">
          {/* ── 숫자 4칸 + 지난 달 비교 ── */}
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line-divider bg-line-divider sm:grid-cols-4">
            <StatCell label="지원" value={recap.appliedCount} unit="곳" previous={previous.appliedCount} previousMonth={previous.monthNumber} isCurrentMonth={isCurrentMonth} />
            <StatCell label="서류 통과" value={recap.passedCount} unit="곳" previous={previous.passedCount} previousMonth={previous.monthNumber} isCurrentMonth={isCurrentMonth} />
            <StatCell label="면접" value={recap.interviewCount} unit="번" previous={previous.interviewCount} previousMonth={previous.monthNumber} isCurrentMonth={isCurrentMonth} />
            <StatCell label="남긴 기록" value={recap.diaryCount} unit="개" previous={previous.diaryCount} previousMonth={previous.monthNumber} isCurrentMonth={isCurrentMonth} />
          </dl>

          {/* ── 소식: 최근 5개 또는 고른 날짜 ── */}
          <section id="recap-events" aria-labelledby="recap-events-title" className="flex flex-col">
            <div className="flex items-baseline justify-between gap-2">
              <h3 id="recap-events-title" className="text-label font-semibold text-text-primary">
                {selectedDay === null ? `${monthLabel} 소식` : `${recap.monthNumber}월 ${selectedDay}일 소식`}
              </h3>
              {selectedDay !== null ? (
                <Button variant="text" size="sm" onClick={() => setSelectedDay(null)}>
                  전체 보기
                </Button>
              ) : (
                dayEvents.length > RECENT_EVENTS && (
                  <Button variant="text" size="sm" aria-expanded={showAll} onClick={() => setShowAll((value) => !value)}>
                    {showAll ? '접기' : `모두 보기 ${dayEvents.length}`}
                  </Button>
                )
              )}
            </div>
            {visibleEvents.length > 0 ? (
              <ul>
                {visibleEvents.map((event) => (
                  <EventRow key={`${event.date}-${event.kind}-${event.companies.join()}-${event.text ?? ''}`} event={event} />
                ))}
              </ul>
            ) : (
              <p className="py-3 text-label text-text-secondary">{isCurrentMonth ? '아직 이 달의 소식이 없어요.' : '이 달은 소식이 없어요.'}</p>
            )}
          </section>

          {/* ── 이번 달 한 줄: 달마다 하나, 칸을 벗어나면 저장 ── */}
          <TextAreaField
            id="recap-note"
            label={isCurrentMonth ? '이번 달 한 줄' : `${monthLabel} 한 줄`}
            value={note.note}
            onChange={(event) => note.change(event.target.value)}
            onBlur={note.commit}
            maxLength={MONTHLY_NOTE_MAX_LENGTH}
            rows={2}
            placeholder={`${monthLabel}을 한 줄로 남겨 보세요`}
            readOnly={note.status === 'loading'}
            hint={note.status === 'error' ? undefined : NOTE_HINT[note.status]}
            error={note.status === 'error' ? '저장하지 못했어요. 잠시 뒤 다시 적어 주세요.' : null}
          />
        </div>
      </div>
    </Dialog>
  );
}
