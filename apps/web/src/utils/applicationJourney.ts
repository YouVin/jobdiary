import type { Application, DiaryEntry, Status } from '@/types/application';
import { getTodayInKorea } from '@/utils/applicationDeadline';
import { toDateOnly } from '@/utils/applicationStats';

// 지원 상세 패널의 "지나온 기록"과 "기록 남기기" (#175).
// 단계 변경 이력은 저장하지 않으므로 지원일·면접일·공고 마감과 사용자가 쓴 기록만 보여준다.

export const DIARY_MAX_LENGTH = 2000;

// 기록 남기기 칸의 질문. 지금 단계에 맞는 한 가지를 묻는다.
export const DIARY_PROMPTS: Record<Status, string> = {
  applied: '이 회사에 지원한 이유는 무엇인가요?',
  screening: '서류가 통과됐어요. 다음 단계까지 준비할 것은?',
  interview: '면접 전에 준비할 것은 무엇인가요?',
  interviewed: '면접에서 받은 질문을 남겨 두세요.',
  offer: '합격까지 가장 도움이 된 것은?',
  rejected: '다음 지원에 남길 한 가지는?',
  canceled: '지원을 취소한 이유는 무엇인가요?',
};

export type JourneyKind = 'applied' | 'interview' | 'deadline' | 'note';

export interface JourneyItem {
  key: string;
  kind: JourneyKind;
  date: string; // YYYY-MM-DD (기록은 한국 날짜)
  isUpcoming: boolean; // 오늘 이후의 면접·마감
  entry?: DiaryEntry; // kind가 note일 때
}

// 시각(ISO)의 한국 날짜
function koreaDate(iso: string): string | null {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(time));
}

// 새로운 것이 위. 같은 날에는 기록이 일정보다 위, 기록끼리는 쓴 시각 순(최근 위).
export function getApplicationJourney(application: Application, today = getTodayInKorea()): JourneyItem[] {
  const items: Array<{ order: string; item: JourneyItem }> = [];
  const events: Array<[Exclude<JourneyKind, 'note'>, string | undefined]> = [
    ['applied', application.appliedAt],
    ['interview', application.interviewDate],
    ['deadline', application.deadlineAt],
  ];
  for (const [kind, value] of events) {
    const date = toDateOnly(value);
    if (!date) continue;
    items.push({ order: `${date}|0`, item: { key: kind, kind, date, isUpcoming: kind !== 'applied' && date > today } });
  }
  for (const entry of application.diary ?? []) {
    const date = koreaDate(entry.createdAt);
    if (!date || !entry.content.trim()) continue;
    items.push({ order: `${date}|1|${entry.createdAt}`, item: { key: `note-${entry.id}`, kind: 'note', date, isUpcoming: false, entry } });
  }
  items.sort((a, b) => b.order.localeCompare(a.order));
  return items.map(({ item }) => item);
}

// 새 기록 한 건. 저장은 기존 diary 배열 뒤에 붙여 updateApplication으로 보낸다.
export function createDiaryEntry(content: string, status: Status, now = new Date(), id = crypto.randomUUID()): DiaryEntry {
  return { id, content: content.trim().slice(0, DIARY_MAX_LENGTH), createdAt: now.toISOString(), status };
}
