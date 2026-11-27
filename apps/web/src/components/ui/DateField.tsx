'use client';

import { clsx } from 'clsx';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { TextField } from '@/components/ui/TextField';
import { getTodayInKorea } from '@/utils/applicationDeadline';
import { addDays, addMonths, endOfWeek, formatPickerDate, formatPickerMonth, getPickerWeeks, isDateOnly, startOfWeek } from '@/utils/datePicker';

interface DateFieldProps {
  id: string;
  label: string;
  value: string; // YYYY-MM-DD 또는 ''
  onValueChange: (value: string) => void;
  hint?: string;
  error?: string | null;
  required?: boolean;
  clearable?: boolean; // 비워 둘 수 있는 칸이면 달력에 "지우기"
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

// 날짜 칸 (#293). 브라우저 기본 달력은 모양을 바꿀 수 없어, 달력만 디자인 시스템으로 그린다.
// - 칸에 직접 치는 것은 브라우저 날짜 칸 그대로(키보드로 연·월·일). 휴대폰은 칸을 누르면 OS 선택기가 열린다.
// - 오른쪽 달력 버튼 → 칸 아래에 달력이 펼쳐진다. 창(Dialog) 안에서 잘리지 않고, 창의 포커스 가두기 안에 그대로 있다.
// - 달력 키보드: 화살표 하루·한 주, Home·End 주 처음·끝, PageUp·PageDown 한 달, Enter 고르기, Esc 닫기(창은 닫지 않음).
export function DateField({ id, label, value, onValueChange, hint, error, required, clearable = false }: DateFieldProps) {
  // ── 상태: 펼침, 지금 가리키는 날(키보드 위치), 버튼으로 포커스를 옮길지 ──
  const today = getTodayInKorea();
  const [isOpen, setIsOpen] = useState(false);
  const [focusDate, setFocusDate] = useState(today);
  const moveFocus = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const calendarId = useId();
  const toggleId = `${id}-calendar`;
  const month = focusDate.slice(0, 7);

  // 키보드로 옮겼거나 막 열었을 때만 가리키는 날로 포커스를 옮긴다(이전·다음 달 버튼을 누를 때는 그대로)
  useEffect(() => {
    if (!isOpen || !moveFocus.current) return;
    moveFocus.current = false;
    wrapperRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus();
  }, [isOpen, focusDate]);

  const open = () => {
    moveFocus.current = true;
    setFocusDate(isDateOnly(value) ? value : today);
    setIsOpen(true);
  };
  const close = (returnFocus: boolean) => {
    setIsOpen(false);
    if (returnFocus) document.getElementById(toggleId)?.focus();
  };
  const select = (date: string) => {
    onValueChange(date);
    close(true);
  };
  const moveTo = (date: string) => {
    moveFocus.current = true;
    setFocusDate(date);
  };

  // ── 달력 키보드 ──
  const handleDayKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focusDate, -1),
      ArrowRight: () => addDays(focusDate, 1),
      ArrowUp: () => addDays(focusDate, -7),
      ArrowDown: () => addDays(focusDate, 7),
      Home: () => startOfWeek(focusDate),
      End: () => endOfWeek(focusDate),
      PageUp: () => addMonths(focusDate, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focusDate, event.shiftKey ? 12 : 1),
    };
    if (event.key === 'Escape') {
      event.preventDefault(); // 창(useDialogFocus)은 이미 처리된 Esc를 건너뛴다
      close(true);
      return;
    }
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    moveTo(move());
  };

  return (
    <div
      ref={wrapperRef}
      className="flex flex-col gap-2"
      // 달력 밖으로 포커스가 나가면(Tab·다른 칸 클릭) 닫는다
      onBlur={(event) => {
        if (isOpen && !event.currentTarget.contains(event.relatedTarget as Node | null)) close(false);
      }}
    >
      <TextField
        id={id}
        label={label}
        type="date"
        data-date-field=""
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        hint={hint}
        error={error}
        aria-required={required || undefined}
        endAdornment={
          <IconButton
            id={toggleId}
            label={`${label.replace(/\s*\(필수\)$/, '')} 달력 ${isOpen ? '닫기' : '열기'}`}
            icon="calendar"
            aria-expanded={isOpen}
            aria-controls={isOpen ? calendarId : undefined}
            onClick={() => (isOpen ? close(true) : open())}
          />
        }
      />

      {/* ── 달력: 머리(이전 달 · 2026년 11월 · 다음 달) → 요일 → 날짜 → 오늘·지우기 ── */}
      {isOpen && (
        <div id={calendarId} role="group" aria-label={`${label.replace(/\s*\(필수\)$/, '')} 고르기`} className="flex flex-col gap-2 rounded-lg border border-line-divider bg-surface p-3 shadow-md">
          <div className="flex items-center justify-between">
            <IconButton label="이전 달" icon="chevron-left" size="sm" onClick={() => setFocusDate(addMonths(focusDate, -1))} />
            <p aria-live="polite" className="text-body font-semibold text-text-primary tabular-nums">
              {formatPickerMonth(month)}
            </p>
            <IconButton label="다음 달" icon="chevron-right" size="sm" onClick={() => setFocusDate(addMonths(focusDate, 1))} />
          </div>
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr>
                {WEEKDAYS.map((weekday) => (
                  <th key={weekday} scope="col" className="pb-1 text-caption font-normal text-text-secondary">
                    {weekday}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {getPickerWeeks(month).map((week) => (
                <tr key={week[0].date}>
                  {week.map((day) => {
                    // 이웃 달은 빈 칸. 흐린 글자 버튼은 대비가 낮고, 화살표로 넘어가면 그 달로 바뀐다
                    if (!day.inMonth) return <td key={day.date} />;
                    const isSelected = day.date === value;
                    const isToday = day.date === today;
                    return (
                      <td key={day.date} className="p-px">
                        <button
                          type="button"
                          data-date={day.date}
                          tabIndex={day.date === focusDate ? 0 : -1}
                          aria-label={formatPickerDate(day.date)}
                          aria-pressed={isSelected}
                          aria-current={isToday ? 'date' : undefined}
                          onClick={() => select(day.date)}
                          onKeyDown={handleDayKey}
                          className={clsx(
                            'h-10 w-full cursor-pointer rounded-sm text-body tabular-nums transition-colors duration-fast focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
                            isSelected
                              ? 'bg-action-primary font-semibold text-text-on-color hover:bg-action-hover'
                              : clsx('hover:bg-subtle', isToday ? 'bg-today-tint font-semibold text-today-text' : 'text-text-primary'),
                          )}
                        >
                          {day.day}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between gap-2">
            {clearable && value ? (
              <Button variant="text" size="sm" onClick={() => select('')}>
                지우기
              </Button>
            ) : (
              <span />
            )}
            <Button variant="text" size="sm" onClick={() => select(today)}>
              오늘
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
